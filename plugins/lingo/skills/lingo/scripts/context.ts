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
import { parsePrompt, promptLine } from "./lib/prompts.ts";
import { readMistakes, readTalkRecords } from "./lib/records.ts";
import { readSidecar } from "./lib/sidecar.ts";
import { plainCell, readLessonWords } from "./lib/words.ts";
import { DATA_DIR, authoredLanguage } from "./lib/constants.ts";
import { findItem, itemsInSection, parseSyllabus, type Syllabus, type SyllabusItem } from "./lib/syllabus.ts";
import { findItemFile, readProfile, requireWorkspace, sidecarPath, type Profile } from "./lib/workspace.ts";
import { describeItem, type ItemInfo } from "./next-item.ts";

const USAGE = `usage: context.ts [workspace] <ID | syllabus> [--top N] [--json]
       context.ts [workspace] quiz [<lesson ID> | <section number>] [--cap N] [--words N] [--mistakes N] [--json]
       context.ts [workspace] talk [<item ID> | <section number> | free] [--json]

Prints the digest for a research pass: the learner's profile, the section
plan, the previous items' overviews and prompts, the words taught so far, the
ledger, and the scout's top resources for the item (--top, default 12; 25 for
the syllabus). A checkpoint has no digest: checkpoint.ts writes it.
"quiz" prints up to --cap (default 8) retrieval prompts with their answers and
sources for the scope (one lesson, one section's lessons, or every done lesson,
the generated ones when none is done), interleaved so neighbours come from
different lessons, then up to --words (default 5) words from the same lessons
and up to --mistakes (default 3) uncleared mistakes from mistakes.md, oldest
first. "talk" prints what a conversation practises: the scope's lessons with
their overviews and words, the task it rehearses, the per-skill levels, the
last talk's focus and the open mistakes. Markdown by default, --json for the
same data as JSON.`;

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
  prompts: { label: string; text: string; answer: string }[];
  words: { word: string; reading: string; meaning: string }[];
  // Heading anchors a re-read pointer can name, and the assignment's resources in order.
  anchors: string[];
  assignment: { title: string; url: string }[];
}

export interface QuizPrompt {
  lesson: string;
  title: string;
  n: number;
  label: string;
  text: string;
  answer: string;
  source: string;
}

export interface QuizWord {
  lesson: string;
  meaning: string;
  word: string;
  reading: string;
  source: string;
}

export interface QuizMistake {
  n: number;
  lesson: string;
  wrote: string;
  better: string;
  why: string;
}

export interface Quiz {
  scope: string;
  lessons: string[];
  total: number;
  prompts: QuizPrompt[];
  words: QuizWord[];
  mistakes: QuizMistake[];
}

export interface Digest {
  item: ItemInfo | null;
  kind: "item" | "syllabus";
  profile: Learner;
  section: { number: number; title: string; items: { id: string; type: string; title: string; status: string; hours: number | null }[] } | null;
  previous: PreviousDigest[];
  // Every word earlier lessons taught, so a new lesson does not repeat them.
  taught: { id: string; words: string[] }[];
  ledger: { rows: { score: number | null; type: string; title: string; url: string; freshness: string; level: string; usedIn: string[] }[]; excluded: { title: string; reason: string }[]; fetched: number | null; structureSources: string[] };
  scout: { total: number; thin: boolean; generated: string; resources: { score: number; max: number; title: string | null; url: string; threads: number; newest: string | null; curated: string[]; updated: string | null; hn: number; excerpt: string; authorOnly: boolean }[] } | null;
}

export interface Learner {
  language: string;
  languageCode: string;
  nativeLanguage: string;
  level: string;
  skills: Record<string, string>;
  targetLevel: string;
  exam: string;
  researchModel: string;
  goal: string;
  experience: string;
  focus: string;
  notes: string;
}

function learner(profile: Profile): Learner {
  return {
    language: profile.language,
    languageCode: profile.languageCode,
    nativeLanguage: profile.nativeLanguage,
    level: profile.level,
    skills: profile.skills,
    targetLevel: profile.targetLevel,
    exam: profile.exam,
    researchModel: profile.researchModel,
    goal: profile.goal,
    experience: profile.experience,
    focus: profile.focus,
    notes: profile.notes,
  };
}

const STOPWORDS = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "your", "how", "what", "why", "when", "does", "are", "its", "one", "two", "section", "checkpoint", "task", "lesson"]);

function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function stripLink(text: string): string {
  return text.replace(/^\[([^\]]+)\]\([^)]*\)\s*$/, "$1").trim();
}

// "Say: text" for a labelled prompt, else the link text.
function promptText(line: string): string {
  const p = parsePrompt(line);
  return p ? promptLine(p) : stripLink(line);
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
    prompts: retrieval ? listItems(retrieval).filter((it) => it.ordered).map((it) => promptText(it.text)) : [],
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
    prompts: prompts.map((it, i) => {
      const p = parsePrompt(it.text);
      return { label: p?.label ?? "", text: p?.text ?? stripLink(it.text), answer: sidecar?.retrieval[i] ? itemText(sidecar.retrieval[i]) : "" };
    }),
    words: (readLessonWords(file)?.rows ?? []).map((r) => ({ word: plainCell(r.word), reading: plainCell(r.reading), meaning: plainCell(r.meaning) })),
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
export function buildQuiz(workspace: string, scope: string | null, cap = 8, day = Math.floor(Date.now() / 86_400_000), wordCap = 5, mistakeCap = 3): Quiz {
  const syllabusFile = join(workspace, "syllabus.md");
  if (!existsSync(syllabusFile)) throw new Error(`no syllabus.md in ${workspace}; run /lingo-plan first`);
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
      prompts.push({ lesson: q.lesson.id, title: q.lesson.title, n: entry.n, label: entry.p.label, text: entry.p.text, answer: entry.p.answer, source: `${q.lesson.file}#retrieval-practice` });
    }
  }
  const wordQueues = lessons.filter((l) => l.words.length > 0).map((l) => {
    const offset = (day * 3) % l.words.length;
    return { lesson: l, rotated: [...l.words.slice(offset), ...l.words.slice(0, offset)] };
  });
  const words: QuizWord[] = [];
  const wordTotal = wordQueues.reduce((sum, q) => sum + q.rotated.length, 0);
  for (let round = 0; words.length < Math.min(wordCap, wordTotal); round++) {
    for (const q of wordQueues) {
      if (words.length >= wordCap) break;
      const w = q.rotated[round];
      if (w) words.push({ lesson: q.lesson.id, meaning: w.meaning, word: w.word, reading: w.reading, source: `${q.lesson.file}#words` });
    }
  }
  const mistakes = readMistakes(workspace)
    .filter((m) => m.cleared === "")
    .slice(0, mistakeCap)
    .map((m) => ({ n: m.n, lesson: m.lesson, wrote: m.wrote, better: m.better, why: m.why }));
  return { scope: label, lessons: lessons.map((l) => l.id), total, prompts, words, mistakes };
}

export function formatQuiz(q: Quiz): string {
  const size = q.prompts.length + q.words.length + q.mistakes.length;
  const out = [`# Quiz: ${q.scope}, ${size} items from ${q.lessons.join(", ") || "no lessons"}: ${q.prompts.length} of ${q.total} prompts, ${q.words.length} words, ${q.mistakes.length} mistakes`, ""];
  let i = 0;
  if (q.prompts.length > 0) out.push("## Prompts");
  for (const p of q.prompts) {
    out.push(`${++i}. (${p.lesson} prompt ${p.n}) ${p.label ? `${p.label}: ` : ""}${p.text}`, `   Answer: ${p.answer || "missing"}`, `   Source: ${p.source}`);
  }
  if (q.words.length > 0) out.push("", "## Words: show the meaning, the learner gives the word");
  for (const w of q.words) {
    out.push(`${++i}. (${w.lesson}) ${w.meaning}`, `   Answer: ${w.word}${w.reading && w.reading !== "-" ? ` (${w.reading})` : ""}`, `   Source: ${w.source}`);
  }
  if (q.mistakes.length > 0) out.push("", "## Mistakes: show what the learner once wrote, the learner fixes it; pass the numbers they fix to quiz-log.ts --cleared");
  for (const m of q.mistakes) {
    out.push(`${++i}. (mistake ${m.n}${m.lesson && m.lesson !== "-" ? `, ${m.lesson}` : ""}) ${m.wrote}`, `   Answer: ${m.better}`, `   Why: ${m.why || "not recorded"}`);
  }
  return out.join("\n").trimEnd() + "\n";
}

function readScout(workspace: string): Scout | null {
  const path = join(workspace, DATA_DIR, "scout.json");
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
    rows: (ledger?.rows ?? []).map((r) => ({ score: r.score, type: r.type, title: r.title, url: r.url, freshness: r.freshness, level: r.level, usedIn: r.usedIn })),
    excluded: (ledger?.excluded ?? []).map((r) => ({ title: r.title, reason: r.reason })),
    fetched: fetched ? fetched.size : null,
    structureSources: Array.isArray(sources) ? sources.map(String) : [],
  };
}

// The words of every lesson before the item, in course order.
function taughtBefore(workspace: string, syllabus: Syllabus, item: SyllabusItem): { id: string; words: string[] }[] {
  const out: { id: string; words: string[] }[] = [];
  for (const other of syllabus.items) {
    if (other === item) break;
    if (other.type !== "lesson") continue;
    const file = findItemFile(workspace, other.id, other.type);
    const rows = file ? readLessonWords(file)?.rows ?? [] : [];
    if (rows.length > 0) out.push({ id: other.id, words: rows.map((r) => plainCell(r.word)) });
  }
  return out;
}

export function buildDigest(workspace: string, target: string, top?: number): Digest {
  const profile: Profile = readProfile(workspace);
  const syllabusFile = join(workspace, "syllabus.md");
  const syllabus = existsSync(syllabusFile) ? parseSyllabus(readFileSync(syllabusFile, "utf8")) : null;
  const base = { profile: learner(profile) };
  if (target === "syllabus") {
    return {
      ...base,
      kind: "syllabus",
      item: null,
      section: null,
      previous: [],
      taught: [],
      ledger: syllabus ? ledgerDigest(workspace, syllabus) : { rows: [], excluded: [], fetched: null, structureSources: [] },
      scout: scoutDigest(readScout(workspace), top ?? 25, profile.language),
    };
  }
  if (!syllabus) throw new Error(`no syllabus.md in ${workspace}; run /lingo-plan first`);
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
    taught: taughtBefore(workspace, syllabus, item),
    ledger: ledgerDigest(workspace, syllabus),
    scout: scoutDigest(readScout(workspace), top ?? 12, item.title),
  };
}

export function formatDigest(workspace: string, d: Digest): string {
  const out: string[] = [];
  const p = d.profile;
  if (d.kind === "syllabus" || !d.item) {
    out.push(`# Digest for the syllabus pass: ${p.language}`);
  } else {
    const it = d.item;
    out.push(`# Digest for ${it.id} "${it.title}" (${it.type}, section ${it.section}: ${it.sectionTitle})`);
    const files = [`target ${relative(workspace, it.path)}`];
    if (it.sidecar) files.push(`sidecar ${relative(workspace, it.sidecar)}`);
    out.push(`Status ${it.status}. Files: ${files.join(", ")}.`);
  }
  out.push(learnerLines(p).join("\n"), "");
  if (d.kind === "item") {
    const parts = ["introduction", "overview", "core", "assignment", "retrieval", "sidecar", "task"] as const;
    out.push(`Authored language at ${p.level}: ${parts.map((part) => `${part} ${authoredLanguage(p.level, part) === "native" ? p.nativeLanguage : p.language}`).join(", ")}.`, "");
  }

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

  if (d.taught.length > 0) {
    const total = d.taught.reduce((n, t) => n + t.words.length, 0);
    out.push(`## Words already taught (${total}); do not teach these again`);
    for (const t of d.taught) out.push(`${t.id}: ${t.words.join(", ")}`);
    out.push("");
  }

  out.push(`## Ledger (${d.ledger.rows.length} rows${d.ledger.fetched === null ? "" : `, ${d.ledger.fetched} URLs fetched so far`})`);
  if (d.ledger.rows.length > 0) {
    out.push("| Score | Type | Resource | Freshness | Level | Used in |", "|-------|------|----------|-----------|-------|---------|");
    for (const r of d.ledger.rows) out.push(`| ${r.score ?? ""} | ${r.type} | [${r.title}](${r.url}) | ${r.freshness} | ${r.level} | ${r.usedIn.join(", ")} |`);
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
    out.push(`## Scout: no ${DATA_DIR}/scout.json; research from the ledger and the structure sources`);
  }
  out.push("");
  return out.join("\n").trimEnd() + "\n";
}

function learnerLines(p: Learner): string[] {
  const skills = Object.entries(p.skills).map(([k, v]) => `${k} ${v}`).join(", ");
  return [
    `${p.language} (${p.languageCode || "no language code"}) for a native ${p.nativeLanguage} speaker. Placement ${p.level} (${skills}), target ${p.targetLevel || "not set"}${p.exam ? `, exam ${p.exam}` : ""}. Research model ${p.researchModel}.`,
    "",
    "## Learner",
    `Goal: ${p.goal || "not given"}`,
    `Experience: ${p.experience || "not given"}`,
    `Focus: ${p.focus || "not given"}`,
    `Notes: ${p.notes || "none"}`,
  ];
}

export interface TalkDigest {
  scope: string;
  profile: Learner;
  lessons: { id: string; title: string; overview: string[]; words: { word: string; meaning: string }[] }[];
  task: { id: string; title: string; introduction: string; assignment: string[] } | null;
  lastFocus: string;
  mistakes: QuizMistake[];
}

// What a /lingo-talk session practises: the scope's lessons and words, the
// task it rehearses, the last talk's focus and the open mistakes.
export function buildTalk(workspace: string, scope: string | null): TalkDigest {
  const profile = readProfile(workspace);
  const syllabusFile = join(workspace, "syllabus.md");
  if (!existsSync(syllabusFile)) throw new Error(`no syllabus.md in ${workspace}; run /lingo-plan first`);
  const syllabus = parseSyllabus(readFileSync(syllabusFile, "utf8"));
  const written = (it: SyllabusItem) => it.status !== "planned";
  let label = "free";
  let lessonIds: string[] = [];
  let taskItem: SyllabusItem | null = null;
  const fromItem = (item: SyllabusItem) => {
    label = item.id;
    if (item.type === "lesson") lessonIds = [item.id];
    else if (item.type === "checkpoint") lessonIds = itemsInSection(syllabus.items, item.section).filter((it) => it.type === "lesson" && written(it)).map((it) => it.id);
    else {
      taskItem = item;
      const file = findItemFile(workspace, item.id, item.type);
      const reuses = file ? splitDoc(readFileSync(file, "utf8")).data.reuses : undefined;
      lessonIds = Array.isArray(reuses) ? reuses.map(String) : itemsInSection(syllabus.items, item.section).filter((it) => it.type === "lesson" && written(it)).map((it) => it.id);
    }
  };
  if (scope === null) {
    const now = [...syllabus.items].reverse().find((it) => it.status === "generated") ?? [...syllabus.items].reverse().find((it) => it.status === "done");
    if (now) fromItem(now);
  } else if (/^\d+$/.test(scope)) {
    label = `section ${scope}`;
    const rows = syllabus.items.filter((it) => it.section === Number(scope) && written(it));
    lessonIds = rows.filter((it) => it.type === "lesson").map((it) => it.id);
    taskItem = rows.find((it) => it.type !== "lesson" && it.type !== "checkpoint") ?? null;
  } else if (scope.toLowerCase() !== "free") {
    const item = findItem(syllabus.items, scope.toUpperCase());
    if (!item) throw new Error(`no item ${scope} in the syllabus`);
    fromItem(item);
  }
  const lessons = lessonIds
    .map((id) => {
      const item = findItem(syllabus.items, id);
      const file = item ? findItemFile(workspace, item.id, item.type) : null;
      if (!item || !file) return null;
      const doc = splitDoc(readFileSync(file, "utf8"));
      const overview = findSection(doc, "Lesson overview");
      return {
        id,
        title: item.title,
        overview: overview ? listItems(overview).map((it) => it.text.trim()) : [],
        words: (readLessonWords(file)?.rows ?? []).map((r) => ({ word: plainCell(r.word), meaning: plainCell(r.meaning) })),
      };
    })
    .filter((l): l is TalkDigest["lessons"][number] => l !== null);
  let task: TalkDigest["task"] = null;
  const chosen = taskItem as SyllabusItem | null;
  if (chosen) {
    const file = findItemFile(workspace, chosen.id, chosen.type);
    if (file) {
      const doc = splitDoc(readFileSync(file, "utf8"));
      const intro = findSection(doc, "Introduction");
      const assignment = findSection(doc, "Assignment");
      task = {
        id: chosen.id,
        title: chosen.title,
        introduction: intro ? firstParagraph(intro.lines) : "",
        assignment: assignment ? listItems(assignment).filter((it) => it.ordered).map(itemText) : [],
      };
    }
  }
  const talks = readTalkRecords(workspace);
  const mistakes = readMistakes(workspace)
    .filter((m) => m.cleared === "")
    .slice(-5)
    .map((m) => ({ n: m.n, lesson: m.lesson, wrote: m.wrote, better: m.better, why: m.why }));
  return { scope: label, profile: learner(profile), lessons, task, lastFocus: talks.length > 0 ? talks[talks.length - 1].focus : "", mistakes };
}

export function formatTalk(t: TalkDigest): string {
  const p = t.profile;
  const out = [`# Talk: ${t.scope}`, ...learnerLines(p), ""];
  out.push(`Feedback language: ${authoredLanguage(p.level, "sidecar") === "native" ? p.nativeLanguage : p.language}. Speaking ${p.skills.speaking}, writing ${p.skills.writing}, listening ${p.skills.listening}, reading ${p.skills.reading}.`, "");
  if (t.task) {
    out.push(`## Task ${t.task.id}: ${t.task.title}`, t.task.introduction);
    t.task.assignment.forEach((a, i) => out.push(`${i + 1}. ${a}`));
    out.push("");
  }
  for (const l of t.lessons) {
    out.push(`## ${l.id} ${l.title}`);
    if (l.overview.length > 0) out.push(`Overview: ${l.overview.join(" ")}`);
    if (l.words.length > 0) out.push(`Words: ${l.words.map((w) => `${w.word} (${w.meaning})`).join(", ")}`);
    out.push("");
  }
  if (t.lessons.length === 0 && !t.task) out.push("No lesson in scope: let the learner choose the topic, at their level.", "");
  out.push(`## Last talk's focus`, t.lastFocus || "none yet", "");
  out.push("## Open mistakes, newest last");
  if (t.mistakes.length === 0) out.push("none");
  for (const m of t.mistakes) out.push(`- ${m.n}${m.lesson && m.lesson !== "-" ? ` (${m.lesson})` : ""}: ${m.wrote} -> ${m.better}${m.why ? `; ${m.why}` : ""}`);
  return out.join("\n").trimEnd() + "\n";
}

function count(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), { top: { type: "string" }, cap: { type: "string" }, words: { type: "string" }, mistakes: { type: "string" } });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const positionals = args.positionals;
  const modeAt = positionals.findIndex((p) => p === "quiz" || p === "talk");
  if (modeAt === 0 || modeAt === 1) {
    const workspace = requireWorkspace(modeAt === 1 ? positionals[0] : process.cwd());
    const scope = positionals[modeAt + 1] ?? null;
    if (positionals[modeAt] === "talk") {
      const talk = buildTalk(workspace, scope);
      if (args.values.json) console.log(JSON.stringify(talk));
      else process.stdout.write(formatTalk(talk));
      return 0;
    }
    const quiz = buildQuiz(workspace, scope, count(args.values.cap, 8) || 8, undefined, count(args.values.words, 5), count(args.values.mistakes, 3));
    if (args.values.json) console.log(JSON.stringify(quiz));
    else process.stdout.write(formatQuiz(quiz));
    return 0;
  }
  const target = positionals.length >= 2 ? positionals[1] : positionals[0];
  if (!target) throw Object.assign(new Error("expected <ID | syllabus | quiz | talk>"), { code: 2 });
  const workspace = requireWorkspace(positionals.length >= 2 ? positionals[0] : process.cwd());
  const top = typeof args.values.top === "string" ? Number(args.values.top) : undefined;
  const digest = buildDigest(workspace, target.toLowerCase() === "syllabus" ? "syllabus" : target.toUpperCase(), top && top > 0 ? top : undefined);
  if (args.values.json) console.log(JSON.stringify(digest, null, 2));
  else process.stdout.write(formatDigest(workspace, digest));
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
