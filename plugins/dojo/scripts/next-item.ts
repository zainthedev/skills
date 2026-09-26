#!/usr/bin/env node
// Prints the next planned syllabus item, the current one, or all of them,
// as JSON, with the file each one lives at.

import { existsSync, readFileSync } from "node:fs";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import {
  current,
  lessonsInSection,
  nextPlanned,
  parseSyllabus,
  previousInSection,
  previousSectionNumber,
  syllabusPath,
  type Syllabus,
  type SyllabusItem,
} from "./lib/syllabus.ts";
import { itemPath, requireWorkspace, sidecarPath, starterDir } from "./lib/workspace.ts";

const USAGE = `usage: next-item.ts [workspace] [--current] [--all] [--json]

Prints the next planned item (default), the current item (--current: the last
generated item, else the first planned one) or every item (--all) as JSON.
Each item carries id, type, title, hours, status, done, section, sectionTitle,
path (the target file), exists, previous (ids before it in its section) and,
for a checkpoint, samples.section and samples.previousSection (lesson ids).
Output is JSON whether or not --json is given. The workspace defaults to the
one found at or above the current directory. Prints null when nothing matches.`;

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
  sidecar?: string;
  starter?: string;
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
  };
  if (item.type === "lesson") info.sidecar = sidecarPath(path);
  if (item.type === "completion-project") info.starter = starterDir(path);
  if (item.type === "checkpoint") {
    const previous = previousSectionNumber(syllabus, item.section);
    info.samples = {
      section: lessonsInSection(syllabus.items, item.section),
      previousSection: previous === null ? [] : lessonsInSection(syllabus.items, previous),
    };
  }
  return info;
}

export function readSyllabus(workspace: string): Syllabus {
  const path = syllabusPath(workspace);
  if (!existsSync(path)) throw new Error(`no syllabus.md in ${workspace}; run /dojo:plan first`);
  return parseSyllabus(readFileSync(path, "utf8"));
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    current: { type: "boolean" },
    all: { type: "boolean" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const workspace = requireWorkspace(args.positionals[0] ?? process.cwd());
  const syllabus = readSyllabus(workspace);
  if (args.values.all) {
    console.log(JSON.stringify(syllabus.items.map((it) => describeItem(workspace, syllabus, it)), null, 2));
    return 0;
  }
  const item = args.values.current ? current(syllabus.items) : nextPlanned(syllabus.items);
  if (!item) {
    process.stderr.write(args.values.current ? "no generated or planned items\n" : "no planned items left\n");
    console.log("null");
    return 0;
  }
  console.log(JSON.stringify(describeItem(workspace, syllabus, item), null, 2));
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
