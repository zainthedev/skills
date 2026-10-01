#!/usr/bin/env node
// Records one /lingo-talk session from the talk record the session wrote:
// appends its row to talk-log.md and its corrections to mistakes.md, where
// /lingo-quiz recycles them. Run once per record.

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import { MISTAKES_HEADER, TALK_LOG_HEADER } from "./lib/constants.ts";
import { mistakeRows, mistakesPath, parseTalkRecord, readMistakes } from "./lib/records.ts";
import { requireWorkspace } from "./lib/workspace.ts";
import { lintWorkspace } from "./lint.ts";

const USAGE = `usage: talk-log.ts <workspace> talk/<file>.md

Lints the talk record, then appends "| <date> | <scope> | <turns> | <n> | <focus> |"
to talk-log.md and one row per correction to mistakes.md, creating either file
with its header when missing. Refuses a record that fails lint or that
talk-log.md already lists. Prints the talk-log row and the mistake numbers.`;

function cell(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

function append(path: string, header: string, rows: string[]): void {
  if (!existsSync(path)) writeFileSync(path, header);
  const text = readFileSync(path, "utf8");
  if (rows.length > 0) appendFileSync(path, `${text.endsWith("\n") || text === "" ? "" : "\n"}${rows.join("\n")}\n`);
}

export function logTalk(workspace: string, recordPath: string): { row: string; numbers: number[] } {
  const file = resolve(workspace, recordPath);
  if (basename(dirname(file)) !== "talk" || resolve(dirname(dirname(file))) !== resolve(workspace)) {
    throw Object.assign(new Error(`${recordPath} is not a record in ${join(workspace, "talk")}`), { code: 2 });
  }
  const lint = lintWorkspace(workspace, [relative(workspace, file)]);
  if (lint.errors > 0) {
    const first = lint.findings.find((f) => f.severity === "error")!;
    throw new Error(`${relative(workspace, file)} fails lint (${lint.errors} error(s)), first at line ${first.line}: ${first.message}; fix it, then run this again`);
  }
  const record = parseTalkRecord(file, readFileSync(file, "utf8"));
  const name = basename(file, ".md");
  const logPath = join(workspace, "talk-log.md");
  if (existsSync(logPath) && readFileSync(logPath, "utf8").includes(`(talk/${name}.md)`)) throw new Error(`talk-log.md already lists ${name}`);
  const row = `| ${record.date} | [${cell(record.scope)}](talk/${name}.md) | ${record.turns ?? ""} | ${record.corrections.length} | ${cell(record.focus)} |`;
  append(logPath, TALK_LOG_HEADER, [row]);
  const { rows, numbers } = mistakeRows(readMistakes(workspace), record.corrections, record.date);
  append(mistakesPath(workspace), MISTAKES_HEADER, rows);
  return { row, numbers };
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {});
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const [workspaceArg, record] = args.positionals;
  if (!workspaceArg || !record) throw Object.assign(new Error("expected <workspace> and talk/<file>.md"), { code: 2 });
  const workspace = requireWorkspace(workspaceArg);
  const { row, numbers } = logTalk(workspace, record);
  console.log(row);
  console.log(numbers.length > 0 ? `mistakes.md: added ${numbers.join(", ")}` : "mistakes.md: no corrections to add");
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
