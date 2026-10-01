// Parsers for the Hacker News Algolia API: search hits (stories) and item trees (a story with
// its comments). Comment points are always null on Algolia, so HN comments carry a rank only,
// and that rank comes from the official API's kids order when the fetcher supplies it.

import { extractLinksFromHtml, htmlToText, toDay } from './text.ts';
import type { ExtractedLink } from './types.ts';

export interface HnStory {
  id: string;
  title: string;
  url: string | null;
  hnUrl: string;
  points: number | null;
  num_comments: number | null;
  date: string | null;
  text: string;
  links: ExtractedLink[];
}

export interface HnComment {
  id: string;
  storyId: string;
  author: string | null;
  date: string | null;
  text: string;
  links: ExtractedLink[];
  /** 1-based position among top-level comments; null for replies. */
  rank: number | null;
  hnUrl: string;
}

export interface HnSearch {
  nbHits: number;
  stories: HnStory[];
  hits: HnHit[];
}

export interface HnHit {
  id: string;
  type: 'story' | 'comment' | 'other';
  date: string | null;
  url: string | null;
  text: string;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function hnItemUrl(id: string): string {
  return `https://news.ycombinator.com/item?id=${id}`;
}

function toStory(row: Record<string, unknown>, id: string): HnStory {
  const html = str(row.story_text) ?? str(row.text) ?? '';
  return {
    id,
    title: str(row.title) ?? '',
    url: str(row.url),
    hnUrl: hnItemUrl(id),
    points: num(row.points),
    num_comments: num(row.num_comments),
    date: toDay(str(row.created_at) ?? num(row.created_at_i)),
    text: htmlToText(html),
    links: extractLinksFromHtml(html),
  };
}

export function parseHnSearch(json: unknown): HnSearch {
  const empty: HnSearch = { nbHits: 0, stories: [], hits: [] };
  if (!json || typeof json !== 'object') return empty;
  const obj = json as Record<string, unknown>;
  const rows = Array.isArray(obj.hits) ? (obj.hits as Record<string, unknown>[]) : [];
  const stories: HnStory[] = [];
  const hits: HnHit[] = [];
  for (const row of rows) {
    const id = str(row.objectID);
    if (!id) continue;
    const tags = Array.isArray(row._tags) ? (row._tags as unknown[]).map(String) : [];
    const type: HnHit['type'] = tags.includes('comment') ? 'comment' : tags.includes('story') ? 'story' : 'other';
    const text = [str(row.title), str(row.story_text), str(row.comment_text)].filter(Boolean).join('\n');
    hits.push({ id, type, date: toDay(str(row.created_at) ?? num(row.created_at_i)), url: str(row.url) ?? str(row.story_url), text: htmlToText(text) });
    if (type === 'story') stories.push(toStory(row, id));
  }
  return { nbHits: num(obj.nbHits) ?? stories.length, stories, hits };
}

export interface HnItem {
  story: HnStory;
  comments: HnComment[];
}

/**
 * Parses an Algolia item tree. Algolia lists children in creation order, so top-level ranks are
 * taken from `kidsOrder`, the `kids` array of the official Hacker News API item, which is in the
 * order the page shows (highest ranked first). Without it, ranks are null: unknown, not earliest.
 */
export function parseHnItem(json: unknown, kidsOrder: string[] | null = null): HnItem | null {
  if (!json || typeof json !== 'object') return null;
  const root = json as Record<string, unknown>;
  const rootId = root.id === undefined || root.id === null ? null : String(root.id);
  if (!rootId) return null;
  const story = toStory(root, rootId);
  const comments: HnComment[] = [];
  const rankOf = new Map<string, number>();
  (kidsOrder ?? []).forEach((id, i) => rankOf.set(String(id), i + 1));
  const walk = (node: Record<string, unknown>, depth: number, topRank: number): void => {
    const children = Array.isArray(node.children) ? (node.children as Record<string, unknown>[]) : [];
    children.forEach((child, i) => {
      const id = child.id === undefined || child.id === null ? null : String(child.id);
      if (!id) return;
      const html = str(child.text) ?? '';
      const rank = depth === 0 ? (rankOf.get(id) ?? null) : null;
      comments.push({
        id,
        storyId: rootId,
        author: str(child.author),
        date: toDay(str(child.created_at) ?? num(child.created_at_i)),
        text: htmlToText(html),
        links: extractLinksFromHtml(html),
        rank,
        hnUrl: hnItemUrl(id),
      });
      walk(child, depth + 1, depth === 0 ? i + 1 : topRank);
    });
  };
  walk(root, 0, 0);
  if (story.num_comments === null) story.num_comments = comments.length;
  return { story, comments };
}
