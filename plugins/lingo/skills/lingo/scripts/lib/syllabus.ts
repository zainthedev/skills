// Parsing, querying, updating and validating syllabus.md. The syllabus is
// the single source of truth for progress, so setStatus touches one table
// row and nothing else.

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  DATE_PATTERN,
  GUIDED_LEVELS,
  ID_PATTERN,
  ITEM_TYPES,
  STATUSES,
  SYLLABUS_COLUMNS,
} from "./constants.ts";
import { finding, type Finding } from "./findings.ts";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.ts";
import { findItemFile, idPrefix } from "./workspace.ts";

export interface SyllabusSection {
  // Order of appearance, 1-based.
  order: number;
  // The N in "Section N: title", or the order when the heading has none.
  number: number;
  title: string;
  heading: string;
  line: number;
}

export interface SyllabusItem {
  id: string;
  type: string;
  title: string;
  hours: number | null;
  hoursRaw: string;
  status: string;
  done: string;
  section: number;
  sectionTitle: string;
  line: number;
  cells: string[];
}

export interface SyllabusTable {
  line: number;
  header: string[];
  section: number;
}

export interface Syllabus {
  data: Frontmatter;
  title: string | null;
  sections: SyllabusSection[];
  items: SyllabusItem[];
  tables: SyllabusTable[];
  lines: string[];
  // Item rows that appear before any section heading.
  orphanRows: number[];
}

const ROW = /^\s*\|.*\|\s*$/;
const SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

export function isTableRow(line: string): boolean {
  return ROW.test(line);
}

export function isSeparatorRow(line: string): boolean {
  return SEPARATOR.test(line) && line.includes("|");
}

// Cells of a table row, trimmed, honouring escaped pipes.
export function splitRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  return text.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

export function parseSyllabus(text: string): Syllabus {
  const parsed = parseFrontmatter(text);
  const lines = text.split("\n");
  const offset = parsed.frontmatterLines;
  const sections: SyllabusSection[] = [];
  const items: SyllabusItem[] = [];
  const tables: SyllabusTable[] = [];
  const orphanRows: number[] = [];
  let title: string | null = null;
  let currentSection: SyllabusSection | null = null;
  let inFence = false;

  for (let i = offset; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    const lineNo = i + 1;
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const h1 = /^#\s+(.*)$/.exec(line);
    if (h1 && title === null) {
      title = h1[1].trim();
      continue;
    }
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      const heading = h2[1].trim();
      const numbered = /^Section\s+(\d+)\s*:\s*(.*)$/i.exec(heading);
      currentSection = {
        order: sections.length + 1,
        number: numbered ? Number(numbered[1]) : sections.length + 1,
        title: numbered ? numbered[2].trim() : heading,
        heading,
        line: lineNo,
      };
      sections.push(currentSection);
      continue;
    }
    if (!isTableRow(line)) continue;
    // A header row is one followed by a separator row.
    if (i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      tables.push({ line: lineNo, header: splitRow(line), section: currentSection?.number ?? 0 });
      i++;
      continue;
    }
    if (isSeparatorRow(line)) continue;
    const cells = splitRow(line);
    if (cells.length === 0 || cells.every((c) => c === "")) continue;
    if (!currentSection) {
      orphanRows.push(lineNo);
      continue;
    }
    const hoursRaw = cells[3] ?? "";
    items.push({
      id: cells[0] ?? "",
      type: cells[1] ?? "",
      title: cells[2] ?? "",
      hours: /^\d+(\.\d+)?$/.test(hoursRaw) ? Number(hoursRaw) : null,
      hoursRaw,
      status: cells[4] ?? "",
      done: cells[5] ?? "",
      section: currentSection.number,
      sectionTitle: currentSection.title,
      line: lineNo,
      cells,
    });
  }
  return { data: parsed.data, title, sections, items, tables, lines, orphanRows };
}

export function nextPlanned(items: SyllabusItem[]): SyllabusItem | null {
  return items.find((it) => it.status === "planned") ?? null;
}

// The last generated item, else the first planned one.
export function current(items: SyllabusItem[]): SyllabusItem | null {
  const generated = items.filter((it) => it.status === "generated");
  if (generated.length > 0) return generated[generated.length - 1];
  return nextPlanned(items);
}

export function findItem(items: SyllabusItem[], id: string): SyllabusItem | null {
  return items.find((it) => it.id === id) ?? null;
}

export function itemsInSection(items: SyllabusItem[], section: number): SyllabusItem[] {
  return items.filter((it) => it.section === section);
}

export function lessonsInSection(items: SyllabusItem[], section: number): string[] {
  return itemsInSection(items, section)
    .filter((it) => it.type === "lesson")
    .map((it) => it.id);
}

// IDs of the items before `item` in its section, in course order.
export function previousInSection(items: SyllabusItem[], item: SyllabusItem): string[] {
  const out: string[] = [];
  for (const other of items) {
    if (other === item) break;
    if (other.section === item.section) out.push(other.id);
  }
  return out;
}

// IDs of every item before `item` in course order, any section, whose status
// is generated: the ones the learner has not said they finished.
export function unfinishedBefore(items: SyllabusItem[], item: SyllabusItem): string[] {
  const out: string[] = [];
  for (const other of items) {
    if (other === item) break;
    if (other.status === "generated") out.push(other.id);
  }
  return out;
}

// The section before the one given, by course order; null for the first.
export function previousSectionNumber(syllabus: Syllabus, section: number): number | null {
  const index = syllabus.sections.findIndex((s) => s.number === section);
  if (index <= 0) return null;
  return syllabus.sections[index - 1].number;
}

function replaceCell(raw: string, value: string): string {
  if (raw.trim() === "") return value === "" ? " " : ` ${value} `;
  const lead = /^\s*/.exec(raw)?.[0] ?? "";
  const trail = /\s*$/.exec(raw)?.[0] ?? "";
  if (value === "") return " ";
  return `${lead}${value}${trail}`;
}

export interface SetStatusResult {
  text: string;
  item: SyllabusItem;
  row: string;
}

// Rewrites the Status and Done cells of the row whose ID matches, leaving
// every other byte of the file unchanged. A status other than done clears
// the Done date.
export function setStatus(text: string, id: string, status: string, doneDate = ""): SetStatusResult {
  if (!(STATUSES as readonly string[]).includes(status)) {
    throw new Error(`invalid status "${status}" (expected ${STATUSES.join(", ")})`);
  }
  const syllabus = parseSyllabus(text);
  const item = findItem(syllabus.items, id);
  if (!item) throw new Error(`no item with ID ${id} in the syllabus`);
  const date = status === "done" ? doneDate : "";
  if (date && !DATE_PATTERN.test(date)) throw new Error(`invalid date "${date}" (expected YYYY-MM-DD)`);

  const rawLines = text.split(/(?<=\n)/);
  const index = item.line - 1;
  const rawLine = rawLines[index];
  const ending = /\r?\n$/.exec(rawLine)?.[0] ?? "";
  const content = rawLine.slice(0, rawLine.length - ending.length);
  const parts = content.split(/(?<!\\)\|/);
  // parts[0] is the text before the leading pipe when the row has one.
  const offset = content.trimStart().startsWith("|") ? 1 : 0;
  const statusIndex = offset + 4;
  const doneIndex = offset + 5;
  // With a closing pipe the last part is the text after it, not a cell.
  const trimmed = content.trimEnd();
  const closing = trimmed.endsWith("|") && !trimmed.endsWith("\\|");
  const cells = parts.length - offset - (closing ? 1 : 0);
  if (cells < SYLLABUS_COLUMNS.length) {
    throw new Error(`row for ${id} at line ${item.line} has ${cells} cells, expected ${SYLLABUS_COLUMNS.length} (${SYLLABUS_COLUMNS.join(" | ")}); fix the row by hand`);
  }
  parts[statusIndex] = replaceCell(parts[statusIndex], status);
  parts[doneIndex] = replaceCell(parts[doneIndex], date);
  const newContent = parts.join("|");
  rawLines[index] = newContent + ending;
  const updated = rawLines.join("");
  const newItem = findItem(parseSyllabus(updated).items, id)!;
  return { text: updated, item: newItem, row: newContent };
}

export interface SyllabusProfileHints {
  level?: string;
  hoursPerWeek?: number | null;
  created?: string;
  targetDate?: string;
}

// Structural rules from SYLLABUS-FORMAT.md. `workspace` enables the
// file-exists check for generated and done items.
export function validateSyllabus(syllabus: Syllabus, file: string, workspace?: string, hints: SyllabusProfileHints = {}): Finding[] {
  const out: Finding[] = [];
  const err = (line: number, rule: string, message: string) => out.push(finding("error", file, line, rule, message));
  const warn = (line: number, rule: string, message: string) => out.push(finding("warning", file, line, rule, message));

  for (const key of ["language", "level", "generated"]) {
    if (!(key in syllabus.data) || syllabus.data[key] === "") err(1, "syllabus/frontmatter", `missing frontmatter key "${key}"`);
  }
  for (const key of ["slug", "target_level", "lingo", "structure_sources"]) {
    if (!(key in syllabus.data)) warn(1, "syllabus/frontmatter", `missing frontmatter key "${key}"`);
  }
  if (syllabus.title === null) err(1, "syllabus/title", "missing the # <language> heading");
  if (syllabus.sections.length === 0) err(1, "syllabus/sections", "no ## section headings found");
  for (const row of syllabus.orphanRows) err(row, "syllabus/section", "table row appears before the first section heading");

  syllabus.sections.forEach((section, index) => {
    if (!/^Section\s+\d+\s*:/i.test(section.heading)) {
      warn(section.line, "syllabus/section-heading", `heading "${section.heading}" is not of the form "Section N: title"`);
    } else if (section.number !== index + 1) {
      warn(section.line, "syllabus/section-heading", `section is numbered ${section.number} but is the ${index + 1}th section`);
    }
  });

  for (const table of syllabus.tables) {
    const expected = SYLLABUS_COLUMNS.join(" | ");
    if (table.header.join(" | ") !== expected) {
      err(table.line, "syllabus/columns", `columns must be exactly "${expected}", got "${table.header.join(" | ")}"`);
    }
  }
  for (const section of syllabus.sections) {
    if (!syllabus.tables.some((t) => t.section === section.number)) {
      err(section.line, "syllabus/table", `section "${section.heading}" has no item table`);
    }
  }

  const seen = new Map<string, number>();
  const lastNumber: Record<string, number> = { L: 0, T: 0, C: 0 };
  for (const item of syllabus.items) {
    if (item.cells.length !== SYLLABUS_COLUMNS.length) {
      err(item.line, "syllabus/columns", `row has ${item.cells.length} cells, expected ${SYLLABUS_COLUMNS.length}`);
    }
    if (!ID_PATTERN.test(item.id)) {
      err(item.line, "syllabus/id", `ID "${item.id}" must be L, T or C followed by two digits`);
    } else {
      const letter = item.id[0];
      const number = Number(item.id.slice(1));
      if (seen.has(item.id)) err(item.line, "syllabus/id", `duplicate ID ${item.id} (first at line ${seen.get(item.id)})`);
      seen.set(item.id, item.line);
      if ((ITEM_TYPES as readonly string[]).includes(item.type) && idPrefix(item.type) !== letter) {
        err(item.line, "syllabus/id", `ID ${item.id} does not match type ${item.type} (expected prefix ${idPrefix(item.type)})`);
      }
      if (number <= lastNumber[letter]) {
        err(item.line, "syllabus/id", `ID ${item.id} is out of course order (previous ${letter} number was ${lastNumber[letter]})`);
      } else if (number !== lastNumber[letter] + 1) {
        warn(item.line, "syllabus/id", `ID ${item.id} skips ${letter}${String(lastNumber[letter] + 1).padStart(2, "0")}`);
      }
      lastNumber[letter] = Math.max(lastNumber[letter], number);
    }
    if (!(ITEM_TYPES as readonly string[]).includes(item.type)) {
      err(item.line, "syllabus/type", `type "${item.type}" must be one of ${ITEM_TYPES.join(", ")}`);
    }
    if (item.title === "") err(item.line, "syllabus/title", "empty title");
    if (item.hours === null) err(item.line, "syllabus/hours", `hours "${item.hoursRaw}" is not a number`);
    if (!(STATUSES as readonly string[]).includes(item.status)) {
      err(item.line, "syllabus/status", `status "${item.status}" must be one of ${STATUSES.join(", ")}`);
    }
    if (item.done !== "" && !DATE_PATTERN.test(item.done)) {
      err(item.line, "syllabus/done", `done "${item.done}" is not a YYYY-MM-DD date`);
    }
    if (item.status === "done" && item.done === "") warn(item.line, "syllabus/done", "status is done but the Done date is empty");
    if (item.status !== "done" && item.done !== "") warn(item.line, "syllabus/done", `Done date set but status is ${item.status}`);
    if (workspace && (item.status === "generated" || item.status === "done") && ID_PATTERN.test(item.id)) {
      if (!findItemFile(workspace, item.id, item.type)) {
        err(item.line, "syllabus/file-exists", `${item.id} is ${item.status} but no ${item.id}-*.md file exists`);
      }
    }
  }

  for (const section of syllabus.sections) {
    const rows = itemsInSection(syllabus.items, section.number);
    if (rows.length === 0) continue;
    const checkpoints = rows.filter((r) => r.type === "checkpoint");
    const last = rows[rows.length - 1];
    if (checkpoints.length === 0) err(section.line, "syllabus/section-checkpoint", `section "${section.heading}" has no checkpoint row`);
    if (checkpoints.length > 1) err(checkpoints[1].line, "syllabus/section-checkpoint", `section "${section.heading}" has more than one checkpoint`);
    if (checkpoints.length > 0 && last.type !== "checkpoint") {
      err(last.line, "syllabus/section-checkpoint", `section "${section.heading}" must end with its checkpoint, not ${last.id}`);
    }
    if (hints.level && GUIDED_LEVELS.includes(hints.level)) {
      const firstTask = rows.find((r) => isTaskType(r.type));
      if (firstTask && firstTask.type === "task") {
        warn(firstTask.line, "syllabus/guided-first", `at ${hints.level} a section's first task should be a guided-task`);
      }
    }
  }

  const tasks = syllabus.items.filter((it) => isTaskType(it.type));
  const capstones = syllabus.items.filter((it) => it.type === "capstone");
  if (capstones.length === 0) {
    warn(0, "syllabus/capstone", "no capstone row; the course should end with a capstone derived from the goal");
  } else {
    if (capstones.length > 1) err(capstones[1].line, "syllabus/capstone", "more than one capstone");
    const capstone = capstones[capstones.length - 1];
    const lastTask = tasks[tasks.length - 1];
    if (lastTask !== capstone) err(capstone.line, "syllabus/capstone-last", `the capstone must be the last task in the course, but ${lastTask.id} comes after it`);
    const lastSection = syllabus.sections[syllabus.sections.length - 1];
    if (lastSection && capstone.section !== lastSection.number) {
      err(capstone.line, "syllabus/capstone-last", "the capstone must sit in the final section, before the final checkpoint");
    }
  }

  if (hints.hoursPerWeek && hints.created && hints.targetDate && DATE_PATTERN.test(hints.created) && DATE_PATTERN.test(hints.targetDate)) {
    const weeks = (Date.parse(hints.targetDate) - Date.parse(hints.created)) / (7 * 24 * 3600 * 1000);
    const budget = hints.hoursPerWeek * weeks * 0.8;
    const total = syllabus.items.reduce((sum, it) => sum + (it.hours ?? 0), 0);
    if (weeks > 0 && total > budget) {
      warn(0, "syllabus/hours-fit", `total ${total} hours exceeds the ${budget.toFixed(1)} hour budget (${hints.hoursPerWeek} h/week over ${weeks.toFixed(1)} weeks, a fifth held back)`);
    }
  }
  return out;
}

export function isTaskType(type: string): boolean {
  return type === "task" || type === "guided-task" || type === "capstone";
}

export function syllabusPath(workspace: string): string {
  return join(workspace, "syllabus.md");
}

export function syllabusExists(workspace: string): boolean {
  return existsSync(syllabusPath(workspace));
}
