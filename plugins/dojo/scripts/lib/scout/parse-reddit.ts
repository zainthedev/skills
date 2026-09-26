// Parsers for Reddit's Atom feeds: the per-subreddit search feed (threads) and the per-thread
// comments feed (post plus comments, no scores). Both are the only reddit.com routes the scout
// touches; it never fetches reddit.com HTML.

import { decodeEntities, extractLinksFromHtml, htmlToText, stripCdata, toDay } from './text.ts';
import type { ExtractedLink, RedditComment, Thread } from './types.ts';

export interface AtomEntry {
  id: string;
  title: string;
  link: string;
  updated: string | null;
  published: string | null;
  author: string | null;
  contentHtml: string;
  category: string | null;
}

export interface AtomFeed {
  title: string;
  entries: AtomEntry[];
}

function text(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeEntities(stripCdata(m[1])).trim() : null;
}

function attr(block: string, tag: string, name: string): string | null {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*?\\s${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? decodeEntities(m[1]) : null;
}

export function parseAtomFeed(xml: string): AtomFeed {
  const head = xml.split(/<entry\b/i)[0] ?? '';
  const title = text(head, 'title') ?? '';
  const entries: AtomEntry[] = [];
  for (const m of xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)) {
    const block = m[1];
    const authorBlock = block.match(/<author>([\s\S]*?)<\/author>/i)?.[1] ?? '';
    const withoutAuthor = block.replace(/<author>[\s\S]*?<\/author>/i, '');
    entries.push({
      id: text(withoutAuthor, 'id') ?? '',
      title: text(withoutAuthor, 'title') ?? '',
      link: attr(withoutAuthor, 'link', 'href') ?? '',
      updated: text(withoutAuthor, 'updated'),
      published: text(withoutAuthor, 'published'),
      author: text(authorBlock, 'name')?.replace(/^\/?u\//, '') ?? null,
      contentHtml: text(withoutAuthor, 'content') ?? '',
      category: attr(withoutAuthor, 'category', 'term'),
    });
  }
  return { title, entries };
}

export interface FeedThread {
  thread: Thread;
  text: string;
  links: ExtractedLink[];
}

function subredditFromUrl(url: string): string | null {
  const m = url.match(/reddit\.com\/r\/([A-Za-z0-9_]+)\//i);
  return m ? m[1] : null;
}

function entryToThread(entry: AtomEntry, subredditHint: string | null): FeedThread | null {
  if (!entry.id.startsWith('t3_')) return null;
  const html = entry.contentHtml;
  return {
    thread: {
      source: 'reddit',
      id: entry.id.slice(3),
      title: entry.title,
      url: entry.link,
      date: toDay(entry.published ?? entry.updated),
      score: null,
      num_comments: null,
      subreddit: entry.category ?? subredditFromUrl(entry.link) ?? subredditHint,
    },
    text: htmlToText(html),
    links: extractLinksFromHtml(html).filter((l) => !/^\[?(link|comments)\]?$/i.test(l.text) || !/reddit\.com/i.test(l.url)),
  };
}

/** Threads in a search feed, in feed order. */
export function parseSearchFeed(xml: string, subredditHint: string | null = null): FeedThread[] {
  const out: FeedThread[] = [];
  for (const entry of parseAtomFeed(xml).entries) {
    const t = entryToThread(entry, subredditHint);
    if (t) out.push(t);
  }
  return out;
}

export interface CommentsFeed {
  post: FeedThread | null;
  comments: RedditComment[];
}

/** The post and its comments from a thread's .rss feed. Comments carry their feed rank, not a score. */
export function parseCommentsFeed(xml: string, subredditHint: string | null = null): CommentsFeed {
  const feed = parseAtomFeed(xml);
  let post: FeedThread | null = null;
  const comments: RedditComment[] = [];
  for (const entry of feed.entries) {
    if (entry.id.startsWith('t3_')) {
      post ??= entryToThread(entry, subredditHint);
      continue;
    }
    if (!entry.id.startsWith('t1_')) continue;
    const threadId = entry.link.match(/\/comments\/([a-z0-9]+)\//i)?.[1] ?? post?.thread.id ?? '';
    comments.push({
      id: entry.id.slice(3),
      threadId,
      author: entry.author,
      date: toDay(entry.updated ?? entry.published),
      score: null,
      isSubmitter: false,
      text: htmlToText(entry.contentHtml),
      links: extractLinksFromHtml(entry.contentHtml),
      permalink: entry.link,
      feedRank: comments.length + 1,
    });
  }
  return { post, comments };
}
