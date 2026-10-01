#!/usr/bin/env node
// Blocks until a file exists and has stopped growing, so a command that
// started a background job (the scout) can wait for its output with one
// shell call, and optionally moves it into place. Exit 0 when the file is
// ready, 1 on timeout. The default timeout stays under the ten minutes a
// harness shell tool allows.

import { copyFileSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { isMain, parseCli, runCli } from "./lib/cli.ts";

const USAGE = `usage: wait-for.ts <file> [--timeout <seconds>] [--interval <seconds>] [--into <path>]
       wait-for.ts --slug <slug> [--into <path>] ...   (the scout's --slug output)

Waits until the file exists and its size is unchanged across two polls
(default interval 2 seconds; default timeout 540 seconds, under a shell
tool's ten-minute cap). --slug names <system temp dir>/lingo-scout-<slug>.json,
the file scout.ts --slug writes. With --into, the ready file is moved there
(directories created) and that path is printed; otherwise the file's own
path is printed. Exit 0 when ready, 1 with a message on timeout.`;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function scoutFileForSlug(slug: string): string {
  const clean = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return join(tmpdir(), `lingo-scout-${clean}.json`);
}

export async function waitFor(file: string, timeoutSeconds = 540, intervalSeconds = 2): Promise<boolean> {
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

// Moves a file, falling back to copy and delete across file systems.
export function moveFile(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  try {
    renameSync(from, to);
  } catch {
    copyFileSync(from, to);
    unlinkSync(from);
  }
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    timeout: { type: "string", default: "540" },
    interval: { type: "string", default: "2" },
    into: { type: "string" },
    slug: { type: "string" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const file = typeof args.values.slug === "string" && args.values.slug !== "" ? scoutFileForSlug(args.values.slug) : args.positionals[0];
  if (!file) throw Object.assign(new Error("expected <file> or --slug"), { code: 2 });
  const timeout = Math.max(1, Number(args.values.timeout) || 540);
  const interval = Math.max(0.1, Number(args.values.interval) || 2);
  const ready = await waitFor(file, timeout, interval);
  if (!ready) {
    process.stderr.write(`wait-for: ${resolve(file)} not ready after ${timeout}s\n`);
    return 1;
  }
  if (typeof args.values.into === "string" && args.values.into !== "") {
    const into = resolve(args.values.into);
    moveFile(resolve(file), into);
    console.log(into);
    return 0;
  }
  console.log(resolve(file));
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
