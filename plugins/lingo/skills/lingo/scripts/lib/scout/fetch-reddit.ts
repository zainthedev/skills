// The Reddit pipeline: search feeds per subreddit and keyword (top, all time; past year for the
// first keyword only, so the comment feeds get time within the budget),
// thread metadata and comments with scores from Arctic Shift, and the comments feed of the top
// threads. Only .rss feeds and the Arctic Shift JSON API are fetched, never reddit.com HTML.
// The reddit limiter is the slow lane (one request per 30 seconds), so the order matters: all-time
// searches, then Arctic Shift for a provisional top N while the past-year searches run, then the
// comments feeds in rank order until the discovery deadline.

import { ARCTIC_RETRY, REDDIT_RETRY, linkNeedles, withinMonths } from './context.ts';
import type { ScoutContext } from './context.ts';
import { parseArcticComments, parseArcticPosts } from './parse-arctic.ts';
import { parseCommentsFeed, parseSearchFeed } from './parse-reddit.ts';
import type { FeedThread } from './parse-reddit.ts';
import { excerptAround } from './text.ts';
import type { RedditComment, Thread } from './types.ts';

export type TimeRange = 'all' | 'year';

export interface RedditState {
  /** Every thread a search feed returned, by id. */
  threads: Map<string, Thread>;
  bodies: Map<string, FeedThread>;
  /** Feed positions (1-based) per thread id, one per feed it appeared in. */
  appearances: Map<string, number[]>;
  comments: Map<string, Map<string, RedditComment>>;
  enriched: Set<string>;
  arcticFetched: Set<string>;
  rssFetched: Set<string>;
  /** The ranked thread ids chosen for reading, best first. */
  selected: string[];
}

export function createRedditState(): RedditState {
  return {
    threads: new Map(),
    bodies: new Map(),
    appearances: new Map(),
    comments: new Map(),
    enriched: new Set(),
    arcticFetched: new Set(),
    rssFetched: new Set(),
    selected: [],
  };
}

export function searchFeedUrl(subreddit: string, keyword: string, range: TimeRange): string {
  return `https://www.reddit.com/r/${subreddit}/search.rss?q=${encodeURIComponent(keyword)}&restrict_sr=on&sort=top&t=${range}&limit=50`;
}

export function commentsFeedUrl(subreddit: string, threadId: string): string {
  return `https://www.reddit.com/r/${subreddit}/comments/${threadId}/.rss?limit=100&sort=top`;
}

export function arcticPostsUrl(ids: string[]): string {
  return `https://arctic-shift.photon-reddit.com/api/posts/ids?ids=${ids.join(',')}`;
}

export function arcticCommentsUrl(threadId: string): string {
  return `https://arctic-shift.photon-reddit.com/api/comments/search?link_id=${threadId}&limit=100&sort_type=score&sort=desc`;
}

const FEED_ACCEPT = 'application/atom+xml, application/rss+xml, application/xml, text/xml';

function registerThread(state: RedditState, ft: FeedThread, position: number): void {
  const id = ft.thread.id;
  const existing = state.threads.get(id);
  if (existing) {
    existing.date ??= ft.thread.date;
    existing.subreddit ??= ft.thread.subreddit;
  } else {
    state.threads.set(id, ft.thread);
  }
  if (!state.bodies.has(id)) state.bodies.set(id, ft);
  const positions = state.appearances.get(id) ?? [];
  positions.push(position);
  state.appearances.set(id, positions);
}

/** One search feed per subreddit and keyword for the range. Stops at the first budget skip. */
export async function searchPhase(ctx: ScoutContext, state: RedditState, subreddits: string[], keywords: string[], range: TimeRange): Promise<void> {
  for (const keyword of keywords) {
    for (const subreddit of subreddits) {
      const res = await ctx.http.request({
        kind: 'reddit-search',
        url: searchFeedUrl(subreddit, keyword, range),
        limiter: ctx.limiters.reddit,
        retry: REDDIT_RETRY,
        deadline: ctx.discoveryDeadline,
        timeoutMs: 40_000,
        headers: { accept: FEED_ACCEPT },
      });
      if (res.skipped) {
        ctx.log(`[scout] reddit search t=${range}: budget exhausted, remaining feeds skipped`);
        return;
      }
      if (!res.ok) continue;
      const threads = parseSearchFeed(res.text, subreddit);
      threads.forEach((ft, i) => registerThread(state, ft, i + 1));
      ctx.log(`[scout] r/${subreddit} search "${keyword}" t=${range}: ${threads.length} threads`);
    }
  }
}

/** Titles that ask for resources: where the recommendations live. */
const REQUEST_RE = /\b(best|good|great|recommend\w*|resources?|tutorials?|courses?|books?|guides?|roadmap|where (do|to|can|should)|how (do|to|should|can) i|what.{0,30}\b(learn|start|read|use)|learn(ing)? (path|material|source)|getting started|start(ing|ed)? (with|learning|out))\b/i;
/** Titles that announce, show off or rant: the most comments and the least information. */
const LAUNCH_RE = /\b(i (built|made|wrote|created|released|launched|open.?sourced)|show ?off|introducing|announc\w*|release[ds]?|v\d+(\.\d+)*\b|my (new|first|latest)|open.?source[d]?|is .{0,40}(dead|outdated|worth it|overrated|bad)|rant|unpopular opinion|why (i|we) (left|stopped|moved))\b/i;

/**
 * Thread ids best first. Resource-request titles weigh most, then feed position and recency;
 * launch and rant titles are pushed down and comment counts are capped, because the threads
 * with the most comments carry the least information (see RUBRIC.md, pitfalls).
 */
export function rankThreads(state: RedditState, nowMs: number): string[] {
  const scored: { id: string; score: number; date: string }[] = [];
  for (const [id, positions] of state.appearances) {
    const thread = state.threads.get(id);
    if (!thread) continue;
    if (thread.num_comments === 0) continue;
    let score = 0;
    for (const p of positions) score += 0.5 / p;
    if (withinMonths(thread.date, nowMs, 24)) score += 0.6;
    else if (withinMonths(thread.date, nowMs, 48)) score += 0.3;
    if (REQUEST_RE.test(thread.title)) score += 1.5;
    else if (thread.title.includes('?')) score += 0.3;
    if (LAUNCH_RE.test(thread.title)) score -= 1;
    if (thread.num_comments !== null) score += Math.min(0.5, Math.log10(thread.num_comments + 1) * 0.25);
    scored.push({ id, score, date: thread.date ?? '' });
  }
  scored.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return scored.map((s) => s.id);
}

/** Scores, comment counts and dates for discovered threads, fifty ids per Arctic Shift request. */
export async function enrichThreads(ctx: ScoutContext, state: RedditState, ids: string[]): Promise<void> {
  const pending = ids.filter((id) => !state.enriched.has(id));
  for (let i = 0; i < pending.length; i += 50) {
    const chunk = pending.slice(i, i + 50);
    chunk.forEach((id) => state.enriched.add(id));
    const { res, json } = await ctx.http.json({
      kind: 'arctic-shift',
      url: arcticPostsUrl(chunk),
      limiter: ctx.limiters.arctic,
      retry: ARCTIC_RETRY,
      deadline: ctx.discoveryDeadline,
      timeoutMs: 40_000,
    });
    if (res.skipped) return;
    if (!res.ok || !json) continue;
    for (const post of parseArcticPosts(json)) {
      const thread = state.threads.get(post.id);
      if (!thread) continue;
      thread.score = post.score;
      thread.num_comments = post.num_comments;
      thread.date ??= post.date;
      thread.subreddit ??= post.subreddit;
      if (!thread.title && post.title) thread.title = post.title;
    }
  }
}

export function mergeComment(state: RedditState, comment: RedditComment): void {
  const byId = state.comments.get(comment.threadId) ?? new Map<string, RedditComment>();
  state.comments.set(comment.threadId, byId);
  const existing = byId.get(comment.id);
  if (!existing) {
    byId.set(comment.id, { ...comment, links: [...comment.links] });
    return;
  }
  existing.score ??= comment.score;
  existing.feedRank ??= comment.feedRank;
  existing.date ??= comment.date;
  existing.author ??= comment.author;
  existing.isSubmitter = existing.isSubmitter || comment.isSubmitter;
  if (!existing.text && comment.text) existing.text = comment.text;
  for (const link of comment.links) {
    if (!existing.links.some((l) => l.url === link.url)) existing.links.push(link);
  }
}

/** Comments with scores from Arctic Shift for the given threads, in order. */
export async function arcticPhase(ctx: ScoutContext, state: RedditState, ids: string[]): Promise<void> {
  for (const id of ids) {
    if (state.arcticFetched.has(id)) continue;
    state.arcticFetched.add(id);
    const { res, json } = await ctx.http.json({
      kind: 'arctic-shift',
      url: arcticCommentsUrl(id),
      limiter: ctx.limiters.arctic,
      retry: ARCTIC_RETRY,
      deadline: ctx.discoveryDeadline,
      timeoutMs: 40_000,
    });
    if (res.skipped) return;
    if (!res.ok || !json) continue;
    const comments = parseArcticComments(json);
    for (const c of comments) mergeComment(state, c);
    ctx.log(`[scout] arctic shift ${id}: ${comments.length} comments with scores`);
  }
}

/** The comments feed of each thread, in order, on the reddit limiter. */
export async function commentsPhase(ctx: ScoutContext, state: RedditState, ids: string[]): Promise<void> {
  for (const id of ids) {
    if (state.rssFetched.has(id)) continue;
    const thread = state.threads.get(id);
    if (!thread?.subreddit) continue;
    state.rssFetched.add(id);
    const res = await ctx.http.request({
      kind: 'reddit-comments',
      url: commentsFeedUrl(thread.subreddit, id),
      limiter: ctx.limiters.reddit,
      retry: REDDIT_RETRY,
      deadline: ctx.discoveryDeadline,
      timeoutMs: 40_000,
      headers: { accept: FEED_ACCEPT },
    });
    if (res.skipped) {
      ctx.log('[scout] reddit comments feeds: budget exhausted, remaining threads rely on Arctic Shift');
      return;
    }
    if (!res.ok) continue;
    const feed = parseCommentsFeed(res.text, thread.subreddit);
    for (const c of feed.comments) mergeComment(state, c);
    ctx.log(`[scout] r/${thread.subreddit} thread ${id} feed: ${feed.comments.length} comments`);
  }
}

/** Ranks per comment: by score when any score is known, else by feed position. */
export function commentRanks(comments: RedditComment[]): Map<string, number | null> {
  const ranks = new Map<string, number | null>();
  const list = [...comments];
  if (list.some((c) => c.score !== null)) {
    list.sort((a, b) => (b.score ?? Number.NEGATIVE_INFINITY) - (a.score ?? Number.NEGATIVE_INFINITY) || (a.feedRank ?? 1e9) - (b.feedRank ?? 1e9) || a.id.localeCompare(b.id));
    list.forEach((c, i) => ranks.set(c.id, i + 1));
  } else {
    for (const c of list) ranks.set(c.id, c.feedRank);
  }
  return ranks;
}

/** Turns the selected threads' bodies and replies into mentions. Submitter replies are not endorsements. */
export function emitRedditMentions(ctx: ScoutContext, state: RedditState): void {
  for (const id of state.selected) {
    const thread = state.threads.get(id);
    if (!thread) continue;
    ctx.threads.set(`reddit:${id}`, thread);
    const body = state.bodies.get(id);
    if (body) {
      for (const link of body.links) {
        ctx.index.add(
          link.url,
          { source: 'reddit-thread', thread_url: thread.url, date: thread.date, score: thread.score, rank: null, excerpt: excerptAround(body.text, linkNeedles(link)), author: null },
          { key: `reddit-thread:${id}`, title: link.text, titlePriority: 1 },
        );
      }
    }
    const comments = [...(state.comments.get(id)?.values() ?? [])];
    const ranks = commentRanks(comments);
    for (const c of comments) {
      if (c.isSubmitter || c.links.length === 0) continue;
      for (const link of c.links) {
        ctx.index.add(
          link.url,
          { source: 'reddit-comment', thread_url: thread.url, date: c.date, score: c.score, rank: ranks.get(c.id) ?? null, excerpt: excerptAround(c.text, linkNeedles(link)), author: c.author },
          { key: `reddit-comment:${c.id}`, title: link.text, titlePriority: 1 },
        );
      }
    }
  }
}

export interface RedditPlan {
  subreddits: string[];
  keywords: string[];
  maxThreads: number;
}

/** Runs the whole Reddit side. Every phase stops cleanly at the discovery deadline. */
export async function runRedditPipeline(ctx: ScoutContext, plan: RedditPlan): Promise<RedditState> {
  const state = createRedditState();
  const yearKeywords = plan.keywords.slice(0, 1);
  const searchFeeds = plan.subreddits.length * (plan.keywords.length + yearKeywords.length);
  const estimate = Math.round(((searchFeeds + plan.maxThreads) * ctx.limiters.reddit.minIntervalMs) / 1000);
  ctx.log(`[scout] reddit plan: ${searchFeeds} search feeds and up to ${plan.maxThreads} comment feeds at one per ${ctx.limiters.reddit.minIntervalMs / 1000}s, about ${estimate}s if nothing is skipped`);

  await searchPhase(ctx, state, plan.subreddits, plan.keywords, 'all');
  await enrichThreads(ctx, state, [...state.threads.keys()]);
  const provisional = rankThreads(state, ctx.nowMs).slice(0, plan.maxThreads);
  const earlyArctic = arcticPhase(ctx, state, provisional);

  await searchPhase(ctx, state, plan.subreddits, yearKeywords, 'year');
  await earlyArctic;
  await enrichThreads(ctx, state, [...state.threads.keys()]);
  state.selected = rankThreads(state, ctx.nowMs).slice(0, plan.maxThreads);
  await arcticPhase(ctx, state, state.selected);
  await commentsPhase(ctx, state, state.selected);

  emitRedditMentions(ctx, state);
  const read = state.selected.filter((id) => (state.comments.get(id)?.size ?? 0) > 0).length;
  ctx.log(`[scout] reddit: ${state.threads.size} threads found, ${state.selected.length} selected, ${read} with replies read`);
  return state;
}
