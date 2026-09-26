#!/usr/bin/env node
// dojo scout: gathers community endorsement signal for learning resources on a topic from
// public feeds and APIs, at a polite rate, and writes compact JSON for the model to rank.
// See plugins/dojo/docs/adr/0006-community-endorsement-comes-from-a-deterministic-scout.md.
//
// Usage:
//   scout.ts <workspace> --topic "<topic>" --subreddits <a,b,c> --keywords "<k1>|<k2>|<k3>"
//            [--max-threads 12] [--no-reddit] [--budget-seconds 600] [--out <path>]
//   scout.ts --slug <slug> --topic ... (no workspace yet: writes <tmpdir>/dojo-scout-<slug>.json)
//
// Progress goes to stderr; only the final summary goes to stdout. Exit code 0 even when the
// budget runs out: the file then holds what was gathered and budget.exhausted is true. A crash
// still writes the file, with an "error" field, and exits 1, so a waiter is never left hanging.

import { existsSync, mkdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { Http } from './lib/http.ts';
import { createLimiters } from './lib/scout/context.ts';
import type { ScoutContext } from './lib/scout/context.ts';
import { scoutDevto } from './lib/scout/fetch-devto.ts';
import { hnLookups, scoutHn } from './lib/scout/fetch-hn.ts';
import { runRedditPipeline } from './lib/scout/fetch-reddit.ts';
import { scoutStackExchange } from './lib/scout/fetch-se.ts';
import { verificationCandidates, verifyGithub, verifyHead, verifyYoutube } from './lib/scout/fetch-verify.ts';
import { scoutWikis } from './lib/scout/fetch-wayback.ts';
import { assembleOutput, formatOutput } from './lib/scout/output.ts';
import { ResourceIndex } from './lib/scout/resources.ts';
import { uncheckedFreshness } from './lib/scout/score.ts';
import type { ScoutOutput, Thread } from './lib/scout/types.ts';

export interface CliOptions {
  workspace: string;
  topic: string;
  subreddits: string[];
  keywords: string[];
  maxThreads: number;
  reddit: boolean;
  budgetSeconds: number;
  out: string;
}

const USAGE = `usage: scout.ts <workspace> --topic "<topic>" --subreddits <a,b,c> --keywords "<k1>|<k2>|<k3>"
                [--max-threads 12] [--no-reddit] [--budget-seconds 600] [--out <path>]
       scout.ts --slug <slug> --topic "<topic>" ...   (before the workspace exists)

Gathers community endorsement signal for learning resources on the topic and writes
<workspace>/.dojo/scout.json (or --out). With --slug and no workspace, it writes
<system temp dir>/dojo-scout-<slug>.json and prints that path first, so dojo-plan can
start it before init and collect it with wait-for.ts --into. Any file already at the
output path is removed at the start, so a waiter never picks up a stale run. Sources: subreddit wikis via Wayback captures, Reddit
search and comment feeds (one request per 30 seconds), comment scores from Arctic Shift, Hacker
News, Stack Exchange, dev.to, and GitHub metadata for verification. --no-reddit skips the
reddit.com feeds and Arctic Shift; the wikis still come from the Wayback Machine. Set GITHUB_TOKEN
to raise the GitHub API allowance. Progress goes to stderr, the summary to stdout.`;

export function parseCli(argv: string[]): CliOptions | { error: string } {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        topic: { type: 'string' },
        subreddits: { type: 'string', default: '' },
        keywords: { type: 'string' },
        'max-threads': { type: 'string', default: '12' },
        'no-reddit': { type: 'boolean', default: false },
        'budget-seconds': { type: 'string', default: '600' },
        out: { type: 'string' },
        slug: { type: 'string' },
        help: { type: 'boolean', default: false },
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  const values = parsed.values as Record<string, string | boolean | undefined>;
  if (values.help) return { error: USAGE };
  const slug = typeof values.slug === 'string' ? values.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '';
  const workspace = parsed.positionals[0] ?? (slug ? tmpdir() : undefined);
  if (!workspace) return { error: `missing <workspace> (or --slug)\n${USAGE}` };
  const topic = typeof values.topic === 'string' ? values.topic.trim() : '';
  if (!topic) return { error: `missing --topic\n${USAGE}` };
  const keywords = String(values.keywords ?? '')
    .split('|')
    .map((k) => k.trim())
    .filter(Boolean);
  if (keywords.length === 0) return { error: `missing --keywords\n${USAGE}` };
  const subreddits = String(values.subreddits ?? '')
    .split(',')
    .map((s) => s.trim().replace(/^\/?r\//, ''))
    .filter(Boolean);
  const reddit = !values['no-reddit'];
  if (reddit && subreddits.length === 0) return { error: `missing --subreddits (or pass --no-reddit)\n${USAGE}` };
  const maxThreads = Number(values['max-threads']);
  if (!Number.isInteger(maxThreads) || maxThreads < 0) return { error: '--max-threads must be a non-negative integer' };
  const budgetSeconds = Number(values['budget-seconds']);
  if (!Number.isFinite(budgetSeconds) || budgetSeconds <= 0) return { error: '--budget-seconds must be a positive number' };
  const out = typeof values.out === 'string' && values.out ? resolve(values.out) : slug ? join(tmpdir(), `dojo-scout-${slug}.json`) : resolve(workspace, '.dojo', 'scout.json');
  return { workspace: resolve(workspace), topic, subreddits, keywords, maxThreads, reddit, budgetSeconds, out };
}

function writeAtomically(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

function summarise(out: ScoutOutput, path: string): string {
  const { ok, error: errors, skipped } = out.requests;
  const twoPlus = out.resources.filter((r) => r.mentions.length >= 2).length;
  const lines = [
    `scout "${out.topic}": ${out.resources.length} resources kept (${twoPlus} with 2+ mentions, ${out.resources_dropped} single-mention rows with no signal dropped), ${out.threads.length} threads read, requests ${ok} ok / ${errors} error / ${skipped} skipped, ${out.budget.used_seconds}s of ${out.budget.seconds}s used${out.budget.exhausted ? ' (budget exhausted, partial results)' : ''}, thin_evidence=${out.thin_evidence}${out.error ? `, FAILED: ${out.error}` : ''}`,
    `wrote ${path}`,
  ];
  out.resources.slice(0, 5).forEach((r, i) => {
    lines.push(`${i + 1}. ${r.url} ${r.objective_score}/${r.max_objective} (breadth ${r.breadth}, depth ${r.depth}, curated ${r.curated.length ? 10 : 0}, freshness ${r.freshness.method === 'none' ? 'unknown' : r.freshness.last_modified?.slice(0, 10)}, hn ${r.hn_mentions_24m})`);
  });
  return lines.join('\n');
}

async function settle(ctx: ScoutContext, name: string, task: Promise<void>): Promise<void> {
  try {
    await task;
  } catch (err) {
    ctx.log(`[scout] ${name} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function runScout(options: CliOptions, log: (line: string) => void): Promise<ScoutOutput> {
  const nowMs = Date.now();
  const budgetMs = options.budgetSeconds * 1000;
  const verificationMs = Math.min(120_000, Math.max(30_000, budgetMs * 0.2));
  const finalDeadline = nowMs + budgetMs;
  const discoveryDeadline = Math.max(nowMs, finalDeadline - verificationMs);
  const http = new Http({ deadline: finalDeadline, log });
  const ctx: ScoutContext = {
    http,
    index: new ResourceIndex(),
    threads: new Map<string, Thread>(),
    limiters: createLimiters(http),
    discoveryDeadline,
    finalDeadline,
    nowMs,
    today: new Date(nowMs).toISOString().slice(0, 10),
    log,
    githubToken: process.env.GITHUB_TOKEN?.trim() || null,
  };
  log(`[scout] topic "${options.topic}", subreddits ${options.subreddits.join(', ') || 'none'}, keywords ${options.keywords.map((k) => `"${k}"`).join(' ')}, budget ${options.budgetSeconds}s (discovery ${Math.round((discoveryDeadline - nowMs) / 1000)}s, then verification)`);

  const discovery: Promise<void>[] = [
    settle(ctx, 'hn', scoutHn(ctx, options.keywords)),
    settle(ctx, 'stackexchange', scoutStackExchange(ctx, options.keywords, options.topic)),
    settle(ctx, 'devto', scoutDevto(ctx, options.topic)),
  ];
  if (options.subreddits.length > 0) discovery.push(settle(ctx, 'wikis', scoutWikis(ctx, options.subreddits)));
  if (options.reddit) {
    discovery.push(settle(ctx, 'reddit', runRedditPipeline(ctx, { subreddits: options.subreddits, keywords: options.keywords, maxThreads: options.maxThreads }).then(() => undefined)));
  }
  await Promise.all(discovery);
  log(`[scout] discovery done at ${Math.round((Date.now() - nowMs) / 1000)}s: ${ctx.index.size} resources, ${ctx.threads.size} threads read`);

  const candidates = verificationCandidates(ctx.index.all());
  log(`[scout] verifying ${candidates.length} candidates (2+ mentions, a reply mention, or curated)`);
  await Promise.all([
    settle(ctx, 'github', verifyGithub(ctx, candidates)),
    settle(ctx, 'youtube', verifyYoutube(ctx, candidates)),
    settle(ctx, 'head', verifyHead(ctx, candidates)),
    settle(ctx, 'hn lookups', hnLookups(ctx, candidates)),
  ]);
  const candidateUrls = new Set(candidates.map((d) => d.url));
  for (const d of ctx.index.all()) {
    if (d.freshness) continue;
    d.freshness = uncheckedFreshness(ctx.today, candidateUrls.has(d.url) ? (http.budgetExhausted ? 'not checked: budget exhausted' : 'not checked: over the per-run cap') : 'not checked: single mention, not a reply, not curated');
  }

  const usedSeconds = Math.round((Date.now() - nowMs) / 1000);
  return assembleOutput({
    topic: options.topic,
    subreddits: options.subreddits,
    keywords: options.keywords,
    budget: { seconds: options.budgetSeconds, used_seconds: usedSeconds, exhausted: http.budgetExhausted },
    sources: http.sources,
    threads: [...ctx.threads.values()],
    drafts: ctx.index.all(),
    nowMs,
  });
}

async function main(): Promise<number> {
  const options = parseCli(process.argv.slice(2));
  if ('error' in options) {
    process.stderr.write(`${options.error}\n`);
    return options.error === USAGE ? 0 : 2;
  }
  const log = (line: string): void => {
    process.stderr.write(`${line}\n`);
  };
  if (existsSync(options.out)) {
    unlinkSync(options.out);
    log(`[scout] removed the previous ${options.out}`);
  }
  process.stdout.write(`writing ${options.out}\n`);
  let out: ScoutOutput;
  try {
    out = await runScout(options, log);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`[scout] failed: ${message}`);
    out = assembleOutput({
      topic: options.topic,
      subreddits: options.subreddits,
      keywords: options.keywords,
      budget: { seconds: options.budgetSeconds, used_seconds: 0, exhausted: false },
      sources: [],
      threads: [],
      drafts: [],
      nowMs: Date.now(),
      error: message,
    });
    writeAtomically(options.out, formatOutput(out));
    process.stdout.write(`${summarise(out, options.out)}\n`);
    return 1;
  }
  writeAtomically(options.out, formatOutput(out));
  if (out.budget.exhausted) log('[scout] note: the budget ran out before every source was read; results are partial');
  process.stdout.write(`${summarise(out, options.out)}\n`);
  return 0;
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(realpathSync(entry)).href === import.meta.url;
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      process.stderr.write(`scout: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
      process.exitCode = 1;
    },
  );
}
