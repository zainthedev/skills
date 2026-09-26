// The scout-owned parts of the rubric (skills/dojo/RUBRIC.md), on the rubric's scale:
// endorsement breadth 15, vote-weighted depth 15, curated inclusion 10, verified freshness 20,
// independent signal 10. Version currency, learner fit and authority are the model's.

import type { ResourceDraft } from './resources.ts';
import type { Freshness, Mention, MentionSource, Resource } from './types.ts';

export const MAX_OBJECTIVE = 70;

/** Sources where a mention is a reply by someone other than the asker. */
const REPLY_SOURCES: ReadonlySet<MentionSource> = new Set<MentionSource>(['reddit-comment', 'hn-comment', 'stackexchange']);

export function isReply(m: Mention): boolean {
  return REPLY_SOURCES.has(m.source);
}

/** Distinct threads with a reply mentioning the resource: three points each, full marks at five. */
export function scoreBreadth(mentions: Mention[]): number {
  const threads = new Set(mentions.filter(isReply).map((m) => m.thread_url));
  return Math.min(15, threads.size * 3);
}

/** 15 when a reply mentioning it is the top-ranked reply of its thread, 10 for top three, 5 for any reply. */
export function scoreDepth(mentions: Mention[]): number {
  const replies = mentions.filter(isReply);
  if (replies.length === 0) return 0;
  let best = Number.POSITIVE_INFINITY;
  for (const m of replies) if (m.rank !== null && m.rank < best) best = m.rank;
  if (best === 1) return 15;
  if (best <= 3) return 10;
  return 5;
}

export function scoreCurated(curated: string[]): number {
  return curated.length > 0 ? 10 : 0;
}

export function monthsBetween(fromIso: string, toMs: number): number | null {
  const from = new Date(fromIso).getTime();
  if (Number.isNaN(from)) return null;
  return (toMs - from) / (30.4375 * 24 * 3600 * 1000);
}

/** 20 within twelve months of a verified update, 14 within 24, 7 within 48, otherwise 0. Unknown is 0. */
export function scoreFreshness(freshness: Freshness, nowMs: number): number {
  if (freshness.method === 'none' || !freshness.last_modified) return 0;
  const months = monthsBetween(freshness.last_modified, nowMs);
  if (months === null) return 0;
  if (months <= 12) return 20;
  if (months <= 24) return 14;
  if (months <= 48) return 7;
  return 0;
}

/** Steps on the count of HN items in the last 24 months that carry the URL. */
export function scoreIndependent(hnMentions24m: number): number {
  if (hnMentions24m >= 10) return 10;
  if (hnMentions24m >= 6) return 8;
  if (hnMentions24m >= 3) return 6;
  if (hnMentions24m === 2) return 4;
  if (hnMentions24m === 1) return 2;
  return 0;
}

export function uncheckedFreshness(checked: string, note = 'not checked'): Freshness {
  return { checked, last_modified: null, method: 'none', note };
}

export function finaliseResource(draft: ResourceDraft, nowMs: number, checked: string): Resource {
  const curated = [...draft.curated].sort();
  const freshness = draft.freshness ?? uncheckedFreshness(checked);
  const hn = draft.hnItems24m.size;
  const breadth = scoreBreadth(draft.mentions);
  const depth = scoreDepth(draft.mentions);
  const curatedScore = scoreCurated(curated);
  const fresh = scoreFreshness(freshness, nowMs);
  const independent = scoreIndependent(hn);
  const resource: Resource = {
    url: draft.url,
    domain: draft.domain,
    title: draft.title,
    mentions: draft.mentions,
    breadth,
    depth,
    curated,
    freshness,
    hn_mentions_24m: hn,
    objective_score: breadth + depth + curatedScore + fresh + independent,
    max_objective: MAX_OBJECTIVE,
  };
  if (draft.stars !== undefined) resource.stars = draft.stars;
  if (draft.views !== undefined) resource.views = draft.views;
  return resource;
}

/** Objective score descending, then breadth, then mention count, then URL for a stable order. */
export function sortResources(resources: Resource[]): Resource[] {
  return [...resources].sort(
    (a, b) => b.objective_score - a.objective_score || b.breadth - a.breadth || b.mentions.length - a.mentions.length || a.url.localeCompare(b.url),
  );
}

/** True when fewer than five resources have two or more mentions. */
export function isThinEvidence(resources: Resource[]): boolean {
  return resources.filter((r) => r.mentions.length >= 2).length < 5;
}
