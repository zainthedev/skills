// Parser for the dev.to articles API. Each article is itself a candidate resource; the list
// endpoint carries reactions and dates but not bodies.

import { collapseWhitespace, toDay } from './text.ts';

export interface DevtoArticle {
  id: number;
  title: string;
  url: string;
  date: string | null;
  reactions: number;
  comments: number;
  tags: string[];
  description: string;
  author: string | null;
}

export function parseDevtoArticles(json: unknown): DevtoArticle[] {
  if (!Array.isArray(json)) return [];
  const out: DevtoArticle[] = [];
  for (const row of json as Record<string, unknown>[]) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'number') continue;
    const url = typeof row.canonical_url === 'string' && row.canonical_url ? row.canonical_url : typeof row.url === 'string' ? row.url : '';
    if (!url) continue;
    const user = row.user && typeof row.user === 'object' ? (row.user as Record<string, unknown>) : null;
    out.push({
      id: row.id,
      title: collapseWhitespace(String(row.title ?? '')),
      url,
      date: toDay(typeof row.published_at === 'string' ? row.published_at : typeof row.published_timestamp === 'string' ? row.published_timestamp : null),
      reactions: typeof row.positive_reactions_count === 'number' ? row.positive_reactions_count : typeof row.public_reactions_count === 'number' ? row.public_reactions_count : 0,
      comments: typeof row.comments_count === 'number' ? row.comments_count : 0,
      tags: Array.isArray(row.tag_list) ? (row.tag_list as unknown[]).map(String) : [],
      description: collapseWhitespace(String(row.description ?? '')),
      author: user && typeof user.name === 'string' ? collapseWhitespace(user.name) : null,
    });
  }
  return out;
}
