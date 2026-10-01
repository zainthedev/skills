// The records the learner's practice leaves behind: talk records in talk/,
// writing reviews in reviews/, and the mistakes table talk-log.ts builds
// from the talk records. Lint, the logs, the quiz and the site read them here.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { asNumber, asString, type Frontmatter } from "./frontmatter.ts";
import { findSection, splitDoc, type Doc } from "./sections.ts";
import { isSeparatorRow, isTableRow, splitRow } from "./syllabus.ts";

export interface TableRow {
  cells: string[];
  line: number;
}

export interface Table {
  header: string[] | null;
  headerLine: number;
  rows: TableRow[];
}

// The first table in a run of lines, starting at file line startLine.
export function parseTable(lines: string[], startLine: number): Table {
  const out: Table = { header: null, headerLine: 0, rows: [] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    if (!isTableRow(line)) {
      if (out.header !== null && line.trim() !== "") break;
      continue;
    }
    if (out.header === null) {
      if (i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
        out.header = splitRow(line);
        out.headerLine = startLine + i;
        i++;
      }
      continue;
    }
    if (isSeparatorRow(line)) continue;
    const cells = splitRow(line);
    if (cells.every((c) => c === "")) continue;
    out.rows.push({ cells, line: startLine + i });
  }
  return out;
}

export function sectionTable(doc: Doc, heading: string): Table {
  const section = findSection(doc, heading);
  return section ? parseTable(section.lines, section.startLine) : { header: null, headerLine: 0, rows: [] };
}

export interface Correction {
  wrote: string;
  better: string;
  why: string;
  lesson: string;
  line: number;
}

export interface TalkRecord {
  path: string;
  name: string;
  data: Frontmatter;
  date: string;
  scope: string;
  turns: number | null;
  title: string | null;
  doc: Doc;
  table: Table;
  corrections: Correction[];
  focus: string;
}

export function parseTalkRecord(path: string, text: string): TalkRecord {
  const doc = splitDoc(text);
  const table = sectionTable(doc, "Corrections");
  const focus = findSection(doc, "Focus next");
  return {
    path,
    name: path.split(/[\\/]/).pop() ?? path,
    data: doc.data,
    date: asString(doc.data.date),
    scope: asString(doc.data.scope),
    turns: asNumber(doc.data.turns),
    title: doc.title,
    doc,
    table,
    corrections: table.rows.map((r) => ({ wrote: r.cells[0] ?? "", better: r.cells[1] ?? "", why: r.cells[2] ?? "", lesson: r.cells[3] ?? "", line: r.line })),
    focus: focus ? focus.lines.join(" ").replace(/\s+/g, " ").trim() : "",
  };
}

export interface ReviewMark {
  n: number | null;
  where: string;
  code: string;
  hint: string;
  status: string;
  line: number;
  cells: string[];
}

export interface WritingReview {
  path: string;
  name: string;
  data: Frontmatter;
  item: string;
  round: number | null;
  title: string | null;
  doc: Doc;
  table: Table;
  marks: ReviewMark[];
  // The quoted learner text, markers kept, quote marks dropped.
  text: string;
}

export function parseReview(path: string, text: string): WritingReview {
  const doc = splitDoc(text);
  const table = sectionTable(doc, "Marks");
  const quoted = findSection(doc, "Text");
  return {
    path,
    name: path.split(/[\\/]/).pop() ?? path,
    data: doc.data,
    item: asString(doc.data.item),
    round: asNumber(doc.data.round),
    title: doc.title,
    doc,
    table,
    marks: table.rows.map((r) => ({
      n: /^\d+$/.test(r.cells[0] ?? "") ? Number(r.cells[0]) : null,
      where: r.cells[1] ?? "",
      code: r.cells[2] ?? "",
      hint: r.cells[3] ?? "",
      status: r.cells[4] ?? "",
      line: r.line,
      cells: r.cells,
    })),
    text: quoted ? quoted.lines.map((l) => l.replace(/^\s*>\s?/, "")).join("\n").trim() : "",
  };
}

// The .md files directly inside a directory, sorted, each parsed.
function readDir<T>(dir: string, parse: (path: string, text: string) => T): T[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => parse(join(dir, name), readFileSync(join(dir, name), "utf8")));
}

export function readTalkRecords(workspace: string): TalkRecord[] {
  return readDir(join(workspace, "talk"), parseTalkRecord);
}

export function readWritingReviews(workspace: string): WritingReview[] {
  return readDir(join(workspace, "reviews"), parseReview);
}

export interface Mistake {
  n: number;
  date: string;
  lesson: string;
  wrote: string;
  better: string;
  why: string;
  cleared: string;
  line: number;
}

export function parseMistakes(text: string): Mistake[] {
  const lines = text.split("\n");
  const table = parseTable(lines, 1);
  return table.rows
    .filter((r) => /^\d+$/.test(r.cells[0] ?? ""))
    .map((r) => ({
      n: Number(r.cells[0]),
      date: r.cells[1] ?? "",
      lesson: r.cells[2] ?? "",
      wrote: r.cells[3] ?? "",
      better: r.cells[4] ?? "",
      why: r.cells[5] ?? "",
      cleared: r.cells[6] ?? "",
      line: r.line,
    }));
}

export function mistakesPath(workspace: string): string {
  return join(workspace, "mistakes.md");
}

export function readMistakes(workspace: string): Mistake[] {
  const path = mistakesPath(workspace);
  return existsSync(path) ? parseMistakes(readFileSync(path, "utf8")) : [];
}

function cell(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

// Appends the corrections as new numbered rows of mistakes.md, creating it
// with its header when missing. Returns the numbers given.
export function mistakeRows(existing: Mistake[], corrections: Correction[], date: string): { rows: string[]; numbers: number[] } {
  let next = existing.reduce((max, m) => Math.max(max, m.n), 0) + 1;
  const rows: string[] = [];
  const numbers: number[] = [];
  for (const c of corrections) {
    numbers.push(next);
    rows.push(`| ${next} | ${date} | ${cell(c.lesson || "-")} | ${cell(c.wrote)} | ${cell(c.better)} | ${cell(c.why)} | |`);
    next++;
  }
  return { rows, numbers };
}

// Sets the Cleared cell of each numbered row, leaving every other line as it was.
export function clearMistakes(text: string, numbers: number[], date: string): { text: string; cleared: number[] } {
  const wanted = new Set(numbers);
  const cleared: number[] = [];
  const lines = text.split("\n").map((line) => {
    if (!isTableRow(line) || isSeparatorRow(line)) return line;
    const cells = splitRow(line);
    const n = /^\d+$/.test(cells[0] ?? "") ? Number(cells[0]) : null;
    if (n === null || !wanted.has(n) || cells.length < 7) return line;
    cells[6] = date;
    cleared.push(n);
    return `| ${cells.map(cell).join(" | ")} |`;
  });
  return { text: lines.join("\n"), cleared };
}
