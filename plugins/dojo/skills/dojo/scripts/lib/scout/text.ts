// Text helpers: entity decoding, HTML and Markdown to plain text, link extraction and excerpts.
// Everything here is regex based on purpose: the inputs are feed fragments, not documents, and
// the scout must run with zero dependencies.

import type { ExtractedLink } from './types.ts';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '-',
  mdash: '-',
  hellip: '...',
  rsquo: "'",
  lsquo: "'",
  ldquo: '"',
  rdquo: '"',
  copy: '(c)',
  reg: '(R)',
  trade: '(TM)',
  middot: '.',
  bull: '*',
  laquo: '<<',
  raquo: '>>',
  times: 'x',
};

/** Decodes named and numeric character references. Unknown names are left as written. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const value = NAMED_ENTITIES[body.toLowerCase()];
    return value === undefined ? match : value;
  });
}

export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

export function stripCdata(input: string): string {
  return input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/** Converts an HTML fragment to plain text. Anchors keep their text; block ends become newlines. */
export function htmlToText(html: string): string {
  let s = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|blockquote|pre|ul|ol|table)>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  return s
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

const ANCHOR_RE = /<a\s+[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
// Parentheses are allowed inside so that wikipedia-style paths survive; unbalanced ones are trimmed.
const BARE_URL_RE = /https?:\/\/[^\s<>"'`\]]+/g;

/** Trims punctuation that ends a sentence rather than the URL, keeping balanced parentheses. */
export function trimUrlPunctuation(url: string): string {
  let u = url;
  for (;;) {
    const before = u;
    u = u.replace(/[.,;:!?'"*]+$/, '');
    while (u.endsWith(')') && count(u, ')') > count(u, '(')) u = u.slice(0, -1);
    if (u === before) return u;
  }
}

function count(s: string, ch: string): number {
  let n = 0;
  for (const c of s) if (c === ch) n++;
  return n;
}

export function extractBareUrls(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(BARE_URL_RE)) {
    const u = trimUrlPunctuation(m[0]);
    if (u.length > 10) out.push(u);
  }
  return out;
}

/** Links in an HTML fragment: anchors first, then bare URLs in the text outside anchors. */
export function extractLinksFromHtml(html: string): ExtractedLink[] {
  const out: ExtractedLink[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(ANCHOR_RE)) {
    const href = decodeEntities((m[1] ?? m[2] ?? '').trim());
    if (!/^https?:\/\//i.test(href) || seen.has(href)) continue;
    seen.add(href);
    out.push({ url: href, text: collapseWhitespace(htmlToText(m[3])) || href });
  }
  const rest = htmlToText(html.replace(ANCHOR_RE, ' '));
  for (const u of extractBareUrls(rest)) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push({ url: u, text: u });
  }
  return out;
}

const MD_LINK_RE = /\[([^\]]*)\]\(\s*<?(https?:\/\/[^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
const MD_AUTOLINK_RE = /<(https?:\/\/[^\s>]+)>/g;

/** Undoes Reddit's Markdown escaping of underscores and similar characters. */
function unescapeMarkdown(md: string): string {
  return md.replace(/\\([_*\[\]()#~`>-])/g, '$1');
}

/** Links in a Markdown fragment: [text](url), <url> autolinks, then bare URLs. */
export function extractLinksFromMarkdown(markdown: string): ExtractedLink[] {
  const md = unescapeMarkdown(markdown);
  const out: ExtractedLink[] = [];
  const seen = new Set<string>();
  for (const m of md.matchAll(MD_LINK_RE)) {
    const url = trimUrlPunctuation(m[2]);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, text: collapseWhitespace(m[1]) || url });
  }
  const rest = md.replace(MD_LINK_RE, ' $1 ').replace(MD_AUTOLINK_RE, ' $1 ');
  for (const u of extractBareUrls(rest)) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push({ url: u, text: u });
  }
  return out;
}

/** Converts Markdown to readable text: link text stays, bare URLs stay, markup goes. */
export function markdownToText(markdown: string): string {
  let s = unescapeMarkdown(markdown);
  s = s.replace(MD_LINK_RE, '$1');
  s = s.replace(MD_AUTOLINK_RE, '$1');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/^\s*>\s?/gm, '');
  s = s.replace(/(\*\*|__)(.*?)\1/g, '$2');
  s = s.replace(/`([^`]*)`/g, '$1');
  s = decodeEntities(s);
  return s
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** Words that look like a title, or null for text that is just a URL or too short to help. */
export function usableTitle(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = collapseWhitespace(text);
  if (t.length < 3 || t.length > 160) return null;
  if (/^(https?:\/\/|www\.)/i.test(t) || /^\[?(link|comments|here|this|source)\]?$/i.test(t)) return null;
  return t;
}

/**
 * One line of context around the first needle found in the text. Falls back to the start of
 * the text. Needles are tried in order, case-insensitively.
 */
export function excerptAround(text: string, needles: string[], radius = 100, max = 220): string {
  const flat = collapseWhitespace(text);
  if (!flat) return '';
  const lower = flat.toLowerCase();
  for (const needle of needles) {
    const n = collapseWhitespace(needle).toLowerCase();
    if (n.length < 3) continue;
    const i = lower.indexOf(n);
    if (i < 0) continue;
    const start = Math.max(0, i - radius);
    const end = Math.min(flat.length, i + n.length + radius);
    let out = flat.slice(start, end);
    if (start > 0) out = '...' + out.replace(/^\S*\s/, '');
    if (end < flat.length) out = out.replace(/\s\S*$/, '') + '...';
    return out.length > max ? out.slice(0, max - 3) + '...' : out;
  }
  return flat.length > max ? flat.slice(0, max - 3) + '...' : flat;
}

/** YYYY-MM-DD from an ISO string, RFC 2822 date or unix seconds; null when unparsable. */
export function toDay(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
