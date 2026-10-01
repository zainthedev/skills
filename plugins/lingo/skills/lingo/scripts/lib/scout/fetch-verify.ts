// Verification of the candidate resources after discovery: GitHub metadata (stars, pushed_at)
// for github.com resources, curated inclusion from large awesome lists that were themselves
// mentioned, publish dates and view counts for YouTube videos, and a HEAD request for the rest
// to read a Last-Modified header and catch dead or moved links.

import { GENERIC_RETRY } from './context.ts';
import type { ScoutContext } from './context.ts';
import { offerTitle } from './resources.ts';
import type { ResourceDraft } from './resources.ts';
import { isReply } from './score.ts';
import { decodeEntities, extractLinksFromHtml, extractLinksFromMarkdown, toDay } from './text.ts';
import type { Freshness } from './types.ts';
import { canonicalise, githubRepo, youtubeId } from './urls.ts';

const GITHUB_CAP_UNAUTHENTICATED = 20;
const GITHUB_CAP_AUTHENTICATED = 80;
const CURATED_LISTS_MAX = 3;
const CURATED_MIN_STARS = 10_000;
const YOUTUBE_CAP = 6;
const HEAD_CAP = 60;
/** A Last-Modified younger than this is a build or deploy timestamp, not evidence of an update. */
const BUILD_STAMP_DAYS = 7;

/** Resources worth a verification request: two or more mentions, any reply mention, or curated. */
export function verificationCandidates(drafts: ResourceDraft[]): ResourceDraft[] {
  const replies = (d: ResourceDraft): number => d.mentions.filter(isReply).length;
  return drafts
    .filter((d) => d.mentions.length >= 2 || replies(d) > 0 || d.curated.size > 0)
    .sort((a, b) => b.mentions.length - a.mentions.length || replies(b) - replies(a) || b.curated.size - a.curated.size || a.url.localeCompare(b.url));
}

function githubHeaders(ctx: ScoutContext, accept: string): Record<string, string> {
  const headers: Record<string, string> = { accept, 'x-github-api-version': '2022-11-28' };
  if (ctx.githubToken) headers.authorization = `Bearer ${ctx.githubToken}`;
  return headers;
}

export async function verifyGithub(ctx: ScoutContext, candidates: ResourceDraft[]): Promise<void> {
  const repos = new Map<string, ResourceDraft[]>();
  for (const d of candidates) {
    const repo = githubRepo(d.url);
    if (!repo) continue;
    const key = `${repo.owner}/${repo.repo}`;
    repos.set(key, [...(repos.get(key) ?? []), d]);
  }
  const cap = ctx.githubToken ? GITHUB_CAP_AUTHENTICATED : GITHUB_CAP_UNAUTHENTICATED;
  const curatedLists: { key: string; stars: number }[] = [];
  let checked = 0;
  for (const [key, drafts] of [...repos].slice(0, cap)) {
    const { res, json } = await ctx.http.json({ kind: 'github', url: `https://api.github.com/repos/${key}`, limiter: ctx.limiters.github, deadline: ctx.finalDeadline, headers: githubHeaders(ctx, 'application/vnd.github+json') });
    if (res.skipped) return;
    if ((res.status === 403 || res.status === 429) && res.headers['x-ratelimit-remaining'] === '0') {
      ctx.log('[scout] github: rate limit reached, set GITHUB_TOKEN for more');
      break;
    }
    checked++;
    if (res.status === 404) {
      for (const d of drafts) d.freshness = { checked: ctx.today, last_modified: null, method: 'none', status: 404, note: 'repository not found' };
      continue;
    }
    if (!res.ok || !json || typeof json !== 'object') continue;
    const repo = json as Record<string, unknown>;
    const stars = typeof repo.stargazers_count === 'number' ? repo.stargazers_count : null;
    const pushed = typeof repo.pushed_at === 'string' ? repo.pushed_at : null;
    const fullName = typeof repo.full_name === 'string' ? repo.full_name : key;
    const description = typeof repo.description === 'string' ? repo.description : '';
    for (const d of drafts) {
      const freshness: Freshness = { checked: ctx.today, last_modified: pushed, method: pushed ? 'github' : 'none', status: res.status };
      if (repo.archived === true) freshness.note = 'archived repository';
      d.freshness = freshness;
      if (stars !== null) d.stars = stars;
      offerTitle(d, description ? `${fullName}: ${description}` : fullName, 4);
    }
    if (stars !== null && stars >= CURATED_MIN_STARS && /awesome/i.test(fullName)) curatedLists.push({ key: fullName, stars });
  }
  ctx.log(`[scout] github: ${checked} repositories checked${repos.size > cap ? ` (${repos.size - cap} over the cap)` : ''}`);

  for (const list of curatedLists.slice(0, CURATED_LISTS_MAX)) {
    const res = await ctx.http.request({ kind: 'github', url: `https://api.github.com/repos/${list.key}/readme`, limiter: ctx.limiters.github, deadline: ctx.finalDeadline, headers: githubHeaders(ctx, 'application/vnd.github.raw+json') });
    if (res.skipped) return;
    if (!res.ok) continue;
    const links = [...extractLinksFromMarkdown(res.text), ...extractLinksFromHtml(res.text)];
    const listUrl = `https://github.com/${list.key.toLowerCase()}`;
    let n = 0;
    for (const link of links) {
      const draft = ctx.index.find(link.url);
      if (!draft || draft.url === listUrl) continue;
      draft.curated.add(`github:${list.key} (${list.stars} stars)`);
      n++;
    }
    ctx.log(`[scout] curated list ${list.key}: ${n} known resources listed`);
  }
}

const YOUTUBE_HEADERS = { cookie: 'CONSENT=YES+cb; SOCS=CAI', 'accept-language': 'en-US,en;q=0.8', accept: 'text/html' };

export function parseYoutubePage(html: string): { published: string | null; views: number | null; title: string | null; channel: string | null; unavailable: boolean } {
  const published = html.match(/"publishDate":"([^"]+)"/)?.[1] ?? html.match(/"uploadDate":"([^"]+)"/)?.[1] ?? null;
  const viewsRaw = html.match(/"viewCount":"(\d+)"/)?.[1];
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const channel = html.match(/"ownerChannelName":"([^"]*)"/)?.[1] ?? null;
  return {
    published: toDay(published),
    views: viewsRaw ? Number(viewsRaw) : null,
    title: title ? decodeEntities(title).replace(/\s*-\s*YouTube\s*$/, '').trim() || null : null,
    channel: channel ? decodeEntities(channel) : null,
    unavailable: /"playabilityStatus":\{"status":"ERROR"/.test(html),
  };
}

export async function verifyYoutube(ctx: ScoutContext, candidates: ResourceDraft[]): Promise<void> {
  const videos = candidates.filter((d) => youtubeId(d.url) !== null).slice(0, YOUTUBE_CAP);
  for (const d of videos) {
    const id = youtubeId(d.url);
    const res = await ctx.http.request({ kind: 'head', url: `https://www.youtube.com/watch?v=${id}&hl=en`, limiter: ctx.limiters.youtube, retry: GENERIC_RETRY, deadline: ctx.finalDeadline, timeoutMs: 30_000, headers: YOUTUBE_HEADERS });
    if (res.skipped) return;
    if (!res.ok) {
      d.freshness = { checked: ctx.today, last_modified: null, method: 'none', status: res.status, note: res.error ?? 'youtube page unavailable' };
      continue;
    }
    const page = parseYoutubePage(res.text);
    if (page.unavailable) {
      d.freshness = { checked: ctx.today, last_modified: null, method: 'none', status: res.status, note: 'video unavailable' };
      continue;
    }
    const notes = [page.published ? `published ${page.published}` : 'no publish date found', page.views !== null ? `${page.views} views` : null, page.channel].filter(Boolean);
    d.freshness = { checked: ctx.today, last_modified: page.published, method: page.published ? 'youtube' : 'none', status: res.status, note: notes.join('; ') };
    if (page.views !== null) d.views = page.views;
    offerTitle(d, page.title, 5);
  }
  if (videos.length > 0) ctx.log(`[scout] youtube: ${videos.length} videos checked`);
}

export async function verifyHead(ctx: ScoutContext, candidates: ResourceDraft[]): Promise<void> {
  const pages = candidates.filter((d) => githubRepo(d.url) === null && youtubeId(d.url) === null).slice(0, HEAD_CAP);
  let checked = 0;
  for (const d of pages) {
    let res = await ctx.http.request({ kind: 'head', url: d.url, method: 'HEAD', limiter: ctx.limiters.head, deadline: ctx.finalDeadline, timeoutMs: 15_000, headers: { accept: 'text/html,*/*' } });
    if (res.skipped) break;
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await ctx.http.request({ kind: 'head', url: d.url, method: 'GET', readBody: false, limiter: ctx.limiters.head, deadline: ctx.finalDeadline, timeoutMs: 15_000, headers: { accept: 'text/html,*/*' } });
      if (res.skipped) break;
    }
    checked++;
    const header = res.headers['last-modified'] ?? null;
    const day = toDay(header);
    const ageDays = header && day ? (ctx.nowMs - Date.parse(header)) / 86_400_000 : null;
    const finalUrl = res.url ? canonicalise(res.url)?.url : undefined;
    const freshness: Freshness = { checked: ctx.today, last_modified: day, method: 'none', status: res.status || null };
    if (finalUrl && finalUrl !== d.url) freshness.final_url = finalUrl;
    if (day && ageDays !== null && ageDays >= BUILD_STAMP_DAYS) {
      freshness.method = 'last-modified';
    } else if (day) {
      freshness.note = `last-modified within ${BUILD_STAMP_DAYS} days, treated as a build timestamp`;
    } else if (res.status === 404 || res.status === 410) {
      freshness.note = `dead link (${res.status})`;
    } else if (res.error) {
      freshness.note = res.error;
    } else {
      freshness.note = 'no last-modified header';
    }
    d.freshness = freshness;
  }
  ctx.log(`[scout] head: ${checked} pages checked${pages.length < candidates.length ? '' : ''}`);
}
