#!/usr/bin/env node
// Writes a checkpoint from the lessons it samples. Every rule in
// CHECKPOINT-FORMAT.md is mechanical, so no model writes it (ADR 0016).

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { isMain, parseCli, runCli, todayIso } from "./lib/cli.ts";
import { findItem, type Syllabus, type SyllabusItem } from "./lib/syllabus.ts";
import { requireWorkspace } from "./lib/workspace.ts";
import { sampledLesson, type SampledLesson } from "./context.ts";
import { describeItem, readSyllabus } from "./next-item.ts";

const USAGE = `usage: checkpoint.ts [workspace] <ID> [--force]

Writes checkpoints/<ID>-<slug>.md from the lessons the checkpoint samples:
up to ten retrieval prompts copied verbatim, about two thirds from its own
section and one third from the section before (the first checkpoint samples
only its own), interleaved across lessons; M is three quarters of N rounded
down; each sampled lesson gets one re-read pointer. Refuses to overwrite an
existing file unless --force. Prints one line naming the file.`;

const MAX_PROMPTS = 10;
const MIN_PROMPTS = 6;

export interface CheckpointPlan {
  prompts: { lesson: SampledLesson; index: number }[];
  own: number;
}

// Round-robin across lessons, taking prompts in order, until `count` are taken.
function roundRobin(lessons: SampledLesson[], count: number): { lesson: SampledLesson; index: number }[] {
  const out: { lesson: SampledLesson; index: number }[] = [];
  for (let round = 0; out.length < count; round++) {
    let took = false;
    for (const lesson of lessons) {
      if (out.length >= count) break;
      if (round < lesson.prompts.length) {
        out.push({ lesson, index: round });
        took = true;
      }
    }
    if (!took) break;
  }
  return out;
}

export function planCheckpoint(own: SampledLesson[], previous: SampledLesson[]): CheckpointPlan {
  const ownTotal = own.reduce((n, l) => n + l.prompts.length, 0);
  const prevTotal = previous.reduce((n, l) => n + l.prompts.length, 0);
  const n = Math.min(MAX_PROMPTS, ownTotal + prevTotal);
  if (n < MIN_PROMPTS) {
    throw new Error(`only ${n} retrieval prompts across the sampled lessons; a checkpoint needs ${MIN_PROMPTS}. Generate or finish more lessons first`);
  }
  const prevWanted = previous.length === 0 ? 0 : Math.min(prevTotal, n - Math.round((n * 2) / 3));
  const ownCount = Math.min(ownTotal, n - prevWanted);
  const prevCount = n - ownCount;
  const picked = [...roundRobin(own, ownCount), ...roundRobin(previous, prevCount)];
  // Interleave across every sampled lesson so neighbours come from different lessons.
  const queues = [...new Set(picked.map((p) => p.lesson))].map((lesson) => picked.filter((p) => p.lesson === lesson));
  const prompts: CheckpointPlan["prompts"] = [];
  for (let round = 0; prompts.length < picked.length; round++) {
    for (const q of queues) if (q[round]) prompts.push(q[round]);
  }
  return { prompts, own: ownCount };
}

function normalUrl(url: string): string {
  return url.replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();
}

// One place per lesson: Core idea when the lesson has one, else its
// Assignment; plus the assignment item the sampled answers cite most.
export function rereadLine(lesson: SampledLesson, indexes: number[]): string {
  const [label, anchor] = lesson.anchors.includes("#core-idea") ? ["Core idea", "#core-idea"] : ["Assignment", "#assignment"];
  const cited = new Map<number, number>();
  for (const i of indexes) {
    const answer = lesson.prompts[i]?.answer ?? "";
    for (const m of answer.matchAll(/\]\(([^)\s]+)\)/g)) {
      const at = lesson.assignment.findIndex((a) => a.url !== "" && normalUrl(a.url) === normalUrl(m[1]));
      if (at >= 0) cited.set(at, (cited.get(at) ?? 0) + 1);
    }
  }
  const best = [...cited.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
  const redo = lesson.assignment.length > 0 ? ` and redo assignment item ${best + 1}` : "";
  return `- ${lesson.id}: re-read [${label}](${lesson.file}${anchor})${redo}.`;
}

export function renderCheckpoint(item: SyllabusItem, plan: CheckpointPlan, generated = todayIso()): string {
  const n = plan.prompts.length;
  const m = Math.floor((n * 3) / 4);
  const lessons = [...new Set(plan.prompts.map((p) => p.lesson))];
  const out = [
    "---",
    `id: ${item.id}`,
    `title: ${JSON.stringify(item.title)}`,
    `section: ${item.section}`,
    `samples: [${lessons.map((l) => l.id).join(", ")}]`,
    `generated: ${generated}`,
    "---",
    `# ${item.title}`,
    "",
    `Before you look at the prompts, write how many of the ${n} you expect to answer from memory. Then attempt each without opening anything. Record the actual count. The gap between the two numbers is the point.`,
    "",
    `Predicted: ___ / ${n}`,
    "",
    "## Prompts",
    "",
    ...plan.prompts.map((p, i) => `${i + 1}. [${p.lesson.prompts[p.index].text}](${p.lesson.file}#retrieval-practice) (${p.lesson.id})`),
    "",
    `Actual: ___ / ${n}`,
    "",
    `## If you scored below ${m}`,
    "",
    ...lessons.map((l) => rereadLine(l, plan.prompts.filter((p) => p.lesson === l).map((p) => p.index))),
  ];
  return out.join("\n") + "\n";
}

export function buildCheckpoint(workspace: string, syllabus: Syllabus, id: string): { item: SyllabusItem; path: string; text: string; plan: CheckpointPlan } {
  const item = findItem(syllabus.items, id);
  if (!item) throw new Error(`no item ${id} in the syllabus`);
  if (item.type !== "checkpoint") throw new Error(`${item.id} is a ${item.type}, not a checkpoint`);
  const info = describeItem(workspace, syllabus, item);
  const load = (ids: string[]): SampledLesson[] =>
    ids.map((lid) => sampledLesson(workspace, syllabus, lid)).filter((l): l is SampledLesson => l !== null && l.prompts.length > 0);
  const plan = planCheckpoint(load(info.samples?.section ?? []), load(info.samples?.previousSection ?? []));
  return { item, path: info.path, text: renderCheckpoint(item, plan), plan };
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), { force: { type: "boolean" } });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const positionals = args.positionals;
  const id = (positionals.length >= 2 ? positionals[1] : positionals[0])?.trim().toUpperCase();
  if (!id) throw Object.assign(new Error("expected <ID>"), { code: 2 });
  const workspace = requireWorkspace(positionals.length >= 2 ? positionals[0] : process.cwd());
  const { path, text, plan } = buildCheckpoint(workspace, readSyllabus(workspace), id);
  if (existsSync(path) && !args.values.force) throw new Error(`${relative(workspace, path)} exists; pass --force to rewrite it`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  const lessons = [...new Set(plan.prompts.map((p) => p.lesson.id))];
  console.log(`wrote ${relative(workspace, path)}: ${plan.prompts.length} prompts, ${plan.own} from its own section, from ${lessons.join(", ")}`);
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
