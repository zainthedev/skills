// Parser for the Arctic Shift API (the Pushshift successor): comments and posts with scores.
// Bodies are Reddit Markdown, not HTML.

import { extractLinksFromMarkdown, markdownToText, toDay } from './text.ts';
import type { RedditComment } from './types.ts';

interface ArcticEnvelope {
  data?: unknown;
  error?: unknown;
}

/** The error string of an Arctic Shift response, or null when it carries data. */
export function arcticError(json: unknown): string | null {
  if (!json || typeof json !== 'object') return 'not an object';
  const env = json as ArcticEnvelope;
  if (typeof env.error === 'string' && env.error) return env.error;
  if (!Array.isArray(env.data)) return 'no data array';
  return null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function parseArcticComments(json: unknown): RedditComment[] {
  if (arcticError(json)) return [];
  const rows = (json as ArcticEnvelope).data as Record<string, unknown>[];
  const out: RedditComment[] = [];
  for (const row of rows) {
    const id = str(row.id);
    if (!id) continue;
    const body = str(row.body) ?? '';
    const permalink = str(row.permalink) ?? '';
    out.push({
      id,
      threadId: (str(row.link_id) ?? '').replace(/^t3_/, ''),
      author: str(row.author),
      date: toDay(num(row.created_utc)),
      score: num(row.score),
      isSubmitter: row.is_submitter === true,
      text: markdownToText(body),
      links: extractLinksFromMarkdown(body),
      permalink: permalink.startsWith('/') ? `https://www.reddit.com${permalink}` : permalink,
      feedRank: null,
    });
  }
  return out;
}

export interface ArcticPost {
  id: string;
  title: string;
  url: string;
  subreddit: string | null;
  score: number | null;
  num_comments: number | null;
  date: string | null;
}

export function parseArcticPosts(json: unknown): ArcticPost[] {
  if (arcticError(json)) return [];
  const rows = (json as ArcticEnvelope).data as Record<string, unknown>[];
  const out: ArcticPost[] = [];
  for (const row of rows) {
    const id = str(row.id);
    if (!id) continue;
    const permalink = str(row.permalink) ?? '';
    out.push({
      id,
      title: str(row.title) ?? '',
      url: permalink.startsWith('/') ? `https://www.reddit.com${permalink}` : permalink,
      subreddit: str(row.subreddit),
      score: num(row.score),
      num_comments: num(row.num_comments),
      date: toDay(num(row.created_utc)),
    });
  }
  return out;
}
