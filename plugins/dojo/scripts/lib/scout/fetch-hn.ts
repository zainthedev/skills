// Hacker News via the Algolia API: story search per keyword, the comment trees of the top few
// stories, and later a per-resource lookup counting items from the last 24 months that carry
// the resource's URL (the independent signal).

import { GENERIC_RETRY, linkNeedles, withinMonths } from './context.ts';
import type { ScoutContext } from './context.ts';
import { parseHnItem, parseHnSearch } from './parse-hn.ts';
import type { HnStory } from './parse-hn.ts';
import type { ResourceDraft } from './resources.ts';
import { excerptAround } from './text.ts';
import { urlStem, youtubeId } from './urls.ts';

const STORIES_PER_KEYWORD = 3;
const MAX_ITEMS = 6;
const MAX_KEYWORDS = 4;
const MAX_LOOKUPS = 40;

export function hnSearchUrl(keyword: string): string {
  const params = new URLSearchParams({ query: keyword, tags: 'story', hitsPerPage: '30', restrictSearchableAttributes: 'title,story_text' });
  return `https://hn.algolia.com/api/v1/search?${params}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when every word of the keyword appears as a whole word in the story's title or text.
 * Algolia matches prefixes, so "learn express" also returns "Learn regular expressions".
 */
export function matchesKeyword(story: { title: string; text: string }, keyword: string): boolean {
  const hay = `${story.title}\n${story.text}`.toLowerCase();
  const words = keyword
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter(Boolean);
  return words.every((w) => {
    const variants = [...new Set([w, w.replace(/\.js$/, ''), w.replace(/\.js$/, 'js')])];
    return variants.some((v) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(v)}([^a-z0-9]|$)`).test(hay));
  });
}

export function hnItemUrl(id: string): string {
  return `https://hn.algolia.com/api/v1/items/${id}`;
}

export function hnLookupUrl(stem: string, sinceEpochSeconds: number): string {
  const params = new URLSearchParams({
    query: `"${stem}"`,
    hitsPerPage: '50',
    numericFilters: `created_at_i>${sinceEpochSeconds}`,
    restrictSearchableAttributes: 'url,comment_text,story_text',
  });
  return `https://hn.algolia.com/api/v1/search?${params}`;
}

function recordStory(ctx: ScoutContext, story: HnStory): void {
  const recent = withinMonths(story.date, ctx.nowMs, 24);
  const mention = { source: 'hn-story' as const, thread_url: story.hnUrl, date: story.date, score: story.points, rank: null, excerpt: story.title };
  if (story.url) {
    const draft = ctx.index.add(story.url, mention, { key: `hn-story:${story.id}`, title: story.title, titlePriority: 3 });
    if (draft && recent) draft.hnItems24m.add(story.id);
  }
  for (const link of story.links) {
    const draft = ctx.index.add(link.url, { ...mention, excerpt: excerptAround(story.text, linkNeedles(link)) }, { key: `hn-story:${story.id}`, title: link.text, titlePriority: 1 });
    if (draft && recent) draft.hnItems24m.add(story.id);
  }
}

export async function scoutHn(ctx: ScoutContext, keywords: string[]): Promise<void> {
  const candidates = new Map<string, HnStory>();
  for (const keyword of keywords.slice(0, MAX_KEYWORDS)) {
    const { res, json } = await ctx.http.json({ kind: 'hn', url: hnSearchUrl(keyword), limiter: ctx.limiters.hn, retry: GENERIC_RETRY, deadline: ctx.discoveryDeadline });
    if (res.skipped) return;
    if (!res.ok || !json) continue;
    const search = parseHnSearch(json);
    const stories = search.stories.filter((s) => matchesKeyword(s, keyword));
    ctx.log(`[scout] hn "${keyword}": ${search.nbHits} stories match, ${stories.length} of ${search.stories.length} read carry every keyword word`);
    for (const story of stories) recordStory(ctx, story);
    const top = stories
      .filter((s) => (s.num_comments ?? 0) >= 3)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .slice(0, STORIES_PER_KEYWORD);
    for (const s of top) candidates.set(s.id, s);
  }

  const chosen = [...candidates.values()].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, MAX_ITEMS);
  for (const story of chosen) {
    const { res, json } = await ctx.http.json({ kind: 'hn', url: hnItemUrl(story.id), limiter: ctx.limiters.hn, retry: GENERIC_RETRY, deadline: ctx.discoveryDeadline });
    if (res.skipped) return;
    if (!res.ok || !json) continue;
    const item = parseHnItem(json);
    if (!item) continue;
    ctx.threads.set(`hn:${story.id}`, {
      source: 'hn',
      id: story.id,
      title: item.story.title || story.title,
      url: item.story.hnUrl,
      date: item.story.date ?? story.date,
      score: item.story.points ?? story.points,
      num_comments: item.story.num_comments ?? story.num_comments,
      subreddit: null,
    });
    let links = 0;
    for (const c of item.comments) {
      for (const link of c.links) {
        const draft = ctx.index.add(
          link.url,
          { source: 'hn-comment', thread_url: item.story.hnUrl, date: c.date, score: null, rank: c.rank, excerpt: excerptAround(c.text, linkNeedles(link)) },
          { key: `hn-comment:${c.id}`, title: link.text, titlePriority: 1 },
        );
        if (!draft) continue;
        links++;
        if (withinMonths(c.date, ctx.nowMs, 24)) draft.hnItems24m.add(c.id);
      }
    }
    ctx.log(`[scout] hn item ${story.id} "${item.story.title.slice(0, 60)}": ${item.comments.length} comments, ${links} resource links`);
  }
}

/** Counts HN items of the last 24 months that carry each resource's URL, for the best candidates. */
export async function hnLookups(ctx: ScoutContext, drafts: ResourceDraft[]): Promise<void> {
  const since = Math.floor(ctx.nowMs / 1000) - 730 * 86400;
  let done = 0;
  for (const draft of drafts.slice(0, MAX_LOOKUPS)) {
    const id = youtubeId(draft.url);
    const stem = id ?? urlStem(draft.url);
    const { res, json } = await ctx.http.json({ kind: 'hn', url: hnLookupUrl(stem, since), limiter: ctx.limiters.hn, retry: GENERIC_RETRY, deadline: ctx.finalDeadline });
    if (res.skipped) break;
    if (!res.ok || !json) continue;
    done++;
    const needle = stem.toLowerCase();
    for (const hit of parseHnSearch(json).hits) {
      const hay = `${hit.url ?? ''}\n${hit.text}`.toLowerCase().replace(/https?:\/\/(www\.)?/g, '');
      if (hay.includes(needle)) draft.hnItems24m.add(hit.id);
    }
  }
  ctx.log(`[scout] hn lookups: ${done} of ${Math.min(drafts.length, MAX_LOOKUPS)} resources checked for mentions in the last 24 months`);
}
