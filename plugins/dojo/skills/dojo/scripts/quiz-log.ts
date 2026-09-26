#!/usr/bin/env node
// Appends one quiz session's row to quiz-log.md, so dojo-quiz records the
// result in one call instead of reading and editing the file (ADR 0016).

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isMain, parseCli, runCli, todayIso } from "./lib/cli.ts";
import { QUIZ_LOG_HEADER } from "./lib/constants.ts";
import { requireWorkspace } from "./lib/workspace.ts";

const USAGE = `usage: quiz-log.ts [workspace] --scope <text> --predicted <n> --recalled <n> [--reread <IDs>]

Appends "| <date> | <scope> | <predicted> | <recalled> | <notes> |" to
quiz-log.md, creating the file with its header when it is missing. --reread
takes the lesson IDs with a "not recalled", comma-separated; the notes column
reads "Re-read L01, L03", or stays empty. Prints the row.`;

function cell(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

function count(name: string, value: unknown): number {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    throw Object.assign(new Error(`--${name} must be a whole number, got ${JSON.stringify(value ?? "")}`), { code: 2 });
  }
  return Number(value);
}

export function quizRow(scope: string, predicted: number, recalled: number, reread: string[], date = todayIso()): string {
  const ids = reread.map((id) => id.trim().toUpperCase()).filter((id) => id !== "");
  const notes = ids.length > 0 ? `Re-read ${ids.join(", ")}` : "";
  return `| ${date} | ${cell(scope)} | ${predicted} | ${recalled} | ${cell(notes)} |`;
}

export function appendQuizRow(workspace: string, row: string): void {
  const path = join(workspace, "quiz-log.md");
  if (!existsSync(path)) writeFileSync(path, QUIZ_LOG_HEADER);
  const text = readFileSync(path, "utf8");
  appendFileSync(path, `${text.endsWith("\n") || text === "" ? "" : "\n"}${row}\n`);
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    scope: { type: "string" },
    predicted: { type: "string" },
    recalled: { type: "string" },
    reread: { type: "string" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const scope = typeof args.values.scope === "string" ? args.values.scope.trim() : "";
  if (scope === "") throw Object.assign(new Error("--scope is required"), { code: 2 });
  const predicted = count("predicted", args.values.predicted);
  const recalled = count("recalled", args.values.recalled);
  const reread = typeof args.values.reread === "string" ? args.values.reread.split(",") : [];
  const workspace = requireWorkspace(args.positionals[0] ?? process.cwd());
  const row = quizRow(scope, predicted, recalled, reread);
  appendQuizRow(workspace, row);
  console.log(row);
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
