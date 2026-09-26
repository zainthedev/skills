#!/usr/bin/env node
// Blocks until a file exists and has stopped growing, so a command that
// started a background job (the scout) can wait for its output with one
// shell call. Exit 0 when the file is ready, 1 on timeout.

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { isMain, parseCli, runCli } from "./lib/cli.ts";

const USAGE = `usage: wait-for.ts <file> [--timeout <seconds>] [--interval <seconds>]

Waits until <file> exists and its size is unchanged across two polls
(default interval 2 seconds; default timeout 900 seconds). Prints the path
and exits 0 when ready, exits 1 with a message on timeout.`;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function waitFor(file: string, timeoutSeconds = 900, intervalSeconds = 2): Promise<boolean> {
  const path = resolve(file);
  const deadline = Date.now() + timeoutSeconds * 1000;
  let lastSize = -1;
  while (Date.now() <= deadline) {
    if (existsSync(path)) {
      const size = statSync(path).size;
      if (size > 0 && size === lastSize) return true;
      lastSize = size;
    }
    await sleep(intervalSeconds * 1000);
  }
  return false;
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    timeout: { type: "string", default: "900" },
    interval: { type: "string", default: "2" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const file = args.positionals[0];
  if (!file) throw Object.assign(new Error("expected <file>"), { code: 2 });
  const timeout = Math.max(1, Number(args.values.timeout) || 900);
  const interval = Math.max(0.1, Number(args.values.interval) || 2);
  const ready = await waitFor(file, timeout, interval);
  if (!ready) {
    process.stderr.write(`wait-for: ${resolve(file)} not ready after ${timeout}s\n`);
    return 1;
  }
  console.log(resolve(file));
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
