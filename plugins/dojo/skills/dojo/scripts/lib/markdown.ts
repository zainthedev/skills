// Renders the Markdown subset the dojo formats use to HTML: ATX headings
// with GitHub-style ids, paragraphs, nested ordered and unordered lists with
// lazy continuation, task lists, emphasis, inline code, links, images,
// fenced code, blockquotes, tables and horizontal rules. Frontmatter is
// stripped. One deliberate deviation from CommonMark: a soft line break
// inside a list item renders as <br>, so an Assignment item's Why, How and
// Do lines stay on their own lines.

import { parseFrontmatter } from "./frontmatter.ts";

export interface ListItemInfo {
  // Text of the nearest preceding H2, or null.
  section: string | null;
  depth: number;
  // 1-based position within its list.
  index: number;
  ordered: boolean;
}

export interface RenderOptions {
  linkRewrite?: (href: string) => string;
  // Returns the inner HTML to use for a list item, given the rendered one.
  onListItem?: (info: ListItemInfo, html: string) => string;
}

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "code"; lang: string; lines: string[] }
  | { kind: "hr" }
  | { kind: "quote"; blocks: Block[] }
  | { kind: "list"; ordered: boolean; start: number; loose: boolean; items: { blocks: Block[]; checked: boolean | null }[] }
  | { kind: "table"; header: string[]; align: (string | null)[]; rows: string[][] };

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*(?:\s#+\s*)?$/;
const HR = /^ {0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^ {0,3}>\s?/;
const LIST = /^( {0,3})([-*+]|\d{1,9}[.)])(\s+|$)(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function decodeEntities(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// GitHub style: lowercase, punctuation removed, spaces to hyphens.
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function inlineToText(markdown: string): string {
  return decodeEntities(renderInline(markdown, {}).replace(/<[^>]+>/g, ""));
}

function isBlank(line: string): boolean {
  return line.trim() === "";
}

function isBlockStart(line: string): boolean {
  return HEADING.test(line) || FENCE_OPEN.test(line) || HR.test(line) || QUOTE.test(line) || LIST.test(line);
}

function splitRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  return text.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    const fence = FENCE_OPEN.exec(line);
    if (fence) {
      const close = new RegExp(`^ {0,3}${fence[1][0]}{${fence[1].length},}\\s*$`);
      const body: string[] = [];
      i++;
      while (i < lines.length && !close.test(lines[i])) body.push(lines[i++]);
      i++;
      blocks.push({ kind: "code", lang: fence[2], lines: body });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }
    if (HR.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }
    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && (QUOTE.test(lines[i]) || (!isBlank(lines[i]) && !isBlockStart(lines[i]) && inner.length > 0 && !isBlank(inner[inner.length - 1])))) {
        inner.push(lines[i].replace(QUOTE, ""));
        i++;
      }
      blocks.push({ kind: "quote", blocks: parseBlocks(inner) });
      continue;
    }
    if (LIST.test(line)) {
      const [list, next] = parseList(lines, i);
      blocks.push(list);
      i = next;
      continue;
    }
    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes("|")) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) => (c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : c.startsWith(":") ? "left" : null));
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(lines[i])) rows.push(splitRow(lines[i++]));
      blocks.push({ kind: "table", header, align, rows });
      continue;
    }
    const para: string[] = [line];
    i++;
    while (i < lines.length && !isBlank(lines[i]) && !isBlockStart(lines[i]) && !(TABLE_ROW.test(lines[i]) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]))) {
      para.push(lines[i++]);
    }
    blocks.push({ kind: "paragraph", lines: para.map((l) => l.trim()) });
  }
  return blocks;
}

function parseList(lines: string[], start: number): [Block, number] {
  const first = LIST.exec(lines[start])!;
  const ordered = /\d/.test(first[2]);
  const startNumber = ordered ? Number(first[2].slice(0, -1)) : 1;
  const items: { blocks: Block[]; checked: boolean | null }[] = [];
  let loose = false;
  let i = start;
  while (i < lines.length) {
    const m = LIST.exec(lines[i]);
    if (!m || /\d/.test(m[2]) !== ordered) break;
    const contentIndent = m[1].length + m[2].length + Math.max(1, Math.min(m[3].length, 4));
    const itemLines: string[] = [m[4]];
    let checked: boolean | null = null;
    const task = /^\[([ xX])\]\s+(.*)$/.exec(m[4]);
    if (task) {
      checked = task[1] !== " ";
      itemLines[0] = task[2];
    }
    i++;
    while (i < lines.length) {
      const next = lines[i];
      if (isBlank(next)) {
        let j = i;
        while (j < lines.length && isBlank(lines[j])) j++;
        const indent = j < lines.length ? (/^ */.exec(lines[j])?.[0].length ?? 0) : 0;
        if (j < lines.length && indent >= contentIndent) {
          for (; i < j; i++) itemLines.push("");
          loose = true;
          continue;
        }
        const following = j < lines.length ? LIST.exec(lines[j]) : null;
        if (following && indent <= 3 && /\d/.test(following[2]) === ordered) loose = true;
        i = j;
        break;
      }
      const indent = /^ */.exec(next)?.[0].length ?? 0;
      if (indent >= contentIndent) {
        itemLines.push(next.slice(contentIndent));
        i++;
        continue;
      }
      if (LIST.test(next) && indent <= 3) break;
      if (!isBlank(itemLines[itemLines.length - 1]) && !isBlockStart(next)) {
        itemLines.push(next.trim());
        i++;
        continue;
      }
      break;
    }
    items.push({ blocks: parseBlocks(itemLines), checked });
  }
  return [{ kind: "list", ordered, start: startNumber, loose, items }, i];
}

interface RenderState {
  options: RenderOptions;
  ids: Map<string, number>;
  section: string | null;
  depth: number;
}

function renderBlocks(blocks: Block[], state: RenderState, inListItem = false, tight = false): string {
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case "heading": {
        const base = slugifyHeading(inlineToText(block.text)) || "section";
        const seen = state.ids.get(base) ?? 0;
        state.ids.set(base, seen + 1);
        const id = seen === 0 ? base : `${base}-${seen}`;
        if (block.level === 2) state.section = inlineToText(block.text);
        out.push(`<h${block.level} id="${escapeHtml(id)}">${renderInline(block.text, state.options)}</h${block.level}>`);
        break;
      }
      case "paragraph": {
        const joiner = inListItem ? "<br>\n" : "\n";
        const html = block.lines.map((l) => renderInline(l, state.options)).join(joiner);
        out.push(tight ? html : `<p>${html}</p>`);
        break;
      }
      case "code": {
        const cls = block.lang ? ` class="language-${escapeHtml(block.lang)}"` : "";
        out.push(`<pre><code${cls}>${escapeHtml(block.lines.join("\n"))}\n</code></pre>`);
        break;
      }
      case "hr":
        out.push("<hr>");
        break;
      case "quote":
        out.push(`<blockquote>\n${renderBlocks(block.blocks, state)}\n</blockquote>`);
        break;
      case "list": {
        const tag = block.ordered ? "ol" : "ul";
        const startAttr = block.ordered && block.start !== 1 ? ` start="${block.start}"` : "";
        const items = block.items.map((item, index) => {
          state.depth++;
          let inner = renderBlocks(item.blocks, state, true, !block.loose);
          state.depth--;
          if (item.checked !== null) {
            inner = `<input type="checkbox" disabled${item.checked ? " checked" : ""}> ${inner}`;
          }
          if (state.options.onListItem) {
            inner = state.options.onListItem({ section: state.section, depth: state.depth, index: index + 1, ordered: block.ordered }, inner);
          }
          const cls = item.checked !== null ? ' class="task-list-item"' : "";
          return `<li${cls}>${inner}</li>`;
        });
        out.push(`<${tag}${startAttr}>\n${items.join("\n")}\n</${tag}>`);
        break;
      }
      case "table": {
        const cell = (tag: string, text: string, index: number) => {
          const align = block.align[index] ? ` align="${block.align[index]}"` : "";
          return `<${tag}${align}>${renderInline(text, state.options)}</${tag}>`;
        };
        const head = `<thead>\n<tr>${block.header.map((h, idx) => cell("th", h, idx)).join("")}</tr>\n</thead>`;
        const body = block.rows.map((row) => `<tr>${block.header.map((_, idx) => cell("td", row[idx] ?? "", idx)).join("")}</tr>`).join("\n");
        out.push(`<table>\n${head}\n<tbody>\n${body}\n</tbody>\n</table>`);
        break;
      }
    }
  }
  return out.join("\n");
}

const PUNCT = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

function findClosing(src: string, from: number, delim: string, underscore: boolean): number {
  for (let j = from; j <= src.length - delim.length; j++) {
    if (src[j] === "\\") {
      j++;
      continue;
    }
    if (src.startsWith(delim, j) && !/\s/.test(src[j - 1] ?? " ")) {
      const after = src[j + delim.length];
      if (delim.length === 1 && after === delim[0]) continue;
      if (underscore && after !== undefined && /[\p{L}\p{N}]/u.test(after)) continue;
      return j;
    }
  }
  return -1;
}

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const SAFE_SCHEMES = new Set(["http", "https", "mailto"]);

// Relative links, anchors and http(s) or mailto targets; anything with
// another scheme (javascript:, data:, file:) renders as plain text.
export function isSafeHref(href: string): boolean {
  const m = SCHEME.exec(href.trim());
  return !m || SAFE_SCHEMES.has(m[1].toLowerCase());
}

function matchLink(src: string, from: number): { text: string; href: string; end: number } | null {
  let depth = 0;
  let close = -1;
  for (let j = from; j < src.length; j++) {
    const ch = src[j];
    if (ch === "\\") j++;
    else if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) {
      close = j;
      break;
    }
  }
  if (close < 0 || src[close + 1] !== "(") return null;
  let k = close + 2;
  let parens = 0;
  let href = "";
  for (; k < src.length; k++) {
    const ch = src[k];
    if (ch === "\\" && k + 1 < src.length) {
      href += src[++k];
      continue;
    }
    if (ch === "(") parens++;
    else if (ch === ")") {
      if (parens === 0) break;
      parens--;
    }
    href += ch;
  }
  if (k >= src.length) return null;
  const title = /\s+"[^"]*"\s*$/.exec(href);
  if (title) href = href.slice(0, title.index);
  return { text: src.slice(from + 1, close), href: href.trim().replace(/^<|>$/g, ""), end: k + 1 };
}

export function renderInline(src: string, options: RenderOptions): string {
  let out = "";
  let i = 0;
  const rewrite = options.linkRewrite ?? ((h: string) => h);
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\" && i + 1 < src.length && PUNCT.test(src[i + 1])) {
      out += escapeHtml(src[i + 1]);
      i += 2;
      continue;
    }
    if (ch === "`") {
      const run = /^`+/.exec(src.slice(i))![0];
      const end = src.indexOf(run, i + run.length);
      if (end > 0 && src[end + run.length] !== "`") {
        let code = src.slice(i + run.length, end);
        if (code.length > 2 && code.startsWith(" ") && code.endsWith(" ") && code.trim() !== "") code = code.slice(1, -1);
        out += `<code>${escapeHtml(code)}</code>`;
        i = end + run.length;
      } else {
        out += escapeHtml(run);
        i += run.length;
      }
      continue;
    }
    if (ch === "!" && src[i + 1] === "[") {
      const link = matchLink(src, i + 1);
      if (link) {
        if (isSafeHref(link.href)) out += `<img src="${escapeHtml(rewrite(link.href))}" alt="${escapeHtml(inlineToText(link.text))}">`;
        else out += escapeHtml(inlineToText(link.text));
        i = link.end;
        continue;
      }
    }
    if (ch === "[") {
      const link = matchLink(src, i);
      if (link) {
        if (isSafeHref(link.href)) out += `<a href="${escapeHtml(rewrite(link.href))}">${renderInline(link.text, options)}</a>`;
        else out += renderInline(link.text, options);
        i = link.end;
        continue;
      }
    }
    if (ch === "<") {
      const auto = /^<(https?:\/\/[^\s<>]+)>/.exec(src.slice(i));
      if (auto) {
        out += `<a href="${escapeHtml(rewrite(auto[1]))}">${escapeHtml(auto[1])}</a>`;
        i += auto[0].length;
        continue;
      }
    }
    if ((ch === "*" || ch === "_") && !/\s/.test(src[i + 1] ?? " ")) {
      const underscore = ch === "_";
      const prev = src[i - 1];
      const wordBefore = prev !== undefined && /[\p{L}\p{N}]/u.test(prev);
      if (!(underscore && wordBefore)) {
        const strong = src[i + 1] === ch && !/\s/.test(src[i + 2] ?? " ");
        const delim = strong ? ch + ch : ch;
        const close = findClosing(src, i + delim.length + 1, delim, underscore);
        if (close > i + delim.length) {
          const tag = strong ? "strong" : "em";
          out += `<${tag}>${renderInline(src.slice(i + delim.length, close), options)}</${tag}>`;
          i = close + delim.length;
          continue;
        }
      }
    }
    out += escapeHtml(ch);
    i++;
  }
  return out;
}

export function renderMarkdown(markdown: string, options: RenderOptions = {}): string {
  const body = parseFrontmatter(markdown).body.replace(/\r\n/g, "\n");
  const state: RenderState = { options, ids: new Map(), section: null, depth: 0 };
  return renderBlocks(parseBlocks(body.split("\n")), state);
}

// The heading anchors a document would get, in order.
export function headingAnchors(markdown: string): string[] {
  const html = renderMarkdown(markdown);
  return [...html.matchAll(/<h[1-6] id="([^"]+)"/g)].map((m) => decodeEntities(m[1]));
}
