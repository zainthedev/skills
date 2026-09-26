#!/usr/bin/env node
// Sums this session's Claude Code token usage from the transcript since a
// timestamp, so a run's actual cost can be reported beside the estimate.

import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { formatNumber, isMain, parseCli, requireString, runCli } from "./lib/cli.ts";

const USAGE = `usage: measure.ts --since <ISO timestamp> [--session <id>] [--cwd <path>]
                  [--projects-dir <path>] [--transcript <file>] [--json]

Sums the token usage of assistant messages at or after --since from the
Claude Code transcript for --cwd (default: the current directory), found at
~/.claude/projects/<cwd with every "/" replaced by "-">/<session>.jsonl.
Without --session the most recently modified transcript is used. Subagent
transcripts under <session>/subagents/ are summed as a separate row.
Exit 0 even when no transcript is found; the report then points at /usage.`;

export interface Usage {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
  messages: number;
}

export interface MeasureResult {
  available: boolean;
  reason?: string;
  since: string;
  transcript?: string;
  session?: string;
  main: Usage;
  subagents: Usage;
  subagentFiles: number;
  total: Usage;
}

export interface MeasureOptions {
  since: string;
  cwd?: string;
  session?: string;
  projectsDir?: string;
  transcript?: string;
}

function emptyUsage(): Usage {
  return { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, messages: 0 };
}

function addUsage(a: Usage, b: Usage): Usage {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheCreation: a.cacheCreation + b.cacheCreation,
    cacheRead: a.cacheRead + b.cacheRead,
    messages: a.messages + b.messages,
  };
}

export function usageTotal(u: Usage): number {
  return u.input + u.output + u.cacheCreation + u.cacheRead;
}

// Claude Code names the project directory after the working directory with
// every "/" turned into "-". Newer versions replace every non-alphanumeric
// character; both candidates are returned, the documented one first.
export function projectDirNames(cwd: string): string[] {
  const absolute = resolve(cwd);
  const slashes = absolute.replace(/\//g, "-");
  const all = absolute.replace(/[^A-Za-z0-9]/g, "-");
  return slashes === all ? [slashes] : [slashes, all];
}

interface TranscriptRecord {
  type?: string;
  timestamp?: string;
  uuid?: string;
  message?: {
    id?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

// One assistant message is written once per content block, each record
// carrying the same usage, so usage is kept per message id and summed once.
export async function sumTranscript(file: string, since: string): Promise<Usage> {
  const sinceMs = Date.parse(since);
  const perMessage = new Map<string, Usage>();
  const reader = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of reader) {
    if (line.trim() === "" || !line.includes('"assistant"')) continue;
    let record: TranscriptRecord;
    try {
      record = JSON.parse(line) as TranscriptRecord;
    } catch {
      continue;
    }
    if (record.type !== "assistant" || !record.message?.usage || !record.timestamp) continue;
    if (Date.parse(record.timestamp) < sinceMs) continue;
    const usage = record.message.usage;
    const key = record.message.id ?? record.uuid ?? `${record.timestamp}-${perMessage.size}`;
    perMessage.set(key, {
      input: usage.input_tokens ?? 0,
      output: usage.output_tokens ?? 0,
      cacheCreation: usage.cache_creation_input_tokens ?? 0,
      cacheRead: usage.cache_read_input_tokens ?? 0,
      messages: 1,
    });
  }
  let total = emptyUsage();
  for (const usage of perMessage.values()) total = addUsage(total, usage);
  return total;
}

function newestTranscript(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const candidates = readdirSync(dir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => ({ path: join(dir, name), mtime: statSync(join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return candidates[0]?.path ?? null;
}

export async function measure(opts: MeasureOptions): Promise<MeasureResult> {
  const since = opts.since;
  if (Number.isNaN(Date.parse(since))) throw new Error(`--since "${since}" is not an ISO timestamp`);
  const base: MeasureResult = { available: false, since, main: emptyUsage(), subagents: emptyUsage(), subagentFiles: 0, total: emptyUsage() };

  let transcript: string | null = null;
  if (opts.transcript) {
    transcript = resolve(opts.transcript);
    if (!existsSync(transcript)) return { ...base, reason: `transcript ${transcript} does not exist` };
  } else {
    const projectsDir = opts.projectsDir ?? join(homedir(), ".claude", "projects");
    const names = projectDirNames(opts.cwd ?? process.cwd());
    const dir = names.map((n) => join(projectsDir, n)).find((d) => existsSync(d));
    if (!dir) return { ...base, reason: `no transcript directory for ${resolve(opts.cwd ?? process.cwd())} under ${projectsDir}` };
    if (opts.session) {
      transcript = join(dir, `${opts.session}.jsonl`);
      if (!existsSync(transcript)) return { ...base, reason: `no transcript ${transcript}` };
    } else {
      transcript = newestTranscript(dir);
      if (!transcript) return { ...base, reason: `no .jsonl transcripts in ${dir}` };
    }
  }

  const session = basename(transcript, ".jsonl");
  const main = await sumTranscript(transcript, since);
  let subagents = emptyUsage();
  let subagentFiles = 0;
  const subagentDir = join(resolve(transcript, ".."), session, "subagents");
  if (existsSync(subagentDir)) {
    for (const name of readdirSync(subagentDir).filter((n) => n.endsWith(".jsonl"))) {
      subagents = addUsage(subagents, await sumTranscript(join(subagentDir, name), since));
      subagentFiles++;
    }
  }
  return { available: true, since, transcript, session, main, subagents, subagentFiles, total: addUsage(main, subagents) };
}

export function formatReport(result: MeasureResult): string {
  if (!result.available) {
    return [
      `Token usage since ${result.since}: transcript unavailable (${result.reason}).`,
      "Run /usage in Claude Code for the built-in per-skill report.",
    ].join("\n");
  }
  const rows: [string, Usage][] = [["session", result.main]];
  if (result.subagentFiles > 0) rows.push([`subagents (${result.subagentFiles})`, result.subagents]);
  rows.push(["total", result.total]);
  const header = ["", "input", "cache write", "cache read", "output", "total", "messages"];
  const lines = rows.map(([label, u]) => [
    label,
    formatNumber(u.input),
    formatNumber(u.cacheCreation),
    formatNumber(u.cacheRead),
    formatNumber(u.output),
    formatNumber(usageTotal(u)),
    String(u.messages),
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...lines.map((l) => l[i].length)));
  const fmt = (cells: string[]) => cells.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join("  ");
  const out = [
    `Token usage since ${result.since} (session ${result.session}, ${result.transcript})`,
    fmt(header),
    ...lines.map(fmt),
    "",
    result.subagentFiles > 0
      ? "Subagent transcripts were summed separately above; Claude Code's /usage may report them differently."
      : "No subagent transcripts found; subagent usage, if any, may be reported separately by /usage.",
  ];
  return out.join("\n");
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    since: { type: "string" },
    session: { type: "string" },
    cwd: { type: "string" },
    "projects-dir": { type: "string" },
    transcript: { type: "string" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const v = args.values;
  const result = await measure({
    since: requireString(v, "since"),
    session: typeof v.session === "string" ? v.session : undefined,
    cwd: typeof v.cwd === "string" ? v.cwd : undefined,
    projectsDir: typeof v["projects-dir"] === "string" ? v["projects-dir"] : undefined,
    transcript: typeof v.transcript === "string" ? v.transcript : undefined,
  });
  console.log(v.json ? JSON.stringify(result, null, 2) : formatReport(result));
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
