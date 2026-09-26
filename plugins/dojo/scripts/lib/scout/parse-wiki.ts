// Parser for an old.reddit.com wiki page as served by a Wayback Machine capture. Each link is
// returned with the heading above it and the line it sits on, which is the context the model
// needs to tell a recommendation from a rules link.

import { collapseWhitespace, decodeEntities, extractLinksFromHtml, htmlToText } from './text.ts';

export interface WikiLink {
  url: string;
  text: string;
  heading: string;
  line: string;
}

export interface WikiPage {
  title: string;
  links: WikiLink[];
  /** Other wiki pages of the same subreddit the page links to, lowercased, without a leading slash. */
  subpages: string[];
}

function sliceRegion(html: string, startMarkers: string[], endMarkers: string[]): string {
  let start = -1;
  for (const marker of startMarkers) {
    const i = html.indexOf(marker);
    if (i >= 0 && (start < 0 || i < start)) start = i;
  }
  if (start < 0) return '';
  let end = html.length;
  for (const marker of endMarkers) {
    const i = html.indexOf(marker, start + 1);
    if (i >= 0 && i < end) end = i;
  }
  return html.slice(start, end);
}

const HEADING_MARK = '\u0001H';

/** The heading path above a link: "Getting Started > Read the sidebar first!", without the page's h1. */
function headingPath(stack: string[], fallback: string): string {
  const parts = stack.filter(Boolean);
  if (parts.length > 1) return parts.slice(1).join(' > ');
  return parts[0] ?? fallback;
}

function parseRegion(region: string, defaultHeading: string): WikiLink[] {
  let s = region.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<h([1-6])\b[^>]*>/gi, `\n${HEADING_MARK}$1\u0001`).replace(/<\/h[1-6]>/gi, '\n');
  s = s.replace(/<(li|p|tr|dt|dd|blockquote|pre)\b[^>]*>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
  const out: WikiLink[] = [];
  const stack: string[] = [];
  for (const rawLine of s.split('\n')) {
    if (rawLine.startsWith(HEADING_MARK)) {
      const level = Number(rawLine.charAt(HEADING_MARK.length));
      const h = collapseWhitespace(htmlToText(rawLine.slice(HEADING_MARK.length + 2)));
      stack.length = Math.min(stack.length, level);
      stack[level] = h;
      continue;
    }
    const anchors = extractLinksFromHtml(rawLine);
    if (anchors.length === 0) continue;
    const line = collapseWhitespace(htmlToText(rawLine)).slice(0, 240);
    const heading = headingPath(stack, defaultHeading);
    for (const a of anchors) out.push({ url: a.url, text: a.text, heading, line });
  }
  return out;
}

export function parseWikiPage(html: string, subreddit: string): WikiPage {
  const title = decodeEntities(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '').trim();
  const content = sliceRegion(html, ['class="md wiki"', 'class="wiki-page-content"'], ['class="footer-parent"', '</body>']);
  const sidebar = sliceRegion(html, ['<div class="side"'], ['<div class="content"', 'class="md wiki"']);
  const links = [...parseRegion(content, 'wiki'), ...parseRegion(sidebar, 'sidebar')];

  const subpages = new Set<string>();
  const re = /href="(?:https?:\/\/(?:old\.|www\.|new\.)?reddit\.com)?\/r\/([A-Za-z0-9_]+)\/wiki\/([A-Za-z0-9_\-\/]+)/g;
  for (const m of content.matchAll(re)) {
    if (m[1].toLowerCase() !== subreddit.toLowerCase()) continue;
    const page = m[2].toLowerCase().replace(/\/+$/, '');
    if (!page || page === 'index' || page.startsWith('config/') || page === 'pages' || page.startsWith('revisions')) continue;
    subpages.add(page);
  }
  return { title, links, subpages: [...subpages] };
}
