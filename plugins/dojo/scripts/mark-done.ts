#!/usr/bin/env node
// Updates one syllabus row's status, leaving every other byte unchanged.
// next, the site's done button and manual edits all go through this.

import { readFileSync, writeFileSync } from "node:fs";
import { isMain, parseCli, runCli, todayIso } from "./lib/cli.ts";
import { STATUSES } from "./lib/constants.ts";
import { setStatus, syllabusPath, type SetStatusResult } from "./lib/syllabus.ts";
import { requireWorkspace } from "./lib/workspace.ts";

const USAGE = `usage: mark-done.ts <workspace> <ID> [--status done|generated|planned] [--date YYYY-MM-DD] [--json]

Sets the Status of the syllabus row with that ID (default: done, with today's
date in the Done column). Other statuses clear the Done date. Prints the
updated row.`;

export function markItem(workspace: string, id: string, status = "done", date?: string): SetStatusResult {
  const path = syllabusPath(workspace);
  const text = readFileSync(path, "utf8");
  const result = setStatus(text, id, status, status === "done" ? date ?? todayIso() : "");
  writeFileSync(path, result.text);
  return result;
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    status: { type: "string", default: "done" },
    date: { type: "string" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const [workspaceArg, id] = args.positionals;
  if (!workspaceArg || !id) throw Object.assign(new Error("expected <workspace> and <ID>"), { code: 2 });
  const status = String(args.values.status);
  if (!(STATUSES as readonly string[]).includes(status)) {
    throw Object.assign(new Error(`--status must be one of ${STATUSES.join(", ")}`), { code: 2 });
  }
  const workspace = requireWorkspace(workspaceArg);
  const result = markItem(workspace, id, status, typeof args.values.date === "string" ? args.values.date : undefined);
  if (args.values.json) {
    console.log(JSON.stringify({ id: result.item.id, status: result.item.status, done: result.item.done, row: result.row }));
  } else {
    console.log(result.row);
  }
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
