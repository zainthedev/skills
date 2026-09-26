#!/usr/bin/env node
// Checks a workspace against the dojo formats: the syllabus and ledger
// tables, and every generated or done lesson, project and checkpoint (or
// only the IDs given). One line per finding; exit 1 on any error.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import {
  BEFORE_YOU_START_LINE,
  DATE_PATTERN,
  ID_PATTERN,
  LEVELS,
  PROJECT_KINDS,
  PROJECT_RULES_LINES,
  RETRIEVAL_PRACTICE_LINE,
  WORD_BUDGET,
  type Level,
} from "./lib/constants.ts";
import { finding, hasErrors, type Finding, type Severity } from "./lib/findings.ts";
import { asList, asNumber, asString } from "./lib/frontmatter.ts";
import { canonicalUrl, findRow, ledgerHas, parseLedger, readFetched, validateLedger, type Ledger } from "./lib/ledger.ts";
import { headingAnchors, isSafeHref } from "./lib/markdown.ts";
import { fenceCount, findSection, firstContentLine, isBlank, linksIn, listItems, splitDoc, urlsIn, wordCount, type Doc, type ListItem, type Section } from "./lib/sections.ts";
import { readSidecar } from "./lib/sidecar.ts";
import { checkStyle } from "./lib/style.ts";
import { findItem, parseSyllabus, previousSectionNumber, validateSyllabus, type Syllabus, type SyllabusItem } from "./lib/syllabus.ts";
import { findItemFile, idFromPath, itemPath, readProfile, requireWorkspace, sidecarPath, starterDir, type Profile } from "./lib/workspace.ts";

const USAGE = `usage: lint.ts <workspace> [ID ...] [--json]

With no IDs, checks syllabus.md, ledger.md and every generated or done item.
With IDs, checks only those items. Findings are grouped by file, then by
severity and rule, one "<line>: <message>" per finding under each:
  <file>
    error <rule>
      12: <message>
Exit 1 when any error was found, 0 otherwise.`;

interface Context {
  workspace: string;
  syllabus: Syllabus;
  ledger: Ledger;
  fetched: Set<string> | null;
  profile: Profile | null;
  findings: Finding[];
  lessonCache: Map<string, { prompts: string[]; id: string | null }>;
}

export interface LintResult {
  findings: Finding[];
  errors: number;
  warnings: number;
}

const LINK_ONLY = /^\[([^\]]+)\]\(([^)\s]+)\)\s*$/;
const BOLD_LINK = /^\*\*\[([^\]]+)\]\(([^)\s]+)\)\*\*\s*$/;
const ANY_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;
const VAGUE_LINK_TEXT = new Set(["this", "here", "video", "docs", "link", "the docs", "this video", "this article", "read this"]);

function report(ctx: Context, severity: Severity, file: string, line: number, rule: string, message: string): void {
  ctx.findings.push(finding(severity, file, line, rule, message));
}

// The style/* rules from STYLE.md's mechanical half, on authored prose.
function checkStyleLines(ctx: Context, file: string, lines: string[], startLine: number): void {
  for (const f of checkStyle(lines, startLine)) report(ctx, f.severity, file, f.line, f.rule, f.message);
}

function checkStyleSections(ctx: Context, file: string, sections: (Section | null)[]): void {
  for (const s of sections) if (s) checkStyleLines(ctx, file, s.lines, s.startLine);
}

function checkStyleItems(ctx: Context, file: string, items: ListItem[]): void {
  for (const it of items) checkStyleLines(ctx, file, [it.text, ...it.continuation], it.line);
}

function checkHeadings(ctx: Context, file: string, doc: Doc, order: string[], required: string[], rule: string): void {
  const seen = new Map<string, number>();
  let lastIndex = -1;
  for (const section of doc.sections) {
    const index = order.indexOf(section.heading);
    if (index < 0) {
      report(ctx, "error", file, section.line, rule, `unexpected heading "## ${section.heading}"; allowed: ${order.join(", ")}`);
      continue;
    }
    if (seen.has(section.heading)) report(ctx, "error", file, section.line, rule, `duplicate heading "## ${section.heading}"`);
    seen.set(section.heading, section.line);
    if (index < lastIndex) report(ctx, "error", file, section.line, rule, `"## ${section.heading}" is out of order; expected order: ${order.join(", ")}`);
    lastIndex = Math.max(lastIndex, index);
  }
  for (const heading of required) {
    if (!seen.has(heading)) report(ctx, "error", file, doc.titleLine || 1, rule, `missing required heading "## ${heading}"`);
  }
}

function sectionIsEmpty(section: Section): boolean {
  return section.lines.every(isBlank);
}

function checkCommonFrontmatter(ctx: Context, file: string, doc: Doc, item: SyllabusItem): void {
  if (!doc.hasFrontmatter) {
    report(ctx, "error", file, 1, "item/frontmatter", "missing frontmatter");
    return;
  }
  const id = asString(doc.data.id);
  if (id !== item.id) report(ctx, "error", file, 1, "item/frontmatter", `frontmatter id "${id}" does not match ${item.id}`);
  const title = asString(doc.data.title);
  if (title === "") report(ctx, "error", file, 1, "item/frontmatter", "missing frontmatter title");
  else if (title !== item.title) report(ctx, "warning", file, 1, "item/frontmatter", `frontmatter title "${title}" differs from the syllabus title "${item.title}"`);
  const section = asNumber(doc.data.section);
  if (section === null) report(ctx, "error", file, 1, "item/frontmatter", "missing or non-numeric frontmatter section");
  else if (section !== item.section) report(ctx, "error", file, 1, "item/section", `frontmatter section ${section} but the syllabus places ${item.id} in section ${item.section}`);
  const generated = asString(doc.data.generated);
  if (!DATE_PATTERN.test(generated)) report(ctx, "warning", file, 1, "item/frontmatter", `generated "${generated}" is not a YYYY-MM-DD date`);
  if (item.type !== "checkpoint" && asNumber(doc.data.hours) === null) report(ctx, "warning", file, 1, "item/frontmatter", "missing or non-numeric frontmatter hours");
  if (doc.title === null) report(ctx, "error", file, 1, "item/title", "missing the # title heading");
}

function level(ctx: Context): Level | null {
  const value = ctx.profile?.level ?? "";
  return (LEVELS as readonly string[]).includes(value) ? (value as Level) : null;
}

// The Retrieval practice prompt texts of a lesson file, cached.
function lessonPrompts(ctx: Context, file: string): { prompts: string[]; id: string | null } | null {
  if (ctx.lessonCache.has(file)) return ctx.lessonCache.get(file)!;
  if (!existsSync(file)) return null;
  const doc = splitDoc(readFileSync(file, "utf8"));
  const section = findSection(doc, "Retrieval practice");
  const prompts = section
    ? listItems(section)
        .filter((it) => it.ordered)
        .map((it) => LINK_ONLY.exec(it.text)?.[1] ?? it.text.trim())
    : [];
  const entry = { prompts, id: asString(doc.data.id) || idFromPath(file) };
  ctx.lessonCache.set(file, entry);
  return entry;
}

function lintLesson(ctx: Context, file: string, doc: Doc, item: SyllabusItem): void {
  const order = ["Introduction", "Lesson overview", "Before you start", "Core idea", "Assignment", "Retrieval practice", "Additional resources"];
  checkHeadings(ctx, file, doc, order, ["Introduction", "Lesson overview", "Before you start", "Assignment", "Retrieval practice"], "lesson/headings");
  const lvl = level(ctx);
  if (doc.title !== null && asString(doc.data.title) && doc.title !== asString(doc.data.title)) {
    report(ctx, "warning", file, doc.titleLine, "lesson/title", `# heading "${doc.title}" differs from the frontmatter title`);
  }

  const intro = findSection(doc, "Introduction");
  const overview = findSection(doc, "Lesson overview");
  const before = findSection(doc, "Before you start");
  const core = findSection(doc, "Core idea");
  const assignment = findSection(doc, "Assignment");
  const retrieval = findSection(doc, "Retrieval practice");
  const additional = findSection(doc, "Additional resources");

  if (intro && sectionIsEmpty(intro)) report(ctx, "error", file, intro.line, "lesson/introduction", "Introduction is empty");

  if (overview) {
    const items = listItems(overview);
    if (items.length === 0) report(ctx, "error", file, overview.line, "lesson/overview", "Lesson overview must be a bullet list");
    if (items.length > 7) report(ctx, "error", file, items[7].line, "lesson/overview", `Lesson overview has ${items.length} bullets; at most seven`);
    for (const it of items) {
      if (it.ordered) report(ctx, "warning", file, it.line, "lesson/overview", "Lesson overview should use bullets, not numbers");
      const text = it.text.trim();
      if (text.includes("?")) report(ctx, "error", file, it.line, "lesson/overview", "overview bullets are never phrased as questions");
      if (!/[.]$/.test(text)) report(ctx, "warning", file, it.line, "lesson/overview", "overview bullet should end with a period");
      if (/^[a-z]/.test(text)) report(ctx, "warning", file, it.line, "lesson/overview", "overview bullet should be sentence case");
    }
  }

  let predictionCount = 0;
  if (before) {
    const first = firstContentLine(before);
    if (!first || first.text.trim() !== BEFORE_YOU_START_LINE) {
      report(ctx, "error", file, first?.line ?? before.line, "lesson/before-you-start", `first line must be exactly "${BEFORE_YOU_START_LINE}"`);
    }
    const items = listItems(before).filter((it) => it.ordered);
    predictionCount = items.length;
    if (items.length < 2 || items.length > 3) {
      report(ctx, "error", file, before.line, "lesson/before-you-start", `expected two or three numbered prediction questions, found ${items.length}`);
    }
  }

  if (core) {
    if (lvl === "advanced") report(ctx, "error", file, core.line, "lesson/core-idea", "Core idea is omitted at advanced level");
    if (sectionIsEmpty(core)) report(ctx, "error", file, core.line, "lesson/core-idea", "Core idea is empty; omit the heading instead");
    const fences = fenceCount(core.lines);
    if (fences > 1) report(ctx, "error", file, core.line, "lesson/core-idea", `Core idea has ${fences} fenced examples; at most one`);
  }

  if (assignment) {
    const items = listItems(assignment).filter((it) => it.ordered);
    if (items.length < 3 || items.length > 5) {
      report(ctx, "error", file, assignment.line, "lesson/assignment", `expected three to five numbered items, found ${items.length}`);
    }
    items.forEach((it, index) => {
      const n = index + 1;
      const bold = BOLD_LINK.exec(it.text.trim());
      const any = ANY_LINK.exec(it.text);
      if (!any) {
        report(ctx, "error", file, it.line, "lesson/assignment", `item ${n} must start with a bold link **[Descriptive text](url)**`);
      } else {
        if (!bold) report(ctx, "warning", file, it.line, "lesson/assignment", `item ${n}: the link should be the whole first line, in bold`);
        const text = any[1].trim();
        if (VAGUE_LINK_TEXT.has(text.toLowerCase())) report(ctx, "error", file, it.line, "lesson/assignment", `item ${n}: link text "${text}" does not name the resource`);
        if (!ledgerHas(ctx.ledger, any[2])) report(ctx, "error", file, it.line, "lesson/assignment-url", `item ${n}: ${any[2]} is not in the ledger`);
        else checkUsedIn(ctx, any[2], item.id);
      }
      const labels = ["Why", "How", "Do"];
      const positions: Record<string, number[]> = { Why: [], How: [], Do: [] };
      it.continuation.forEach((line, offset) => {
        const m = /^(Why|How|Do):\s*(.*)$/.exec(line.trim());
        if (m && !/^[-*+]\s/.test(line.trim())) {
          positions[m[1]].push(offset);
          if (m[2].trim() === "") report(ctx, "error", file, it.line + 1 + offset, "lesson/assignment", `item ${n}: ${m[1]}: line is empty`);
        }
      });
      for (const label of labels) {
        if (positions[label].length === 0) report(ctx, "error", file, it.line, "lesson/assignment", `item ${n} is missing its ${label}: line`);
        if (positions[label].length > 1) report(ctx, "error", file, it.line, "lesson/assignment", `item ${n} has more than one ${label}: line`);
      }
      const order = labels.map((l) => positions[l][0]).filter((p) => p !== undefined);
      if (order.some((p, i) => i > 0 && p < order[i - 1])) report(ctx, "warning", file, it.line, "lesson/assignment", `item ${n}: Why, How and Do should appear in that order`);
    });
  }

  let promptCount = 0;
  if (retrieval) {
    const first = firstContentLine(retrieval);
    if (!first || first.text.trim() !== RETRIEVAL_PRACTICE_LINE) {
      report(ctx, "error", file, first?.line ?? retrieval.line, "lesson/retrieval", `first line must be exactly "${RETRIEVAL_PRACTICE_LINE}"`);
    }
    const items = listItems(retrieval).filter((it) => it.ordered);
    promptCount = items.length;
    if (items.length < 4 || items.length > 8) report(ctx, "error", file, retrieval.line, "lesson/retrieval", `expected four to eight numbered prompts, found ${items.length}`);
    const anchors = new Set(headingAnchors(doc.lines.join("\n")));
    let plain = 0;
    items.forEach((it, index) => {
      const n = index + 1;
      const link = LINK_ONLY.exec(it.text.trim());
      if (!link || it.continuation.some((l) => l.trim() !== "")) {
        report(ctx, "error", file, it.line, "lesson/retrieval", `prompt ${n} must be a single link [prompt](#anchor or ledger url)`);
        return;
      }
      if (link[1].startsWith("Explain in plain English")) plain++;
      const target = link[2];
      if (target.startsWith("#")) {
        if (!anchors.has(target.slice(1))) report(ctx, "error", file, it.line, "lesson/retrieval-anchor", `prompt ${n}: no heading with anchor ${target} in this lesson`);
      } else if (!ledgerHas(ctx.ledger, target)) {
        report(ctx, "error", file, it.line, "lesson/retrieval-url", `prompt ${n}: ${target} is not in the ledger`);
      }
    });
    if (items.length > 0 && plain === 0) report(ctx, "error", file, retrieval.line, "lesson/retrieval-plain-english", 'at least one prompt must begin "Explain in plain English"');
  }

  if (additional) {
    const items = listItems(additional);
    if (items.length === 0) report(ctx, "error", file, additional.line, "lesson/additional-resources", "Additional resources is empty; omit the heading");
    for (const it of items) {
      const link = ANY_LINK.exec(it.text);
      if (!link) report(ctx, "error", file, it.line, "lesson/additional-resources", "each additional resource is a link");
      else if (!ledgerHas(ctx.ledger, link[2])) report(ctx, "error", file, it.line, "lesson/additional-url", `${link[2]} is not in the ledger`);
      else checkUsedIn(ctx, link[2], item.id);
    }
  }

  const authored = [intro, overview, core].filter((s): s is Section => s !== null);
  const words = authored.reduce((sum, s) => sum + wordCount(s.lines), 0);
  if (lvl) {
    if (words > WORD_BUDGET[lvl]) report(ctx, "error", file, intro?.line ?? 1, "lesson/budget", `${words} authored words in Introduction, Lesson overview and Core idea; the ${lvl} budget is ${WORD_BUDGET[lvl]}`);
  } else {
    report(ctx, "warning", file, 1, "lesson/budget", `cannot check the word budget: profile.md level is not one of ${LEVELS.join(", ")} (${words} authored words)`);
  }
  checkStyleSections(ctx, file, [intro, overview, core, assignment, additional]);

  const cited = [intro, core].filter((s): s is Section => s !== null).flatMap((s) => urlsIn(s.lines, s.startLine));
  let unverified = 0;
  for (const ref of cited) {
    if (!ledgerHas(ctx.ledger, ref.url)) report(ctx, "error", file, ref.line, "lesson/citation", `${ref.url} is cited but not in the ledger`);
    if (ctx.fetched === null) unverified++;
    else if (!ctx.fetched.has(canonicalUrl(ref.url))) report(ctx, "error", file, ref.line, "lesson/citation-fetched", `${ref.url} is cited but not recorded in .dojo/fetched.jsonl`);
  }
  if (unverified > 0) report(ctx, "warning", file, 1, "lesson/citation-fetched", `.dojo/fetched.jsonl is missing; ${unverified} citation(s) could not be verified as fetched`);

  const sidecarFile = sidecarPath(file);
  const sidecar = readSidecar(sidecarFile);
  if (!sidecar) {
    report(ctx, "error", sidecarFile, 0, "lesson/sidecar", `missing sidecar ${basename(sidecarFile)}`);
  } else {
    if (sidecar.id !== item.id) report(ctx, "error", sidecarFile, 1, "lesson/sidecar", `sidecar id "${sidecar.id}" does not match ${item.id}`);
    if (sidecar.prediction.length !== predictionCount) {
      report(ctx, "error", sidecarFile, 1, "lesson/sidecar", `sidecar has ${sidecar.prediction.length} prediction answers but the lesson has ${predictionCount} questions`);
    }
    if (sidecar.retrieval.length !== promptCount) {
      report(ctx, "error", sidecarFile, 1, "lesson/sidecar", `sidecar has ${sidecar.retrieval.length} retrieval answers but the lesson has ${promptCount} prompts`);
    }
    for (const answer of [...sidecar.prediction, ...sidecar.retrieval]) {
      if (!/Source:\s*\[/.test([answer.text, ...answer.continuation].join(" "))) {
        report(ctx, "warning", sidecarFile, answer.line, "lesson/sidecar-source", "answer has no Source: link");
      }
    }
    checkStyleItems(ctx, sidecarFile, [...sidecar.prediction, ...sidecar.retrieval]);
  }
}

function checkUsedIn(ctx: Context, url: string, id: string): void {
  const row = findRow(ctx.ledger, url);
  if (row && !row.usedIn.includes(id)) {
    report(ctx, "warning", join(ctx.workspace, "ledger.md"), row.line, "ledger/used-in", `${id} uses ${row.url} but is not listed in its Used in cell`);
  }
}

function kindForType(type: string): string {
  if (type === "completion-project") return "completion";
  if (type === "capstone") return "capstone";
  return "independent";
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkFiles(path, out);
    else out.push(path);
  }
  return out;
}

function lintProject(ctx: Context, file: string, doc: Doc, item: SyllabusItem): void {
  const kind = asString(doc.data.kind);
  if (!(PROJECT_KINDS as readonly string[]).includes(kind)) {
    report(ctx, "error", file, 1, "project/kind", `kind "${kind}" must be one of ${PROJECT_KINDS.join(", ")}`);
  } else if (kind !== kindForType(item.type)) {
    report(ctx, "error", file, 1, "project/kind", `kind "${kind}" does not match the syllabus type ${item.type} (expected ${kindForType(item.type)})`);
  }
  for (const id of asList(doc.data.reuses)) {
    const reused = findItem(ctx.syllabus.items, id);
    if (!reused) report(ctx, "warning", file, 1, "project/reuses", `reuses ${id}, which is not in the syllabus`);
  }
  if (doc.title !== null) {
    const m = /^Project:\s*(.*)$/.exec(doc.title);
    if (!m) report(ctx, "error", file, doc.titleLine, "project/title", `the heading must be "# Project: <title>", got "# ${doc.title}"`);
    else if (asString(doc.data.title) && m[1] !== asString(doc.data.title)) report(ctx, "warning", file, doc.titleLine, "project/title", `heading title "${m[1]}" differs from the frontmatter title`);
  }
  const order = ["Introduction", "Starter", "Assignment", "Extra credit", "Rules", "Done when"];
  checkHeadings(ctx, file, doc, order, ["Introduction", "Assignment", "Rules", "Done when"], "project/headings");

  const intro = findSection(doc, "Introduction");
  if (intro && sectionIsEmpty(intro)) report(ctx, "error", file, intro.line, "project/introduction", "Introduction is empty");

  const starter = findSection(doc, "Starter");
  const isCompletion = item.type === "completion-project";
  if (isCompletion && !starter) report(ctx, "error", file, doc.titleLine || 1, "project/starter", "completion projects need a ## Starter section");
  if (!isCompletion && starter) report(ctx, "error", file, starter.line, "project/starter", `## Starter belongs to completion projects only; this one is ${item.type}`);
  if (isCompletion) {
    const dir = starterDir(file);
    if (!existsSync(dir) || walkFiles(dir).length === 0) {
      report(ctx, "error", file, starter?.line ?? 1, "project/starter", `starter directory ${dir} is missing or empty`);
    } else {
      const marked = walkFiles(dir).some((f) => {
        try {
          return statSync(f).size < 512 * 1024 && readFileSync(f, "utf8").includes("TODO(dojo):");
        } catch {
          return false;
        }
      });
      if (!marked) report(ctx, "warning", file, starter?.line ?? 1, "project/starter-todo", "no TODO(dojo): marker found in the starter; every gap is marked with one");
    }
    if (starter && sectionIsEmpty(starter)) report(ctx, "error", file, starter.line, "project/starter", "Starter section is empty");
  }

  const assignment = findSection(doc, "Assignment");
  if (assignment) {
    const items = listItems(assignment).filter((it) => it.ordered);
    if (items.length === 0) report(ctx, "error", file, assignment.line, "project/assignment", "Assignment must be a numbered list of requirements");
  }

  const rules = findSection(doc, "Rules");
  if (rules) {
    const lines = rules.lines.map((l, i) => ({ text: l.trim(), line: rules.startLine + i })).filter((l) => l.text !== "");
    if (lines.length !== PROJECT_RULES_LINES.length) {
      report(ctx, "error", file, rules.line, "project/rules", `Rules must be exactly the fixed ${PROJECT_RULES_LINES.length} bullets, found ${lines.length} lines`);
    }
    lines.forEach((l, i) => {
      if (PROJECT_RULES_LINES[i] !== undefined && l.text !== PROJECT_RULES_LINES[i]) {
        report(ctx, "error", file, l.line, "project/rules", `Rules bullet ${i + 1} is not verbatim; expected "${PROJECT_RULES_LINES[i]}"`);
      }
    });
  }

  const done = findSection(doc, "Done when");
  if (done) {
    const items = listItems(done);
    if (items.length === 0) report(ctx, "error", file, done.line, "project/done-when", "Done when must be a task list (- [ ] behaviour)");
    for (const it of items) {
      if (it.checked === null) report(ctx, "error", file, it.line, "project/done-when", "each Done when item is a task list item: - [ ] ...");
    }
  }
  checkStyleSections(ctx, file, [intro, starter, assignment, findSection(doc, "Extra credit"), done]);
}

function lintCheckpoint(ctx: Context, file: string, doc: Doc, item: SyllabusItem): void {
  const samples = asList(doc.data.samples);
  if (samples.length === 0) report(ctx, "error", file, 1, "checkpoint/samples", "frontmatter samples must list the sampled lesson IDs");
  for (const id of samples) {
    const lesson = findItem(ctx.syllabus.items, id);
    if (!lesson || lesson.type !== "lesson") report(ctx, "error", file, 1, "checkpoint/samples", `sample ${id} is not a lesson in the syllabus`);
  }
  if (doc.title !== null && asString(doc.data.title) && doc.title !== asString(doc.data.title)) {
    report(ctx, "warning", file, doc.titleLine, "checkpoint/title", `# heading "${doc.title}" differs from the frontmatter title`);
  }
  const order = ["Prompts"];
  const below = doc.sections.find((s) => /^If you scored below \d+$/.test(s.heading));
  for (const section of doc.sections) {
    if (!order.includes(section.heading) && section !== below) {
      report(ctx, "error", file, section.line, "checkpoint/headings", `unexpected heading "## ${section.heading}"; expected Prompts and If you scored below M`);
    }
  }
  const prompts = findSection(doc, "Prompts");
  if (!prompts) report(ctx, "error", file, doc.titleLine || 1, "checkpoint/headings", 'missing "## Prompts"');

  let predicted: number | null = null;
  doc.preamble.forEach((line, i) => {
    const m = /^Predicted:\s*___\s*\/\s*(\d+)\s*$/.exec(line.trim());
    if (m) predicted = Number(m[1]);
    else if (/^Predicted:/i.test(line.trim())) report(ctx, "error", file, doc.preambleLine + i, "checkpoint/predicted", 'the line must read "Predicted: ___ / N"');
  });
  if (predicted === null) report(ctx, "error", file, doc.titleLine || 1, "checkpoint/predicted", 'missing "Predicted: ___ / N" line before the prompts');

  const linked: string[] = [];
  let count = 0;
  let actual: number | null = null;
  if (prompts) {
    const items = listItems(prompts).filter((it) => it.ordered);
    count = items.length;
    if (count < 6 || count > 10) report(ctx, "error", file, prompts.line, "checkpoint/prompts", `expected six to ten prompts, found ${count}`);
    items.forEach((it, index) => {
      const n = index + 1;
      const m = /^\[(.+?)\]\(([^)\s]+)\)\s+\(([LPC]\d{2})\)\s*$/.exec(it.text.trim());
      if (!m) {
        report(ctx, "error", file, it.line, "checkpoint/prompts", `prompt ${n} must be "[prompt](../lessons/<ID>-<slug>.md#retrieval-practice) (<ID>)"`);
        return;
      }
      const [, text, target, id] = m;
      linked.push(id);
      const [path, anchor] = target.split("#");
      const lessonFile = resolve(dirname(file), path);
      const targetId = idFromPath(lessonFile);
      if (targetId !== id) report(ctx, "error", file, it.line, "checkpoint/link", `prompt ${n}: link points at ${basename(lessonFile)} but is labelled (${id})`);
      if (anchor !== "retrieval-practice") report(ctx, "error", file, it.line, "checkpoint/link", `prompt ${n}: the link must end in #retrieval-practice`);
      const source = lessonPrompts(ctx, lessonFile);
      if (!source) {
        report(ctx, "error", file, it.line, "checkpoint/link", `prompt ${n}: ${path} does not exist`);
      } else if (!source.prompts.includes(text)) {
        report(ctx, "error", file, it.line, "checkpoint/verbatim", `prompt ${n} is not verbatim in ${id}'s Retrieval practice: "${text}"`);
      }
    });
    prompts.lines.forEach((line, i) => {
      const m = /^Actual:\s*___\s*\/\s*(\d+)\s*$/.exec(line.trim());
      if (m) actual = Number(m[1]);
      else if (/^Actual:/i.test(line.trim())) report(ctx, "error", file, prompts.startLine + i, "checkpoint/actual", 'the line must read "Actual: ___ / N"');
    });
    if (actual === null) report(ctx, "error", file, prompts.line, "checkpoint/actual", 'missing "Actual: ___ / N" line after the prompts');
  }
  if (predicted !== null && count > 0 && predicted !== count) report(ctx, "error", file, doc.titleLine || 1, "checkpoint/count", `Predicted says ${predicted} but there are ${count} prompts`);
  if (actual !== null && count > 0 && actual !== count) report(ctx, "error", file, prompts?.line ?? 1, "checkpoint/count", `Actual says ${actual} but there are ${count} prompts`);

  const linkedSet = [...new Set(linked)].sort();
  const sampleSet = [...new Set(samples)].sort();
  if (linked.length > 0 && linkedSet.join(",") !== sampleSet.join(",")) {
    report(ctx, "error", file, 1, "checkpoint/samples", `frontmatter samples [${sampleSet.join(", ")}] do not match the lessons linked in Prompts [${linkedSet.join(", ")}]`);
  }

  const previous = previousSectionNumber(ctx.syllabus, item.section);
  let own = 0;
  for (const id of linked) {
    const lesson = findItem(ctx.syllabus.items, id);
    if (!lesson) continue;
    if (lesson.section === item.section) own++;
    else if (previous === null) report(ctx, "error", file, 1, "checkpoint/sampling", `${id} is from section ${lesson.section}; the first checkpoint samples only its own section`);
    else if (lesson.section !== previous) report(ctx, "error", file, 1, "checkpoint/sampling", `${id} is from section ${lesson.section}; sample only sections ${item.section} and ${previous}`);
  }
  if (previous !== null && count > 0 && Math.abs(own - Math.round((count * 2) / 3)) > 1) {
    report(ctx, "warning", file, 1, "checkpoint/sampling", `${own} of ${count} prompts are from section ${item.section}; about two thirds should be`);
  }

  if (!below) {
    report(ctx, "error", file, doc.titleLine || 1, "checkpoint/below", 'missing "## If you scored below M"');
  } else {
    const m = Number(/\d+$/.exec(below.heading)![0]);
    const expected = Math.floor((count * 3) / 4);
    if (count > 0 && m !== expected) report(ctx, "error", file, below.line, "checkpoint/below", `M is ${m} but three quarters of ${count} rounded down is ${expected}`);
    const items = listItems(below);
    const mentioned = new Set(items.map((it) => /^([LPC]\d{2})\b/.exec(it.text.trim())?.[1] ?? ""));
    if (items.length === 0) report(ctx, "error", file, below.line, "checkpoint/below", "the re-read list is empty");
    for (const id of sampleSet) {
      if (!mentioned.has(id)) report(ctx, "warning", file, below.line, "checkpoint/reread", `no re-read pointer for ${id}; name one place per sampled lesson`);
    }
  }
  checkStyleLines(ctx, file, doc.preamble, doc.preambleLine);
  if (below) checkStyleSections(ctx, file, [below]);
}

// Every link target in the file carries a safe scheme, so the built site
// never gets a live javascript: or data: link.
function checkLinkSchemes(ctx: Context, file: string, text: string): void {
  let inFence = false;
  text.split("\n").forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) return;
    for (const link of linksIn(line)) {
      if (!isSafeHref(link.target)) report(ctx, "error", file, i + 1, "link/scheme", `link target "${link.target}" must be http(s), mailto, relative or an anchor`);
    }
  });
}

function lintItem(ctx: Context, item: SyllabusItem): void {
  const file = findItemFile(ctx.workspace, item.id, item.type);
  if (!file) {
    report(ctx, "error", itemPath(ctx.workspace, item), 0, "item/missing-file", `no file for ${item.id} (${item.status})`);
    return;
  }
  try {
    const text = readFileSync(file, "utf8");
    const doc = splitDoc(text);
    checkCommonFrontmatter(ctx, file, doc, item);
    checkLinkSchemes(ctx, file, text);
    if (item.type === "lesson") {
      lintLesson(ctx, file, doc, item);
      const sidecar = sidecarPath(file);
      if (existsSync(sidecar)) checkLinkSchemes(ctx, sidecar, readFileSync(sidecar, "utf8"));
    } else if (item.type === "checkpoint") lintCheckpoint(ctx, file, doc, item);
    else lintProject(ctx, file, doc, item);
  } catch (error) {
    // A parse failure in one file (bad frontmatter, most often) is one finding
    // that names the file, not the end of the run.
    report(ctx, "error", file, 1, "item/parse", `cannot parse ${basename(file)}: ${(error as Error).message}`);
  }
}

export function lintWorkspace(workspace: string, ids: string[] = []): LintResult {
  const findings: Finding[] = [];
  const syllabusFile = join(workspace, "syllabus.md");
  const ledgerFile = join(workspace, "ledger.md");
  let profile: Profile | null = null;
  try {
    profile = readProfile(workspace);
  } catch (error) {
    findings.push(finding("warning", join(workspace, "profile.md"), 0, "profile/unreadable", `cannot read profile.md: ${(error as Error).message}`));
  }
  if (!existsSync(syllabusFile)) {
    findings.push(finding("error", syllabusFile, 0, "syllabus/missing", "syllabus.md does not exist"));
    return summarize(findings);
  }
  let syllabus: Syllabus;
  try {
    syllabus = parseSyllabus(readFileSync(syllabusFile, "utf8"));
  } catch (error) {
    findings.push(finding("error", syllabusFile, 0, "syllabus/parse", (error as Error).message));
    return summarize(findings);
  }
  let ledger: Ledger = { data: {}, header: null, headerLine: 0, rows: [], excluded: [], urls: new Set() };
  if (existsSync(ledgerFile)) {
    try {
      ledger = parseLedger(readFileSync(ledgerFile, "utf8"));
    } catch (error) {
      findings.push(finding("error", ledgerFile, 0, "ledger/parse", (error as Error).message));
    }
  } else if (ids.length === 0 || syllabus.items.some((it) => ids.includes(it.id) && it.type === "lesson")) {
    findings.push(finding("error", ledgerFile, 0, "ledger/missing", "ledger.md does not exist"));
  }
  const ctx: Context = { workspace, syllabus, ledger, fetched: readFetched(workspace), profile, findings, lessonCache: new Map() };

  if (ids.length === 0) {
    findings.push(
      ...validateSyllabus(syllabus, syllabusFile, workspace, {
        level: profile?.level,
        hoursPerWeek: profile?.hoursPerWeek,
        created: profile?.created,
        targetDate: profile?.targetDate,
      }),
    );
    if (existsSync(ledgerFile)) findings.push(...validateLedger(ledger, ledgerFile, new Set(syllabus.items.map((it) => it.id))));
    const syllabusDoc = splitDoc(readFileSync(syllabusFile, "utf8"));
    checkStyleLines(ctx, syllabusFile, syllabusDoc.preamble, syllabusDoc.preambleLine);
    for (const s of syllabusDoc.sections) checkStyleLines(ctx, syllabusFile, s.lines.map((l) => (/^\s*\|/.test(l) ? "" : l)), s.startLine);
    for (const item of syllabus.items) {
      if ((item.status === "generated" || item.status === "done") && ID_PATTERN.test(item.id)) lintItem(ctx, item);
    }
  } else {
    for (const id of ids) {
      const item = findItem(syllabus.items, id);
      if (!item) {
        findings.push(finding("error", syllabusFile, 0, "item/unknown", `no item ${id} in the syllabus`));
        continue;
      }
      lintItem(ctx, item);
    }
  }
  findings.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return summarize(findings);
}

// Findings grouped by file, then severity and rule: the file and rule names
// appear once each, so a messy draft's report is a third of the flat form.
export function formatGrouped(findings: Finding[], base: string): string[] {
  const out: string[] = [];
  const byFile = new Map<string, Finding[]>();
  for (const f of findings) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
  for (const [file, list] of byFile) {
    out.push(relative(base, file) || ".");
    const byRule = new Map<string, Finding[]>();
    for (const f of list) {
      const key = `${f.severity} ${f.rule}`;
      byRule.set(key, [...(byRule.get(key) ?? []), f]);
    }
    const keys = [...byRule.keys()].sort((a, b) => (a.startsWith("error") === b.startsWith("error") ? a.localeCompare(b) : a.startsWith("error") ? -1 : 1));
    for (const key of keys) {
      out.push(`  ${key}`);
      for (const f of byRule.get(key)!) out.push(`    ${f.line}: ${f.message}`);
    }
  }
  return out;
}

function summarize(findings: Finding[]): LintResult {
  return {
    findings,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
  };
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {});
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const [workspaceArg, ...ids] = args.positionals;
  if (!workspaceArg) throw Object.assign(new Error("expected <workspace>"), { code: 2 });
  const workspace = requireWorkspace(workspaceArg);
  const result = lintWorkspace(workspace, ids);
  if (args.values.json) {
    console.log(JSON.stringify({ workspace, errors: result.errors, warnings: result.warnings, findings: result.findings }, null, 2));
  } else {
    for (const line of formatGrouped(result.findings, workspace)) console.log(line);
    console.log(`${result.errors} error(s), ${result.warnings} warning(s)`);
  }
  return hasErrors(result.findings) ? 1 : 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
