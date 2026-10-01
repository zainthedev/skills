// A lesson's Words section: a table of Word, Reading, Meaning and Example,
// then a "Source: [Title](url)" line naming where the words came from. Lint
// checks it, the deck script exports it, and checkpoints and quizzes sample it.

import { existsSync, readFileSync } from "node:fs";
import { WORDS_COLUMNS } from "./constants.ts";
import { findSection, splitDoc, type Section } from "./sections.ts";
import { isSeparatorRow, isTableRow, splitRow } from "./syllabus.ts";

export interface WordRow {
  word: string;
  reading: string;
  meaning: string;
  example: string;
  // 1-based file line.
  line: number;
  cells: string[];
}

export interface WordsTable {
  header: string[] | null;
  headerLine: number;
  rows: WordRow[];
  source: { title: string; url: string; line: number } | null;
  // Lines in the section that are neither the table, the source line nor blank.
  stray: number[];
}

const SOURCE = /^Source:\s*\[([^\]]+)\]\(([^)\s]+)\)\s*\.?\s*$/;

export function parseWords(section: Section): WordsTable {
  const out: WordsTable = { header: null, headerLine: 0, rows: [], source: null, stray: [] };
  const lines = section.lines;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    const lineNo = section.startLine + i;
    if (line.trim() === "") continue;
    const source = SOURCE.exec(line.trim());
    if (source) {
      out.source = { title: source[1], url: source[2], line: lineNo };
      continue;
    }
    if (!isTableRow(line)) {
      out.stray.push(lineNo);
      continue;
    }
    if (out.header === null && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      out.header = splitRow(line);
      out.headerLine = lineNo;
      i++;
      continue;
    }
    if (isSeparatorRow(line)) continue;
    const cells = splitRow(line);
    out.rows.push({ word: cells[0] ?? "", reading: cells[1] ?? "", meaning: cells[2] ?? "", example: cells[3] ?? "", line: lineNo, cells });
  }
  return out;
}

export function headerMatches(table: WordsTable): boolean {
  return table.header !== null && table.header.join(" | ") === WORDS_COLUMNS.join(" | ");
}

// The Words table of a lesson file, or null when the file or section is missing.
export function readLessonWords(file: string): WordsTable | null {
  if (!existsSync(file)) return null;
  const section = findSection(splitDoc(readFileSync(file, "utf8")), "Words");
  return section ? parseWords(section) : null;
}

// Cell text without Markdown emphasis or code marks, for the deck and prompts.
export function plainCell(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}
