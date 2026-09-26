// Line-level structure of a dojo Markdown file: the H1, the H2 sections,
// the top-level list items inside a section, word counts and URLs. Lint
// and the sidecar parser check structure with this; rendering is the
// Markdown module's job.

import { parseFrontmatter, type Frontmatter } from "./frontmatter.ts";

export interface Section {
  heading: string;
  // 1-based file line of the heading.
  line: number;
  // Content lines after the heading, up to the next H1 or H2.
  lines: string[];
  // 1-based file line of lines[0].
  startLine: number;
}

export interface Doc {
  data: Frontmatter;
  hasFrontmatter: boolean;
  frontmatterLines: number;
  title: string | null;
  titleLine: number;
  // Lines between the H1 and the first H2.
  preamble: string[];
  preambleLine: number;
  sections: Section[];
  lines: string[];
}

export interface ListItem {
  line: number;
  ordered: boolean;
  marker: string;
  // The first line's text after the marker (and after a task box).
  text: string;
  // Following lines that belong to the item, relative indentation kept.
  continuation: string[];
  checked: boolean | null;
}

const FENCE = /^\s*(```|~~~)/;
const LIST_MARKER = /^( {0,3})([-*+]|\d{1,9}[.)])(\s+|$)(.*)$/;

export function isBlank(line: string): boolean {
  return line.trim() === "";
}

export function splitDoc(text: string): Doc {
  const parsed = parseFrontmatter(text);
  const lines = text.split("\n");
  const sections: Section[] = [];
  let title: string | null = null;
  let titleLine = 0;
  const preamble: string[] = [];
  let preambleLine = 0;
  let current: Section | null = null;
  let inFence = false;
  for (let i = parsed.frontmatterLines; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    if (FENCE.test(line)) inFence = !inFence;
    if (!inFence) {
      const h1 = /^#\s+(.*?)\s*$/.exec(line);
      if (h1 && title === null && !current) {
        title = h1[1];
        titleLine = i + 1;
        preambleLine = i + 2;
        continue;
      }
      const h2 = /^##\s+(.*?)\s*$/.exec(line);
      if (h2) {
        current = { heading: h2[1], line: i + 1, lines: [], startLine: i + 2 };
        sections.push(current);
        continue;
      }
    }
    if (current) current.lines.push(line);
    else if (title !== null) preamble.push(line);
    else {
      preamble.push(line);
      if (preambleLine === 0) preambleLine = i + 1;
    }
  }
  return {
    data: parsed.data,
    hasFrontmatter: parsed.hasFrontmatter,
    frontmatterLines: parsed.frontmatterLines,
    title,
    titleLine,
    preamble,
    preambleLine,
    sections,
    lines,
  };
}

export function findSection(doc: Doc, heading: string): Section | null {
  const wanted = heading.toLowerCase();
  return doc.sections.find((s) => s.heading.toLowerCase() === wanted) ?? null;
}

// The first non-blank line of a section and its file line.
export function firstContentLine(section: Section): { text: string; line: number } | null {
  for (let i = 0; i < section.lines.length; i++) {
    if (!isBlank(section.lines[i])) return { text: section.lines[i], line: section.startLine + i };
  }
  return null;
}

function isBlockStart(line: string): boolean {
  return /^ {0,3}#{1,6}\s/.test(line) || FENCE.test(line) || /^ {0,3}>/.test(line) || /^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(line);
}

// Top-level list items (indented at most three spaces) in the section,
// each with the lines that continue it: indented lines, lazy continuation
// lines and any sub-lists.
export function listItems(section: Section): ListItem[] {
  const items: ListItem[] = [];
  const lines = section.lines;
  let i = 0;
  let inFence = false;
  while (i < lines.length) {
    const line = lines[i];
    if (FENCE.test(line)) {
      inFence = !inFence;
      i++;
      continue;
    }
    const m = inFence ? null : LIST_MARKER.exec(line);
    if (!m) {
      i++;
      continue;
    }
    const contentIndent = m[1].length + m[2].length + Math.max(1, Math.min(m[3].length, 4));
    let text = m[4];
    let checked: boolean | null = null;
    const task = /^\[([ xX])\]\s+(.*)$/.exec(text);
    if (task) {
      checked = task[1] !== " ";
      text = task[2];
    }
    const item: ListItem = { line: section.startLine + i, ordered: /\d/.test(m[2]), marker: m[2], text, continuation: [], checked };
    i++;
    let lastBlank = false;
    while (i < lines.length) {
      const next = lines[i];
      if (isBlank(next)) {
        let j = i;
        while (j < lines.length && isBlank(lines[j])) j++;
        const indent = j < lines.length ? (/^ */.exec(lines[j])?.[0].length ?? 0) : 0;
        if (j < lines.length && indent >= contentIndent) {
          for (; i < j; i++) item.continuation.push("");
          lastBlank = true;
          continue;
        }
        break;
      }
      const indent = /^ */.exec(next)?.[0].length ?? 0;
      if (indent >= contentIndent) {
        item.continuation.push(next.slice(contentIndent));
        lastBlank = false;
        i++;
        continue;
      }
      if (LIST_MARKER.test(next) && indent <= 3) break;
      if (!lastBlank && !isBlockStart(next)) {
        item.continuation.push(next.trim());
        i++;
        continue;
      }
      break;
    }
    while (item.continuation.length > 0 && item.continuation[item.continuation.length - 1] === "") item.continuation.pop();
    items.push(item);
  }
  return items;
}

// The item's full Markdown: first line plus continuation lines.
export function itemMarkdown(item: ListItem): string {
  return [item.text, ...item.continuation].join("\n");
}

// Lines of the section with fenced code blocks removed.
export function withoutFences(lines: string[]): string[] {
  const out: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) out.push(line);
  }
  return out;
}

export function fenceCount(lines: string[]): number {
  let count = 0;
  let inFence = false;
  for (const line of lines) {
    if (FENCE.test(line)) {
      if (!inFence) count++;
      inFence = !inFence;
    }
  }
  return count;
}

// Whitespace-separated tokens holding a letter or digit, after dropping
// fenced code, link targets and bare URLs.
export function wordCount(lines: string[]): number {
  let count = 0;
  for (const line of withoutFences(lines)) {
    const text = line
      .replace(/\]\([^)]*\)/g, "]")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/`[^`]*`/g, " code ");
    for (const token of text.split(/\s+/)) {
      if (/[\p{L}\p{N}]/u.test(token)) count++;
    }
  }
  return count;
}

export interface UrlRef {
  url: string;
  line: number;
}

// Markdown link targets, autolinks and bare URLs, skipping fenced code and
// inline code spans.
export function urlsIn(lines: string[], startLine: number): UrlRef[] {
  const out: UrlRef[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const text = line.replace(/`[^`]*`/g, " ");
    const seen = new Set<string>();
    const push = (url: string) => {
      const clean = url.replace(/[.,;:!?)]+$/, "");
      if (!seen.has(clean)) {
        seen.add(clean);
        out.push({ url: clean, line: startLine + i });
      }
    };
    let rest = text;
    for (const m of text.matchAll(/\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      push(m[1]);
      rest = rest.replace(m[0], "]");
    }
    for (const m of rest.matchAll(/<?(https?:\/\/[^\s<>)\]]+)>?/g)) push(m[1]);
  }
  return out;
}

// Link targets of `[text](target)` including anchors, with the link text.
export interface LinkRef {
  text: string;
  target: string;
}

export function linksIn(text: string): LinkRef[] {
  const out: LinkRef[] = [];
  for (const m of text.matchAll(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) out.push({ text: m[1], target: m[2] });
  return out;
}
