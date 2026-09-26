#!/usr/bin/env node
// Prints the digest a research pass needs for one item, so the pass reads one
// short block instead of the profile, the syllabus, the ledger, the scout
// file and the previous items in full (ADR 0013).

import { existsSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import { parseLedger, readFetched, type Ledger } from "./lib/ledger.ts";
import { findSection, listItems, splitDoc, type ListItem } from "./lib/sections.ts";
import { headingAnchors } from "./lib/markdown.ts";
import { readSidecar } from "./lib/sidecar.ts";
import { findItem, itemsInSection, parseSyllabus, type Syllabus, type SyllabusItem } from "./lib/syllabus.ts";
import { findItemFile, readProfile, requireWorkspace, sidecarPath, type Profile } from "./lib/workspace.ts";
import { describeItem, type ItemInfo } from "./next-item.ts";

const USAGE = `usage: context.ts [workspace] <ID | syllabus> [--top N] [--json]
       context.ts [workspace] quiz [<lesson ID> | <section number>] [--cap N] [--json]

Prints the digest for a research pass: the learner's profile, the section
plan, the previous items' overviews and prompts, the ledger, and the scout's
top resources for the item (--top, default 12; 25 for the syllabus). A
checkpoint has no digest: checkpoint.ts writes it. "quiz" prints up to
--cap (default 10) retrieval prompts with their answers and sources for the
scope: one lesson, one section's lessons, or every done lesson (generated ones
when none is done), interleaved so neighbours come from different lessons.
Markdown by default, --json for the same data as JSON.`;

interface ScoutResource {
  url: string;
  title: string | null;
  breadth: number;
  depth: number;
  curated: string[];
  freshness: { last_modified: string | null };
  hn_mentions_24m: number;
  objective_score: number;
  max_objective: number;
  threads?: number;
  newest_mention?: string | null;
  excerpt?: string;
  author_only?: boolean;
}

interface Scout {
  topic?: string;
  generated?: string;
  thin_evidence?: boolean;
  resources?: ScoutResource[];
}

interface PreviousDigest {
  id: string;
  type: string;
  title: string;
  status: string;
  overview: string[];
  prompts: string[];
  introduction: string;
}

export interface SampledLesson {
  id: string;
  section: number;
  title: string;
  file: string;
  prompts: { text: string; answer: string }[];
  // Heading anchors a re-read pointer can name, and the assignment's resources in order.
  anchors: string[];
  assignment: { title: string; url: string }[];
}

export interface QuizPrompt {
  lesson: string;
  title: string;
  n: number;
  text: string;
  answer: string;
  source: string;
}

export interface Quiz {
  scope: string;
  lessons: string[];
  total: number;
  prompts: QuizPrompt[];
}

export interface Digest {
  item: ItemInfo | null;
  kind: "item" | "syllabus";
  profile: { level: string; researchModel: string; goal: string; experience: string; notes: string; topic: string };
  section: { number: number; title: string; items: { id: string; type: string; title: string; status: string; hours: number | null }[] } | null;
  previous: PreviousDigest[];
  ledger: { rows: { score: number | null; type: string; title: string; url: string; freshness: string; version: string; usedIn: string[] }[]; excluded: { title: string; reason: string }[]; fetched: number | null; structureSources: string[] };
  scout: { total: number; thin: boolean; generated: string; resources: { score: number; max: number; title: string | null; url: string; threads: number; newest: string | null; curated: string[]; updated: string | null; hn: number; excerpt: string; authorOnly: boolean }[] } | null;
}

const STOPWORDS = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "your", "how", "what", "why", "when", "does", "are", "its", "one", "two", "section", "checkpoint", "project", "lesson"]);

function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function stripLink(text: string): string {
  return text.replace(/^\[([^\]]+)\]\([^)]*\)\s*$/, "$1").trim();
}

function itemText(it: ListItem): string {
  return [it.text, ...it.continuation].join(" ").replace(/\s+/g, " ").trim();
}

function firstParagraph(lines: string[]): string {
  const out: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (out.length > 0) break;
      continue;
    }
    out.push(line.trim());
  }
  return out.join(" ");
}

function previousDigest(workspace: string, syllabus: Syllabus, id: string): PreviousDigest | null {
  const item = findItem(syllabus.items, id);
  if (!item) return null;
  const file = findItemFile(workspace, item.id, item.type);
  if (!file) return null;
  const doc = splitDoc(readFileSync(file, "utf8"));
  const overview = findSection(doc, "Lesson overview");
  const retrieval = findSection(doc, "Retrieval practice");
  const intro = findSection(doc, "Introduction");
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    status: item.status,
    overview: overview ? listItems(overview).map((it) => it.text.trim()) : [],
    prompts: retrieval ? listItems(retrieval).filter((it) => it.ordered).map((it) => stripLink(it.text)) : [],
    introduction: item.type === "lesson" ? "" : intro ? firstParagraph(intro.lines) : "",
  };
}

export function sampledLesson(workspace: string, syllabus: Syllabus, id: string): SampledLesson | null {
  const item = findItem(syllabus.items, id);
  if (!item || item.type !== "lesson") return null;
  const file = findItemFile(workspace, item.id, item.type);
  if (!file) return null;
  const text = readFileSync(file, "utf8");
  const doc = splitDoc(text);
  const retrieval = findSection(doc, "Retrieval practice");
  const assignment = findSection(doc, "Assignment");
  const sidecar = readSidecar(sidecarPath(file));
  const prompts = retrieval ? listItems(retrieval).filter((it) => it.ordered) : [];
  return {
    id: item.id,
    section: item.section,
    title: item.title,
    file: `../lessons/${basename(file)}`,
    prompts: prompts.map((it, i) => ({ text: stripLink(it.text), answer: sidecar?.retrieval[i] ? itemText(sidecar.retrieval[i]) : "" })),
    anchors: headingAnchors(doc.lines.slice(doc.frontmatterLines).join("\n")).map((a) => `#${a}`),
    assignment: assignment
      ? listItems(assignment)
          .filter((it) => it.ordered)
          .map((it) => {
            const link = it.text.replace(/^\*\*|\*\*\s*$/g, "").trim();
            return { title: stripLink(link), url: /^\[[^\]]+\]\(([^)\s]+)\)/.exec(link)?.[1] ?? "" };
          })
      : [],
  };
}

// The lessons a quiz scope names: one ID, one section, or every done lesson
// (the generated ones when none is done yet).
function quizLessons(syllabus: Syllabus, scope: string | null): { label: string; ids: string[] } {
  const lessons = syllabus.items.filter((it) => it.type === "lesson");
  if (scope && /^[Ll]\d{2}$/.test(scope)) return { label: scope.toUpperCase(), ids: [scope.toUpperCase()] };
  if (scope && /^\d+$/.test(scope)) return { label: `section ${scope}`, ids: lessons.filter((it) => it.section === Number(scope) && it.status !== "planned").map((it) => it.id) };
  const done = lessons.filter((it) => it.status === "done").map((it) => it.id);
  if (done.length > 0) return { label: "every finished lesson", ids: done };
  return { label: "every generated lesson (none is done yet)", ids: lessons.filter((it) => it.status === "generated").map((it) => it.id) };
}

// Up to `cap` prompts, round-robin across the lessons so no two neighbours
// share one, starting each lesson at a different prompt on different days.
export function buildQuiz(workspace: string, scope: string | null, cap = 10, day = Math.floor(Date.now() / 86_400_000)): Quiz {
  const syllabusFile = join(workspace, "syllabus.md");
  if (!existsSync(syllabusFile)) throw new Error(`no syllabus.md in ${workspace}; run /dojo-plan first`);
  const syllabus = parseSyllabus(readFileSync(syllabusFile, "utf8"));
  const { label, ids } = quizLessons(syllabus, scope);
  if (scope && ids.length === 1 && !findItem(syllabus.items, ids[0])) throw new Error(`no item ${scope} in the syllabus`);
  const lessons = ids.map((id) => sampledLesson(workspace, syllabus, id)).filter((l): l is SampledLesson => l !== null && l.prompts.length > 0);
  const queues = lessons.map((l) => {
    const offset = day % l.prompts.length;
    const rotated = [...l.prompts.slice(offset), ...l.prompts.slice(0, offset)].map((p, i) => ({ p, n: ((offset + i) % l.prompts.length) + 1 }));
    return { lesson: l, rotated };
  });
  const total = lessons.reduce((sum, l) => sum + l.prompts.length, 0);
  const prompts: QuizPrompt[] = [];
  for (let round = 0; prompts.length < Math.min(cap, total); round++) {
    for (const q of queues) {
      if (prompts.length >= cap) break;
      const entry = q.rotated[round];
      if (!entry) continue;
      prompts.push({ lesson: q.lesson.id, title: q.lesson.title, n: entry.n, text: entry.p.text, answer: entry.p.answer, source: `${q.lesson.file}#retrieval-practice` });
    }
  }
  return { scope: label, lessons: lessons.map((l) => l.id), total, prompts };
}

export function formatQuiz(q: Quiz): string {
  const out = [`# Quiz: ${q.scope}, ${q.prompts.length} of ${q.total} prompts from ${q.lessons.join(", ") || "no lessons"}`, ""];
  q.prompts.forEach((p, i) => {
    out.push(`${i + 1}. (${p.lesson} prompt ${p.n}) ${p.text}`, `   Answer: ${p.answer || "missing"}`, `   Source: ${p.source}`);
  });
  return out.join("\n").trimEnd() + "\n";
}

function readScout(workspace: string): Scout | null {
  const path = join(workspace, ".dojo", "scout.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Scout;
  } catch {
    return null;
  }
}

function scoutDigest(scout: Scout | null, top: number, title: string): Digest["scout"] {
  if (!scout) return null;
  const words = titleWords(title);
  const resources = [...(scout.resources ?? [])]
    .map((r) => {
      const hay = `${r.title ?? ""} ${r.url}`.toLowerCase();
      const bonus = words.some((w) => hay.includes(w)) ? 10 : 0;
      return { r, rank: (r.objective_score ?? 0) + bonus };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, top)
    .map(({ r }) => ({
      score: r.objective_score ?? 0,
      max: r.max_objective ?? 0,
      title: r.title,
      url: r.url,
      threads: r.threads ?? 0,
      newest: r.newest_mention ?? null,
      curated: r.curated ?? [],
      updated: r.freshness?.last_modified ?? null,
      hn: r.hn_mentions_24m ?? 0,
      excerpt: r.excerpt ?? "",
      authorOnly: r.author_only === true,
    }));
  return { total: scout.resources?.length ?? 0, thin: scout.thin_evidence === true, generated: scout.generated ?? "", resources };
}

function ledgerDigest(workspace: string, syllabus: Syllabus): Digest["ledger"] {
  const path = join(workspace, "ledger.md");
  let ledger: Ledger | null = null;
  if (existsSync(path)) {
    try {
      ledger = parseLedger(readFileSync(path, "utf8"));
    } catch {
      ledger = null;
    }
  }
  const fetched = readFetched(workspace);
  const sources = syllabus.data.structure_sources;
  return {
    rows: (ledger?.rows ?? []).map((r) => ({ score: r.score, type: r.type, title: r.title, url: r.url, freshness: r.freshness, version: r.version, usedIn: r.usedIn })),
    excluded: (ledger?.excluded ?? []).map((r) => ({ title: r.title, reason: r.reason })),
    fetched: fetched ? fetched.size : null,
    structureSources: Array.isArray(sources) ? sources.map(String) : [],
  };
}

export function buildDigest(workspace: string, target: string, top?: number): Digest {
  const profile: Profile = readProfile(workspace);
  const syllabusFile = join(workspace, "syllabus.md");
  const syllabus = existsSync(syllabusFile) ? parseSyllabus(readFileSync(syllabusFile, "utf8")) : null;
  const base = {
    profile: {
      level: profile.level,
      researchModel: profile.researchModel,
      goal: profile.goal,
      experience: profile.experience,
      notes: profile.notes,
      topic: profile.topic,
    },
  };
  if (target === "syllabus") {
    return {
      ...base,
      kind: "syllabus",
      item: null,
      section: null,
      previous: [],
      ledger: syllabus ? ledgerDigest(workspace, syllabus) : { rows: [], excluded: [], fetched: null, structureSources: [] },
      scout: scoutDigest(readScout(workspace), top ?? 25, profile.topic),
    };
  }
  if (!syllabus) throw new Error(`no syllabus.md in ${workspace}; run /dojo-plan first`);
  const item: SyllabusItem | null = findItem(syllabus.items, target);
  if (!item) throw new Error(`no item ${target} in the syllabus`);
  if (item.type === "checkpoint") throw new Error(`${item.id} is a checkpoint, which needs no digest; run checkpoint.ts ${item.id} to write it`);
  const info = describeItem(workspace, syllabus, item);
  const section = {
    number: item.section,
    title: item.sectionTitle,
    items: itemsInSection(syllabus.items, item.section).map((it) => ({ id: it.id, type: it.type, title: it.title, status: it.status, hours: it.hours })),
  };
  const previous = info.previous
    .slice(-2)
    .map((id) => previousDigest(workspace, syllabus, id))
    .filter((p): p is PreviousDigest => p !== null);
  return {
    ...base,
    kind: "item",
    item: info,
    section,
    previous,
    ledger: ledgerDigest(workspace, syllabus),
    scout: scoutDigest(readScout(workspace), top ?? 12, item.title),
  };
}

export function formatDigest(workspace: string, d: Digest): string {
  const out: string[] = [];
  const p = d.profile;
  if (d.kind === "syllabus" || !d.item) {
    out.push(`# Digest for the syllabus pass: ${p.topic}`);
  } else {
    const it = d.item;
    out.push(`# Digest for ${it.id} "${it.title}" (${it.type}, section ${it.section}: ${it.sectionTitle})`);
    const files = [`target ${relative(workspace, it.path)}`];
    if (it.sidecar) files.push(`sidecar ${relative(workspace, it.sidecar)}`);
    if (it.starter) files.push(`starter ${relative(workspace, it.starter)}/`);
    out.push(`Status ${it.status}. Files: ${files.join(", ")}.`);
  }
  out.push(`Level ${p.level}, research model ${p.researchModel}.`, "");
  out.push("## Learner", `Goal: ${p.goal || "not given"}`, `Experience: ${p.experience || "not given"}`, `Notes: ${p.notes || "none"}`, "");

  if (d.section) {
    out.push(`## Section ${d.section.number}: ${d.section.title}`, "| ID | Type | Title | Hours | Status |", "|----|------|-------|-------|--------|");
    for (const it of d.section.items) out.push(`| ${it.id}${d.item && it.id === d.item.id ? " (this)" : ""} | ${it.type} | ${it.title} | ${it.hours ?? ""} | ${it.status} |`);
    out.push("");
  }

  if (d.previous.length > 0) {
    out.push("## Previous items in this section");
    for (const prev of d.previous) {
      out.push(`### ${prev.id} ${prev.title} (${prev.type}, ${prev.status})`);
      if (prev.overview.length > 0) out.push(`Overview: ${prev.overview.join(" ")}`);
      if (prev.prompts.length > 0) out.push(`Prompts: ${prev.prompts.map((t, i) => `${i + 1}. ${t}`).join(" ")}`);
      if (prev.introduction) out.push(`Introduction: ${prev.introduction}`);
      out.push("");
    }
  }

  out.push(`## Ledger (${d.ledger.rows.length} rows${d.ledger.fetched === null ? "" : `, ${d.ledger.fetched} URLs fetched so far`})`);
  if (d.ledger.rows.length > 0) {
    out.push("| Score | Type | Resource | Freshness | Version | Used in |", "|-------|------|----------|-----------|---------|---------|");
    for (const r of d.ledger.rows) out.push(`| ${r.score ?? ""} | ${r.type} | [${r.title}](${r.url}) | ${r.freshness} | ${r.version} | ${r.usedIn.join(", ")} |`);
  }
  for (const e of d.ledger.excluded) out.push(`- Excluded: ${e.title}: ${e.reason}`);
  if (d.ledger.structureSources.length > 0) out.push(`Structure sources: ${d.ledger.structureSources.join(", ")}`);
  out.push("");
  if (d.scout) {
    out.push(`## Scout: top ${d.scout.resources.length} of ${d.scout.total} resources (thin evidence: ${d.scout.thin}; generated ${d.scout.generated})`);
    out.push("Threads is how many distinct threads or pages named it; Newest is the latest dated mention; the excerpt is the best-ranked reply's line. \"single author\" marks the rubric's self-promotion penalty.");
    out.push("| Score | Resource | Threads | Newest | Curated | Updated | HN | Excerpt |", "|-------|----------|---------|--------|---------|---------|----|---------|");
    for (const r of d.scout.resources) {
      const flag = r.authorOnly ? " (single author)" : "";
      out.push(`| ${r.score}/${r.max} | [${r.title ?? r.url}](${r.url})${flag} | ${r.threads} | ${r.newest ?? "unknown"} | ${r.curated.join("; ")} | ${r.updated ?? "unknown"} | ${r.hn} | ${r.excerpt.replace(/\|/g, "\\|")} |`);
    }
  } else {
    out.push("## Scout: no .dojo/scout.json; research from the ledger and the structure sources");
  }
  out.push("");
  return out.join("\n").trimEnd() + "\n";
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), { top: { type: "string" }, cap: { type: "string" } });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const positionals = args.positionals;
  const quizAt = positionals.findIndex((p) => p === "quiz");
  if (quizAt === 0 || quizAt === 1) {
    const workspace = requireWorkspace(quizAt === 1 ? positionals[0] : process.cwd());
    const cap = typeof args.values.cap === "string" ? Number(args.values.cap) : 10;
    const quiz = buildQuiz(workspace, positionals[quizAt + 1] ?? null, Number.isFinite(cap) && cap > 0 ? cap : 10);
    if (args.values.json) console.log(JSON.stringify(quiz));
    else process.stdout.write(formatQuiz(quiz));
    return 0;
  }
  const target = positionals.length >= 2 ? positionals[1] : positionals[0];
  if (!target) throw Object.assign(new Error("expected <ID | syllabus | quiz>"), { code: 2 });
  const workspace = requireWorkspace(positionals.length >= 2 ? positionals[0] : process.cwd());
  const top = typeof args.values.top === "string" ? Number(args.values.top) : undefined;
  const digest = buildDigest(workspace, target, top && top > 0 ? top : undefined);
  if (args.values.json) console.log(JSON.stringify(digest, null, 2));
  else process.stdout.write(formatDigest(workspace, digest));
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
