#!/usr/bin/env node
// Prints the next planned syllabus item, the current one, or all of them,
// as JSON, with the file each one lives at.

import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import {
  current,
  findItem,
  lessonsInSection,
  nextPlanned,
  parseSyllabus,
  previousInSection,
  previousSectionNumber,
  splitRow,
  unfinishedBefore,
  syllabusPath,
  type Syllabus,
  type SyllabusItem,
} from "./lib/syllabus.ts";
import { itemPath, readProfile, requireWorkspace, sidecarPath } from "./lib/workspace.ts";

const USAGE = `usage: next-item.ts [workspace] [--current | --all | --id <ID>] [--json]

Prints the next planned item (default), the current item (--current: the last
generated item, else the first planned one), one item by ID (--id) or every
item (--all) as one line of JSON. A single item comes as {"workspace", "started", ...item}; --all as
{"workspace", "items"}. Paths are relative to the workspace. Each item carries
id, type, title, hours, status, done, section, sectionTitle, path (the target
file), exists, previous (ids before it in its section), unfinished (ids of
every earlier item still generated, not done, in any section) and, for a
checkpoint, samples.section and samples.previousSection (lesson ids).
"started" is the current UTC time, for the token report; "estimate" is the
item type's row of TOKENS.md at the profile's level, or null. The workspace
defaults to the one found at or above the current directory. Prints null when
nothing matches.`;

export interface ItemInfo {
  id: string;
  type: string;
  title: string;
  hours: number | null;
  status: string;
  done: string;
  section: number;
  sectionTitle: string;
  path: string;
  exists: boolean;
  previous: string[];
  unfinished: string[];
  sidecar?: string;
  samples?: { section: string[]; previousSection: string[] };
}

export function describeItem(workspace: string, syllabus: Syllabus, item: SyllabusItem): ItemInfo {
  const path = itemPath(workspace, item);
  const info: ItemInfo = {
    id: item.id,
    type: item.type,
    title: item.title,
    hours: item.hours,
    status: item.status,
    done: item.done,
    section: item.section,
    sectionTitle: item.sectionTitle,
    path,
    exists: existsSync(path),
    previous: previousInSection(syllabus.items, item),
    unfinished: unfinishedBefore(syllabus.items, item),
  };
  if (item.type === "lesson") info.sidecar = sidecarPath(path);
  if (item.type === "checkpoint") {
    const previous = previousSectionNumber(syllabus, item.section);
    info.samples = {
      section: lessonsInSection(syllabus.items, item.section),
      previousSection: previous === null ? [] : lessonsInSection(syllabus.items, previous),
    };
  }
  return info;
}

// The same item with its paths relative to the workspace, for output.
export function relativeItem(workspace: string, info: ItemInfo): ItemInfo {
  const out: ItemInfo = { ...info, path: relative(workspace, info.path) };
  if (info.sidecar) out.sidecar = relative(workspace, info.sidecar);
  return out;
}

const TOKENS_FILE = fileURLToPath(new URL("../TOKENS.md", import.meta.url));
// The TOKENS.md row each item type is quoted from.
const TOKEN_ROWS: Record<string, string> = {
  lesson: "lesson",
  "guided-task": "task",
  task: "task",
  capstone: "task",
  checkpoint: "checkpoint",
};

export function tokenEstimate(type: string, level: string, tokens?: string): string | null {
  const row = TOKEN_ROWS[type];
  if (!row || !level) return null;
  let text = tokens;
  if (text === undefined) {
    try {
      text = readFileSync(TOKENS_FILE, "utf8");
    } catch {
      return null;
    }
  }
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const [item, rowLevel, weighted, basis] = splitRow(line);
    if (item !== row || rowLevel !== level) continue;
    return `${weighted} weighted (${basis})`;
  }
  return null;
}

function withEstimate(workspace: string, info: ItemInfo): ItemInfo & { estimate: string | null } {
  let level = "";
  try {
    level = readProfile(workspace).level;
  } catch {
    level = "";
  }
  return { ...info, estimate: tokenEstimate(info.type, level) };
}

function startedNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function readSyllabus(workspace: string): Syllabus {
  const path = syllabusPath(workspace);
  if (!existsSync(path)) throw new Error(`no syllabus.md in ${workspace}; run /lingo-plan first`);
  return parseSyllabus(readFileSync(path, "utf8"));
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    current: { type: "boolean" },
    all: { type: "boolean" },
    id: { type: "string" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const workspace = requireWorkspace(args.positionals[0] ?? process.cwd());
  const syllabus = readSyllabus(workspace);
  if (args.values.all) {
    console.log(JSON.stringify({ workspace, items: syllabus.items.map((it) => relativeItem(workspace, describeItem(workspace, syllabus, it))) }));
    return 0;
  }
  const wanted = typeof args.values.id === "string" ? args.values.id.trim().toUpperCase() : "";
  if (wanted !== "") {
    const chosen = findItem(syllabus.items, wanted);
    if (!chosen) throw Object.assign(new Error(`no item ${wanted} in the syllabus`), { code: 1 });
    console.log(JSON.stringify({ workspace, started: startedNow(), ...withEstimate(workspace, relativeItem(workspace, describeItem(workspace, syllabus, chosen))) }));
    return 0;
  }
  const item = args.values.current ? current(syllabus.items) : nextPlanned(syllabus.items);
  if (!item) {
    process.stderr.write(args.values.current ? "no generated or planned items\n" : "no planned items left\n");
    console.log("null");
    return 0;
  }
  console.log(JSON.stringify({ workspace, started: startedNow(), ...withEstimate(workspace, relativeItem(workspace, describeItem(workspace, syllabus, item))) }));
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
