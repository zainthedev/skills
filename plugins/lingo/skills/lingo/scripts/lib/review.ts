// The review file mentor-review writes: its flags table, read by review-scope
// for earlier open flags, updated by review-mark, checked by review-lint and
// listed by a dojo course's site; and the dojo workspace check the reviewer
// and the guard share. REVIEW-FORMAT.md is the format.
//
// Vendored: mentor-review owns this file; mentor's coach, for the guard, and
// the dojo plugin carry byte-identical copies, which mentor's tests check.
// Edit mentor-review's, then copy.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.ts";

export const REVIEW_CATEGORIES = [
  "bug",
  "security",
  "requirement",
  "hand-rolled",
  "antipattern",
  "design",
  "error-handling",
  "performance",
  "tests",
  "readability",
] as const;
export const REVIEW_SEVERITIES = ["high", "medium", "low"] as const;
export const FLAG_STATUSES = ["open", "resolved"] as const;
export const FLAG_COLUMNS = ["#", "Category", "Severity", "Location", "Title", "Status", "Answer given"];
// A senior triages: at most this many flags are open in one review at once.
export const MAX_OPEN_FLAGS = 7;

export interface Flag {
  number: number;
  category: string;
  severity: string;
  location: string;
  title: string;
  status: string;
  answered: boolean;
  // 1-based file line of the table row.
  line: number;
}

export interface Review {
  data: Frontmatter;
  flags: Flag[];
  // 1-based line of the table's header row, or 0 without a table.
  tableLine: number;
}

const ROW = /^\s*\|.*\|\s*$/;
const SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

// Cells of a table row, trimmed, honouring escaped pipes.
function splitRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  return text.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

// The flags table is the first table under "## Flags".
export function parseReview(text: string): Review {
  const parsed = parseFrontmatter(text);
  const lines = text.split("\n");
  const flags: Flag[] = [];
  let tableLine = 0;
  const heading = lines.findIndex((l) => /^##\s+flags\s*$/i.test(l.trim()));
  if (heading >= 0) {
    for (let i = heading + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) {
      if (!ROW.test(lines[i])) {
        if (tableLine) break;
        continue;
      }
      if (!tableLine) {
        tableLine = i + 1;
        continue;
      }
      if (SEPARATOR.test(lines[i])) continue;
      const cells = splitRow(lines[i]);
      flags.push({
        number: Number(cells[0]),
        category: (cells[1] ?? "").toLowerCase(),
        severity: (cells[2] ?? "").toLowerCase(),
        location: (cells[3] ?? "").replace(/^`|`$/g, ""),
        title: cells[4] ?? "",
        status: (cells[5] ?? "").toLowerCase(),
        answered: /^yes$/i.test(cells[6] ?? ""),
        line: i + 1,
      });
    }
  }
  return { data: parsed.data, flags, tableLine };
}

// "src/cart.ts:42-48" is src/cart.ts.
export function locationFile(location: string): string {
  return location.replace(/^`|`$/g, "").replace(/:\d+(?:-\d+)?$/, "");
}

export interface FlagChange {
  status?: string;
  answered?: boolean;
}

// Rewrites one flag's Status or Answer given cell, leaving every other byte alone.
export function setFlag(text: string, number: number, change: FlagChange): { text: string; row: string } {
  if (change.status !== undefined && !(FLAG_STATUSES as readonly string[]).includes(change.status)) {
    throw new Error(`invalid status "${change.status}" (expected ${FLAG_STATUSES.join(", ")})`);
  }
  const flag = parseReview(text).flags.find((f) => f.number === number);
  if (!flag) throw new Error(`no flag ${number} in the review's flags table`);
  const rawLines = text.split(/(?<=\n)/);
  const rawLine = rawLines[flag.line - 1];
  const ending = /\r?\n$/.exec(rawLine)?.[0] ?? "";
  const content = rawLine.slice(0, rawLine.length - ending.length);
  const parts = content.split(/(?<!\\)\|/);
  const offset = content.trimStart().startsWith("|") ? 1 : 0;
  const trimmed = content.trimEnd();
  const closing = trimmed.endsWith("|") && !trimmed.endsWith("\\|");
  if (parts.length - offset - (closing ? 1 : 0) < FLAG_COLUMNS.length) {
    throw new Error(`flag ${number}'s row at line ${flag.line} has fewer than ${FLAG_COLUMNS.length} cells (${FLAG_COLUMNS.join(" | ")}); fix the row by hand`);
  }
  if (change.status !== undefined) parts[offset + 5] = ` ${change.status} `;
  if (change.answered !== undefined) parts[offset + 6] = ` ${change.answered ? "yes" : "no"} `;
  const row = parts.join("|");
  rawLines[flag.line - 1] = row + ending;
  return { text: rawLines.join(""), row };
}

export interface ReviewFile {
  path: string;
  name: string;
  review: Review;
}

// Every review in a reviews directory, sorted by file name.
export function readReviews(dir: string): ReviewFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => {
      const path = join(dir, name);
      return { path, name, review: parseReview(readFileSync(path, "utf8")) };
    });
}

// A dojo workspace is a directory whose profile.md has a dojo key in its
// frontmatter. Inside one, the reviewer never gives an answer.
export function isDojoWorkspace(dir: string): boolean {
  const profile = join(dir, "profile.md");
  if (!existsSync(profile)) return false;
  try {
    const parsed = parseFrontmatter(readFileSync(profile, "utf8"));
    return parsed.hasFrontmatter && Object.prototype.hasOwnProperty.call(parsed.data, "dojo");
  } catch {
    return false;
  }
}

export function findDojoWorkspace(startDir: string): string | null {
  let dir = resolve(startDir);
  if (existsSync(dir) && statSync(dir).isFile()) dir = dirname(dir);
  for (;;) {
    if (isDojoWorkspace(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// A review file's name for a scope: lowercase words joined by hyphens, at
// most 60 characters cut on a hyphen.
export function scopeSlug(text: string): string {
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length > 60) {
    const cut = slug.slice(0, 60);
    const at = cut.lastIndexOf("-");
    slug = at > 20 ? cut.slice(0, at) : cut;
  }
  return slug || "review";
}
