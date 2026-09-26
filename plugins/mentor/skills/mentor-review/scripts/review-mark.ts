#!/usr/bin/env node
// Updates one flag's row in a review's flags table, leaving every other byte
// unchanged: resolved once the code no longer has the problem, and answered
// once the learner asked for and was given the answer (ADR 0001).

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { CliError, isMain, parseCli, runCli } from "./lib/cli.ts";
import { FLAG_STATUSES, setFlag } from "./lib/review.ts";

const USAGE = `usage: review-mark.ts <review file> <flag number> [--status open|resolved] [--answered]

Sets the flag's Status, or its Answer given cell to yes with --answered, or
both. Prints the updated row.`;

export function markFlag(path: string, number: number, status: string | undefined, answered: boolean): string {
  const text = readFileSync(path, "utf8");
  const result = setFlag(text, number, { status, answered: answered ? true : undefined });
  writeFileSync(path, result.text);
  return result.row;
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    status: { type: "string" },
    answered: { type: "boolean" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const [file, numberArg] = args.positionals;
  if (!file || !numberArg || !/^\d+$/.test(numberArg)) throw new CliError("expected <review file> and a flag number", 2);
  const status = typeof args.values.status === "string" ? args.values.status : undefined;
  if (status !== undefined && !(FLAG_STATUSES as readonly string[]).includes(status)) {
    throw new CliError(`--status must be one of ${FLAG_STATUSES.join(", ")}`, 2);
  }
  // It writes only reviews, since the guard lets a read-only session run it.
  if (!file.endsWith(".md") || basename(dirname(resolve(file))) !== "reviews") throw new CliError(`${file} is not a review in a reviews directory`, 2);
  const answered = args.values.answered === true;
  if (status === undefined && !answered) throw new CliError("give --status, --answered, or both", 2);
  console.log(markFlag(resolve(file), Number(numberArg), status, answered));
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
