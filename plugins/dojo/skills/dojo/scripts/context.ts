#!/usr/bin/env node
// Prints the digest a research pass needs for one item, so the pass reads one
// short block instead of the profile, the syllabus, the ledger, the scout
// file and the previous items in full (ADR 0013).

import { existsSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import { parseLedger, readFetched, type Ledger } from "./lib/ledger.ts";
import { findSection, listItems, splitDoc, type ListItem } from "./lib/sections.ts";
import { readSidecar } from "./lib/sidecar.ts";
import { findItem, itemsInSection, parseSyllabus, type Syllabus, type SyllabusItem } from "./lib/syllabus.ts";
import { findItemFile, readProfile, requireWorkspace, sidecarPath, type Profile } from "./lib/workspace.ts";
import { describeItem, type ItemInfo } from "./next-item.ts";

const USAGE = `usage: context.ts [workspace] <ID | syllabus> [--top N] [--json]

Prints the digest for a research pass: the learner's profile, the section
plan, the previous items' overviews and prompts, the ledger, and the scout's
top resources for the item (--top, default 12; 25 for the syllabus). For a
checkpoint it prints the sampled lessons' prompts and answers instead of the
ledger and scout. Markdown by default, --json for the same data as JSON.`;

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

interface SampledLesson {
  id: string;
  title: string;
  file: string;
  prompts: { text: string; answer: string }[];
}

export interface Digest {
  item: ItemInfo | null;
  kind: "item" | "syllabus";
  profile: { level: string; depth: string; researchModel: string; goal: string; experience: string; notes: string; topic: string };
  section: { number: number; title: string; items: { id: string; type: string; title: string; status: string; hours: number | null }[] } | null;
  previous: PreviousDigest[];
  sampled: SampledLesson[];
  ledger: { rows: { score: number | null; type: string; title: string; url: string; freshness: string; version: string; usedIn: string[] }[]; excluded: { title: string; reason: string }[]; fetched: number | null; structureSources: string[] };
  scout: { total: number; thin: boolean; generated: string; resources: { score: number; max: number; title: string | null; url: string; breadth: number; depth: number; curated: string[]; updated: string | null; hn: number }[] } | null;
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

function sampledLesson(workspace: string, syllabus: Syllabus, id: string): SampledLesson | null {
  const item = findItem(syllabus.items, id);
  if (!item || item.type !== "lesson") return null;
  const file = findItemFile(workspace, item.id, item.type);
  if (!file) return null;
  const doc = splitDoc(readFileSync(file, "utf8"));
  const retrieval = findSection(doc, "Retrieval practice");
  const sidecar = readSidecar(sidecarPath(file));
  const prompts = retrieval ? listItems(retrieval).filter((it) => it.ordered) : [];
  return {
    id: item.id,
    title: item.title,
    file: `../lessons/${basename(file)}`,
    prompts: prompts.map((it, i) => ({ text: stripLink(it.text), answer: sidecar?.retrieval[i] ? itemText(sidecar.retrieval[i]) : "" })),
  };
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
      breadth: r.breadth ?? 0,
      depth: r.depth ?? 0,
      curated: r.curated ?? [],
      updated: r.freshness?.last_modified ?? null,
      hn: r.hn_mentions_24m ?? 0,
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
      depth: profile.depth,
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
      sampled: [],
      ledger: syllabus ? ledgerDigest(workspace, syllabus) : { rows: [], excluded: [], fetched: null, structureSources: [] },
      scout: scoutDigest(readScout(workspace), top ?? 25, profile.topic),
    };
  }
  if (!syllabus) throw new Error(`no syllabus.md in ${workspace}; run /dojo-plan first`);
  const item: SyllabusItem | null = findItem(syllabus.items, target);
  if (!item) throw new Error(`no item ${target} in the syllabus`);
  const info = describeItem(workspace, syllabus, item);
  const section = {
    number: item.section,
    title: item.sectionTitle,
    items: itemsInSection(syllabus.items, item.section).map((it) => ({ id: it.id, type: it.type, title: it.title, status: it.status, hours: it.hours })),
  };
  if (item.type === "checkpoint") {
    const ids = [...(info.samples?.section ?? []), ...(info.samples?.previousSection ?? [])];
    return {
      ...base,
      kind: "item",
      item: info,
      section,
      previous: [],
      sampled: ids.map((id) => sampledLesson(workspace, syllabus, id)).filter((s): s is SampledLesson => s !== null),
      ledger: { rows: [], excluded: [], fetched: null, structureSources: [] },
      scout: null,
    };
  }
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
    sampled: [],
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
  out.push(`Level ${p.level}, depth ${p.depth}, research model ${p.researchModel}.`, "");
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

  if (d.sampled.length > 0) {
    out.push("## Sampled lessons: prompts and answers");
    for (const lesson of d.sampled) {
      out.push(`### ${lesson.id} ${lesson.title} (link target: ${lesson.file}#retrieval-practice)`);
      lesson.prompts.forEach((pr, i) => out.push(`${i + 1}. ${pr.text}`, `   Answer: ${pr.answer || "missing"}`));
      out.push("");
    }
  }

  if (d.kind === "syllabus" || (d.item && d.item.type !== "checkpoint")) {
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
      out.push("| Score | Resource | Breadth | Depth | Curated | Updated | HN |", "|-------|----------|---------|-------|---------|---------|----|");
      for (const r of d.scout.resources) {
        out.push(`| ${r.score}/${r.max} | [${r.title ?? r.url}](${r.url}) | ${r.breadth} | ${r.depth} | ${r.curated.join("; ")} | ${r.updated ?? "unknown"} | ${r.hn} |`);
      }
    } else {
      out.push("## Scout: no .dojo/scout.json; research from the ledger and the structure sources");
    }
    out.push("");
  }
  return out.join("\n").trimEnd() + "\n";
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), { top: { type: "string" } });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const positionals = args.positionals;
  const target = positionals.length >= 2 ? positionals[1] : positionals[0];
  if (!target) throw Object.assign(new Error("expected <ID | syllabus>"), { code: 2 });
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
