// Subreddit wikis via Wayback Machine captures of old.reddit.com wiki pages: the index first,
// then the faq or resources style pages it links to. Every link found is a reddit-wiki mention
// and a curated inclusion.

import { GENERIC_RETRY } from './context.ts';
import type { ScoutContext } from './context.ts';
import { parseWikiPage } from './parse-wiki.ts';
import type { WikiPage } from './parse-wiki.ts';
import { collapseWhitespace } from './text.ts';

/** Wiki pages worth a second request when the index links to them, in priority order. */
const EXTRA_PAGES = ['faq', 'resources', 'books', 'learning', 'learn', 'tutorials', 'online', 'courses', 'getting_started', 'beginners', 'recommended', 'links'];
const MAX_EXTRA_PAGES = 3;

/** The Wayback form the feasibility test found working: web/<stamp>id_/ serves the raw capture nearest the stamp. */
export function waybackUrl(subreddit: string, page: string, today: string): string {
  const stamp = today.replace(/-/g, '');
  return `https://web.archive.org/web/${stamp}id_/https://old.reddit.com/r/${subreddit}/wiki/${page}`;
}

/** The capture date from the resolved Wayback URL, or null. */
export function captureDate(finalUrl: string): string | null {
  const m = finalUrl.match(/\/web\/(\d{4})(\d{2})(\d{2})\d*[a-z_]*\//);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

interface FetchedPage {
  page: WikiPage;
  captureUrl: string;
  date: string | null;
}

async function fetchWikiPage(ctx: ScoutContext, subreddit: string, page: string): Promise<FetchedPage | null> {
  const res = await ctx.http.request({
    kind: 'reddit-wiki',
    url: waybackUrl(subreddit, page, ctx.today),
    limiter: ctx.limiters.wayback,
    retry: GENERIC_RETRY,
    deadline: ctx.discoveryDeadline,
    timeoutMs: 45_000,
    headers: { accept: 'text/html' },
  });
  if (res.skipped || !res.ok) return null;
  return { page: parseWikiPage(res.text, subreddit), captureUrl: res.url, date: captureDate(res.url) };
}

function recordWikiLinks(ctx: ScoutContext, subreddit: string, pageName: string, fetched: FetchedPage): number {
  let n = 0;
  for (const link of fetched.page.links) {
    const label = link.heading === 'sidebar' ? `r/${subreddit} sidebar` : `r/${subreddit} wiki/${pageName}`;
    const excerpt = collapseWhitespace(`${link.heading} > ${link.line}`).slice(0, 220);
    const draft = ctx.index.add(
      link.url,
      { source: 'reddit-wiki', thread_url: fetched.captureUrl, date: fetched.date, score: null, rank: null, excerpt },
      { key: `reddit-wiki:${fetched.captureUrl}`, title: link.text, titlePriority: 2 },
    );
    if (!draft) continue;
    draft.curated.add(label);
    n++;
  }
  return n;
}

export async function scoutWikis(ctx: ScoutContext, subreddits: string[]): Promise<void> {
  for (const subreddit of subreddits) {
    const index = await fetchWikiPage(ctx, subreddit, 'index');
    if (!index) {
      ctx.log(`[scout] r/${subreddit} wiki: no usable capture`);
      continue;
    }
    const n = recordWikiLinks(ctx, subreddit, 'index', index);
    ctx.log(`[scout] r/${subreddit} wiki/index (${index.date ?? 'undated'} capture): ${n} resource links, subpages ${index.page.subpages.join(', ') || 'none'}`);
    const extras = EXTRA_PAGES.filter((p) => index.page.subpages.includes(p)).slice(0, MAX_EXTRA_PAGES);
    for (const page of extras) {
      const fetched = await fetchWikiPage(ctx, subreddit, page);
      if (!fetched) continue;
      const m = recordWikiLinks(ctx, subreddit, page, fetched);
      ctx.log(`[scout] r/${subreddit} wiki/${page} (${fetched.date ?? 'undated'} capture): ${m} resource links`);
    }
  }
}
