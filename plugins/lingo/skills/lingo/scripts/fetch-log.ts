#!/usr/bin/env node
// PostToolUse hook for WebFetch on Claude Code: records every URL the harness
// fetched, so lint checks citations against fetches the harness saw rather
// than fetches the pass says it made (ADR 0015). Registered by lingo-plan and
// lingo-next. Never blocks a fetch: every failure exits 0 with a note on stderr.
//
// The record goes to <workspace>/.lingo/fetched.jsonl when the hook's working
// directory is inside a workspace. Outside one it goes to a per-directory file
// in the system temp dir, but only after `--arm` created that directory's
// marker, so sessions that have nothing to do with lingo leave no files behind;
// `--collect <workspace>` merges the temp log into the workspace and disarms.
// lingo-plan needs the temp log because the workspace does not exist when its
// scout and intake begin, and a workspace may be a subdirectory of the session.
//
// This is a plugin-level hook (hooks/hooks.json), not a skill frontmatter one:
// frontmatter hooks fire in the main session only, and the research pass runs
// in a subagent (measured 2026-09-26).

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import { canonicalUrl, fetchedPath, parseFetched } from "./lib/ledger.ts";
import { findWorkspace, requireWorkspace } from "./lib/workspace.ts";

const USAGE = `usage: fetch-log.ts                      (as a hook: reads the tool call JSON on stdin)
       fetch-log.ts --arm                (record fetches from this directory before the workspace exists)
       fetch-log.ts --collect <workspace> (merge this directory's temp log into the workspace, then disarm)

As a hook it appends {"url", "fetched_at", "item": "hook"} to
<workspace>/.lingo/fetched.jsonl, or, when no workspace is at or above the
current directory and --arm was run there, to a temp log for that directory.
--collect appends the temp log's URLs the workspace has not recorded yet,
removes the temp log and disarms.`;

interface HookInput {
  tool_name?: unknown;
  tool_input?: unknown;
  cwd?: unknown;
}

export function tempLogPath(cwd: string): string {
  // The hook sees the resolved directory (macOS /var is /private/var), so the
  // key is the real path whenever it can be resolved.
  let real = cwd;
  try {
    real = realpathSync(cwd);
  } catch {
    // Keep the spelling given.
  }
  const hash = createHash("sha1").update(real).digest("hex").slice(0, 12);
  return join(tmpdir(), `lingo-fetched-${hash}.jsonl`);
}

function markerPath(cwd: string): string {
  return tempLogPath(cwd).replace(/\.jsonl$/, ".armed");
}

export function arm(cwd: string): string {
  writeFileSync(markerPath(cwd), "");
  return tempLogPath(cwd);
}

export function isArmed(cwd: string): boolean {
  return existsSync(markerPath(cwd));
}

export function recordLine(url: string, at = new Date()): string {
  return JSON.stringify({ url, fetched_at: at.toISOString().replace(/\.\d{3}Z$/, "Z"), item: "hook" }) + "\n";
}

// Where a fetch from `cwd` is recorded: the workspace's log when there is
// one, the armed temp log otherwise, or nowhere.
export function logPathFor(cwd: string): string | null {
  const workspace = findWorkspace(cwd);
  if (workspace) return fetchedPath(workspace);
  return isArmed(cwd) ? tempLogPath(cwd) : null;
}

export function record(input: HookInput, cwd: string): string | null {
  if (input.tool_name !== "WebFetch") return null;
  const args = input.tool_input && typeof input.tool_input === "object" ? (input.tool_input as Record<string, unknown>) : {};
  const url = typeof args.url === "string" ? args.url.trim() : "";
  if (!/^https?:\/\//i.test(url)) return null;
  const path = logPathFor(cwd);
  if (!path) return null;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, recordLine(url));
  return path;
}

export function collect(workspace: string, cwd: string): { added: number; seen: number } {
  const temp = tempLogPath(cwd);
  rmSync(markerPath(cwd), { force: true });
  if (!existsSync(temp)) return { added: 0, seen: 0 };
  const lines = readFileSync(temp, "utf8").split("\n").filter((l) => l.trim() !== "");
  const target = fetchedPath(workspace);
  const known = existsSync(target) ? parseFetched(readFileSync(target, "utf8")) : new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    let url = "";
    try {
      url = String((JSON.parse(line) as { url?: unknown }).url ?? "");
    } catch {
      continue;
    }
    if (!url || known.has(canonicalUrl(url))) continue;
    known.add(canonicalUrl(url));
    out.push(line);
  }
  mkdirSync(dirname(target), { recursive: true });
  if (out.length > 0) appendFileSync(target, out.join("\n") + "\n");
  rmSync(temp, { force: true });
  return { added: out.length, seen: lines.length };
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      raw += chunk;
    });
    process.stdin.on("end", () => resolve(raw));
  });
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), { collect: { type: "string" }, arm: { type: "boolean" } });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  if (args.values.arm) {
    console.log(`fetch log: recording fetches from ${process.cwd()} in ${arm(process.cwd())} until --collect`);
    return 0;
  }
  if (typeof args.values.collect === "string") {
    const workspace = requireWorkspace(args.values.collect);
    const result = collect(workspace, process.cwd());
    console.log(`fetch log: ${result.added} new URL(s) added to ${fetchedPath(workspace)} from ${result.seen} recorded by the hook`);
    return 0;
  }
  try {
    const input = JSON.parse(await readStdin()) as HookInput;
    record(input, typeof input.cwd === "string" && input.cwd !== "" ? input.cwd : process.cwd());
  } catch (error) {
    process.stderr.write(`lingo fetch log: ${(error as Error).message}\n`);
  }
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
