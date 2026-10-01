#!/usr/bin/env node
// Checks a workspace against the lingo formats: the syllabus and ledger
// tables, every generated or done lesson, task and checkpoint (or only the IDs
// given), and any talk record or writing review named by path. One line per
// finding; exit 1 on any error.

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import {
  BEFORE_YOU_START_LINE,
  DATA_DIR,
  DATE_PATTERN,
  ERROR_CODES,
  ID_PATTERN,
  LANGUAGE_SKILLS,
  LEVELS,
  RETRIEVAL_PRACTICE_LINE,
  REVIEW_COLUMNS,
  REVIEW_MAX_MARKS,
  REVIEW_STATUSES,
  TALK_COLUMNS,
  TALK_MAX_CORRECTIONS,
  TASK_KINDS,
  TASK_RULES_LINES,
  WORD_BUDGET,
  WORDS_COLUMNS,
  WORDS_MAX,
  WORDS_MIN,
  authoredLanguage,
  type AuthoredPart,
  type Level,
} from "./lib/constants.ts";
import { finding, hasErrors, type Finding, type Severity } from "./lib/findings.ts";
import { asList, asNumber, asString } from "./lib/frontmatter.ts";
import { canonicalUrl, findRow, ledgerHas, parseLedger, readFetched, validateLedger, type Ledger } from "./lib/ledger.ts";
import { headingAnchors, isSafeHref } from "./lib/markdown.ts";
import { isPromptLabel, parsePrompt } from "./lib/prompts.ts";
import { parseReview, parseTalkRecord } from "./lib/records.ts";
import { fenceCount, findSection, firstContentLine, isBlank, linksIn, listItems, splitDoc, urlsIn, wordCount, type Doc, type ListItem, type Section } from "./lib/sections.ts";
import { readSidecar } from "./lib/sidecar.ts";
import { checkStyle } from "./lib/style.ts";
import { findItem, parseSyllabus, previousSectionNumber, validateSyllabus, type Syllabus, type SyllabusItem } from "./lib/syllabus.ts";
import { headerMatches, parseWords, plainCell, readLessonWords } from "./lib/words.ts";
import { findItemFile, idFromPath, itemPath, readProfile, requireWorkspace, sidecarPath, type Profile } from "./lib/workspace.ts";

const USAGE = `usage: lint.ts <workspace> [ID | talk/<file>.md | reviews/<file>.md ...] [--json]

With no arguments after the workspace, checks syllabus.md, ledger.md and every
generated or done item. With IDs, checks only those items; with a path to a
talk record or a writing review, checks that file. Findings are grouped by
file, then by severity and rule, one "<line>: <message>" per finding under each:
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
  lessonCache: Map<string, { prompts: string[]; meanings: string[]; id: string | null }>;
}

export interface LintResult {
  findings: Finding[];
  errors: number;
  warnings: number;
}

const BOLD_LINK = /^\*\*\[([^\]]+)\]\(([^)\s]+)\)\*\*\s*$/;
const ANY_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;
const VAGUE_LINK_TEXT = new Set(["this", "here", "video", "docs", "link", "the docs", "this video", "this article", "read this"]);
const AUTHORED_MODEL_LINE = "> **Authored model text.** Written for this task, not quoted from a resource.";

function report(ctx: Context, severity: Severity, file: string, line: number, rule: string, message: string): void {
  ctx.findings.push(finding(severity, file, line, rule, message));
}

// The style/* rules hold English prose to STYLE.md. They run on a part only
// when that part is written in the learner's native language and that
// language is English; target-language text is never style-checked.
function styleApplies(ctx: Context, part: AuthoredPart): boolean {
  const native = (ctx.profile?.nativeLanguage ?? "English").trim().toLowerCase();
  return native === "english" && authoredLanguage(ctx.profile?.level ?? "", part) === "native";
}

function checkStyleLines(ctx: Context, file: string, lines: string[], startLine: number): void {
  for (const f of checkStyle(lines, startLine)) report(ctx, f.severity, file, f.line, f.rule, f.message);
}

function checkStyleSection(ctx: Context, file: string, section: Section | null, part: AuthoredPart): void {
  if (section && styleApplies(ctx, part)) checkStyleLines(ctx, file, section.lines, section.startLine);
}

function checkStyleItems(ctx: Context, file: string, items: ListItem[], part: AuthoredPart): void {
  if (!styleApplies(ctx, part)) return;
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

// A lesson's prompt texts and Words meanings, cached, for checkpoint checks.
function lessonParts(ctx: Context, file: string): { prompts: string[]; meanings: string[]; id: string | null } | null {
  if (ctx.lessonCache.has(file)) return ctx.lessonCache.get(file)!;
  if (!existsSync(file)) return null;
  const doc = splitDoc(readFileSync(file, "utf8"));
  const section = findSection(doc, "Retrieval practice");
  const prompts = section
    ? listItems(section)
        .filter((it) => it.ordered)
        .map((it) => parsePrompt(it.text)?.text ?? it.text.trim())
    : [];
  const words = readLessonWords(file);
  const meanings = (words?.rows ?? []).map((r) => plainCell(r.meaning));
  const entry = { prompts, meanings, id: asString(doc.data.id) || idFromPath(file) };
  ctx.lessonCache.set(file, entry);
  return entry;
}

function checkUsedIn(ctx: Context, url: string, id: string): void {
  const row = findRow(ctx.ledger, url);
  if (row && !row.usedIn.includes(id)) {
    report(ctx, "warning", join(ctx.workspace, "ledger.md"), row.line, "ledger/used-in", `${id} uses ${row.url} but is not listed in its Used in cell`);
  }
}

function lintWords(ctx: Context, file: string, section: Section, item: SyllabusItem): void {
  const table = parseWords(section);
  if (table.header === null) {
    report(ctx, "error", file, section.line, "lesson/words", `Words must hold a table with columns ${WORDS_COLUMNS.join(" | ")}`);
    return;
  }
  if (!headerMatches(table)) {
    report(ctx, "error", file, table.headerLine, "lesson/words", `Words columns must be exactly "${WORDS_COLUMNS.join(" | ")}", got "${table.header.join(" | ")}"`);
  }
  if (table.rows.length < WORDS_MIN || table.rows.length > WORDS_MAX) {
    report(ctx, "error", file, section.line, "lesson/words", `expected ${WORDS_MIN} to ${WORDS_MAX} words, found ${table.rows.length}`);
  }
  const seen = new Map<string, number>();
  for (const row of table.rows) {
    if (row.cells.length !== WORDS_COLUMNS.length) report(ctx, "error", file, row.line, "lesson/words", `row has ${row.cells.length} cells, expected ${WORDS_COLUMNS.length}`);
    if (plainCell(row.word) === "") report(ctx, "error", file, row.line, "lesson/words", "empty Word cell");
    if (plainCell(row.meaning) === "") report(ctx, "error", file, row.line, "lesson/words", "empty Meaning cell");
    if (row.reading.trim() === "") report(ctx, "error", file, row.line, "lesson/words", "empty Reading cell; use - when the spelling is the reading");
    const key = plainCell(row.word).toLowerCase();
    if (seen.has(key)) report(ctx, "warning", file, row.line, "lesson/words", `"${plainCell(row.word)}" is listed twice (first at line ${seen.get(key)})`);
    seen.set(key, row.line);
  }
  if (!table.source) {
    report(ctx, "error", file, section.line, "lesson/words-source", 'Words needs a line "Source: [Title](url)" naming the ledger resource the words come from');
  } else if (!ledgerHas(ctx.ledger, table.source.url)) {
    report(ctx, "error", file, table.source.line, "lesson/words-source", `${table.source.url} is not in the ledger`);
  } else {
    checkUsedIn(ctx, table.source.url, item.id);
  }
  for (const line of table.stray) report(ctx, "warning", file, line, "lesson/words", "Words holds only the table and its Source line");
}

function lintLesson(ctx: Context, file: string, doc: Doc, item: SyllabusItem): void {
  const order = ["Introduction", "Lesson overview", "Before you start", "Core idea", "Words", "Assignment", "Retrieval practice", "Additional resources"];
  checkHeadings(ctx, file, doc, order, ["Introduction", "Lesson overview", "Before you start", "Words", "Assignment", "Retrieval practice"], "lesson/headings");
  const lvl = level(ctx);
  if (doc.title !== null && asString(doc.data.title) && doc.title !== asString(doc.data.title)) {
    report(ctx, "warning", file, doc.titleLine, "lesson/title", `# heading "${doc.title}" differs from the frontmatter title`);
  }

  const intro = findSection(doc, "Introduction");
  const overview = findSection(doc, "Lesson overview");
  const before = findSection(doc, "Before you start");
  const core = findSection(doc, "Core idea");
  const words = findSection(doc, "Words");
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
      if (/[?？¿]/.test(text)) report(ctx, "error", file, it.line, "lesson/overview", "overview bullets are never phrased as questions");
      if (!/[.。।]$/.test(text)) report(ctx, "warning", file, it.line, "lesson/overview", "overview bullet should end with a period");
      if (/^\p{Ll}/u.test(text)) report(ctx, "warning", file, it.line, "lesson/overview", "overview bullet should be sentence case");
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
    if (sectionIsEmpty(core)) report(ctx, "error", file, core.line, "lesson/core-idea", "Core idea is empty; omit the heading instead");
    const fences = fenceCount(core.lines);
    if (fences > 1) report(ctx, "error", file, core.line, "lesson/core-idea", `Core idea has ${fences} fenced examples; at most one`);
  }

  if (words) lintWords(ctx, file, words, item);

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
    const labels = new Set<string>();
    items.forEach((it, index) => {
      const n = index + 1;
      const prompt = parsePrompt(it.text);
      if (!prompt || it.continuation.some((l) => l.trim() !== "")) {
        report(ctx, "error", file, it.line, "lesson/retrieval", `prompt ${n} must be one line: "Label: [prompt](#anchor or ledger url)", with Label one of Explain, Say, Recall`);
        return;
      }
      if (!isPromptLabel(prompt.label)) {
        report(ctx, "error", file, it.line, "lesson/retrieval", `prompt ${n}: label "${prompt.label}" must be Explain, Say or Recall`);
        return;
      }
      labels.add(prompt.label);
      if (prompt.target.startsWith("#")) {
        if (!anchors.has(prompt.target.slice(1))) report(ctx, "error", file, it.line, "lesson/retrieval-anchor", `prompt ${n}: no heading with anchor ${prompt.target} in this lesson`);
      } else if (!ledgerHas(ctx.ledger, prompt.target)) {
        report(ctx, "error", file, it.line, "lesson/retrieval-url", `prompt ${n}: ${prompt.target} is not in the ledger`);
      }
    });
    if (items.length > 0 && !labels.has("Explain")) report(ctx, "error", file, retrieval.line, "lesson/retrieval-explain", "at least one prompt is labelled Explain: the learner explains a pattern in their own words");
    if (items.length > 0 && !labels.has("Say")) report(ctx, "error", file, retrieval.line, "lesson/retrieval-say", "at least one prompt is labelled Say: the learner produces the language");
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
  const count = authored.reduce((sum, s) => sum + wordCount(s.lines), 0);
  if (lvl) {
    if (count > WORD_BUDGET[lvl]) report(ctx, "error", file, intro?.line ?? 1, "lesson/budget", `${count} authored words in Introduction, Lesson overview and Core idea; the ${lvl} budget is ${WORD_BUDGET[lvl]}`);
  } else {
    report(ctx, "warning", file, 1, "lesson/budget", `cannot check the word budget: profile.md level is not one of ${LEVELS.join(", ")} (${count} authored words)`);
  }
  checkStyleSection(ctx, file, intro, "introduction");
  checkStyleSection(ctx, file, overview, "overview");
  checkStyleSection(ctx, file, core, "core");
  checkStyleSection(ctx, file, assignment, "assignment");
  checkStyleSection(ctx, file, additional, "assignment");

  const cited = [intro, core].filter((s): s is Section => s !== null).flatMap((s) => urlsIn(s.lines, s.startLine));
  let unverified = 0;
  for (const ref of cited) {
    if (!ledgerHas(ctx.ledger, ref.url)) report(ctx, "error", file, ref.line, "lesson/citation", `${ref.url} is cited but not in the ledger`);
    if (ctx.fetched === null) unverified++;
    else if (!ctx.fetched.has(canonicalUrl(ref.url))) report(ctx, "error", file, ref.line, "lesson/citation-fetched", `${ref.url} is cited but not recorded in ${DATA_DIR}/fetched.jsonl`);
  }
  if (unverified > 0) report(ctx, "warning", file, 1, "lesson/citation-fetched", `${DATA_DIR}/fetched.jsonl is missing; ${unverified} citation(s) could not be verified as fetched`);

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
    checkStyleItems(ctx, sidecarFile, [...sidecar.prediction, ...sidecar.retrieval], "sidecar");
  }
}

function kindForType(type: string): string {
  if (type === "guided-task") return "guided";
  if (type === "capstone") return "capstone";
  return "independent";
}

function lintTask(ctx: Context, file: string, doc: Doc, item: SyllabusItem): void {
  const kind = asString(doc.data.kind);
  if (!(TASK_KINDS as readonly string[]).includes(kind)) {
    report(ctx, "error", file, 1, "task/kind", `kind "${kind}" must be one of ${TASK_KINDS.join(", ")}`);
  } else if (kind !== kindForType(item.type)) {
    report(ctx, "error", file, 1, "task/kind", `kind "${kind}" does not match the syllabus type ${item.type} (expected ${kindForType(item.type)})`);
  }
  const skills = asList(doc.data.skills);
  if (skills.length === 0) report(ctx, "error", file, 1, "task/skills", `frontmatter skills must list what the task exercises: ${LANGUAGE_SKILLS.join(", ")}`);
  for (const skill of skills) {
    if (!(LANGUAGE_SKILLS as readonly string[]).includes(skill)) report(ctx, "error", file, 1, "task/skills", `skill "${skill}" must be one of ${LANGUAGE_SKILLS.join(", ")}`);
  }
  for (const id of asList(doc.data.reuses)) {
    if (!findItem(ctx.syllabus.items, id)) report(ctx, "warning", file, 1, "task/reuses", `reuses ${id}, which is not in the syllabus`);
  }
  if (doc.title !== null) {
    const m = /^Task:\s*(.*)$/.exec(doc.title);
    if (!m) report(ctx, "error", file, doc.titleLine, "task/title", `the heading must be "# Task: <title>", got "# ${doc.title}"`);
    else if (asString(doc.data.title) && m[1] !== asString(doc.data.title)) report(ctx, "warning", file, doc.titleLine, "task/title", `heading title "${m[1]}" differs from the frontmatter title`);
  }
  const order = ["Introduction", "Model", "Assignment", "Extra credit", "Rules", "Done when"];
  checkHeadings(ctx, file, doc, order, ["Introduction", "Assignment", "Rules", "Done when"], "task/headings");

  const intro = findSection(doc, "Introduction");
  if (intro && sectionIsEmpty(intro)) report(ctx, "error", file, intro.line, "task/introduction", "Introduction is empty");

  const model = findSection(doc, "Model");
  const isGuided = item.type === "guided-task";
  if (isGuided && !model) report(ctx, "error", file, doc.titleLine || 1, "task/model", "guided tasks need a ## Model section: a model text with gaps marked ___");
  if (!isGuided && model) report(ctx, "error", file, model.line, "task/model", `## Model belongs to guided tasks only; this one is ${item.type}`);
  if (isGuided && model) {
    const first = firstContentLine(model);
    if (!first || first.text.trim() !== AUTHORED_MODEL_LINE) {
      if (!first || !/^>\s*\*\*From\b/.test(first.text.trim())) {
        report(ctx, "error", file, first?.line ?? model.line, "task/model", `the Model opens with "${AUTHORED_MODEL_LINE}", or "> **From [Title](url).**" when it quotes a ledger resource`);
      }
    }
    if (!model.lines.some((l) => l.includes("___"))) report(ctx, "error", file, model.line, "task/model", "the Model marks every gap the learner fills with ___; none found");
  }

  const assignment = findSection(doc, "Assignment");
  if (assignment && listItems(assignment).filter((it) => it.ordered).length === 0) {
    report(ctx, "error", file, assignment.line, "task/assignment", "Assignment must be a numbered list of requirements");
  }

  const rules = findSection(doc, "Rules");
  if (rules) {
    const lines = rules.lines.map((l, i) => ({ text: l.trim(), line: rules.startLine + i })).filter((l) => l.text !== "");
    if (lines.length !== TASK_RULES_LINES.length) {
      report(ctx, "error", file, rules.line, "task/rules", `Rules must be exactly the fixed ${TASK_RULES_LINES.length} bullets, found ${lines.length} lines`);
    }
    lines.forEach((l, i) => {
      if (TASK_RULES_LINES[i] !== undefined && l.text !== TASK_RULES_LINES[i]) {
        report(ctx, "error", file, l.line, "task/rules", `Rules bullet ${i + 1} is not verbatim; expected "${TASK_RULES_LINES[i]}"`);
      }
    });
  }

  const done = findSection(doc, "Done when");
  if (done) {
    const items = listItems(done);
    if (items.length === 0) report(ctx, "error", file, done.line, "task/done-when", "Done when must be a task list (- [ ] outcome)");
    for (const it of items) {
      if (it.checked === null) report(ctx, "error", file, it.line, "task/done-when", "each Done when item is a task list item: - [ ] ...");
    }
  }
  for (const section of [intro, assignment, findSection(doc, "Extra credit"), done]) checkStyleSection(ctx, file, section, "task");
}

// "<label>: [text](../lessons/<file>.md#anchor) (<ID>)" in a checkpoint.
const CHECKPOINT_PROMPT = /^(?:([A-Z][a-z]+):\s+)?\[(.+?)\]\(([^)\s]+)\)\s+\(([LTC]\d{2})\)\s*$/;

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
  const below = doc.sections.find((s) => /^If you scored below \d+$/.test(s.heading));
  for (const section of doc.sections) {
    if (section.heading !== "Prompts" && section.heading !== "Words" && section !== below) {
      report(ctx, "error", file, section.line, "checkpoint/headings", `unexpected heading "## ${section.heading}"; expected Prompts, Words and If you scored below M`);
    }
  }
  const prompts = findSection(doc, "Prompts");
  const words = findSection(doc, "Words");
  if (!prompts) report(ctx, "error", file, doc.titleLine || 1, "checkpoint/headings", 'missing "## Prompts"');

  let predicted: number | null = null;
  doc.preamble.forEach((line, i) => {
    const m = /^Predicted:\s*___\s*\/\s*(\d+)\s*$/.exec(line.trim());
    if (m) predicted = Number(m[1]);
    else if (/^Predicted:/i.test(line.trim())) report(ctx, "error", file, doc.preambleLine + i, "checkpoint/predicted", 'the line must read "Predicted: ___ / N"');
  });
  if (predicted === null) report(ctx, "error", file, doc.titleLine || 1, "checkpoint/predicted", 'missing "Predicted: ___ / N" line before the prompts');

  const linked: string[] = [];
  const promptIds: string[] = [];
  let promptCount = 0;
  let wordCountTotal = 0;
  let actual: number | null = null;
  const findActual = (section: Section) =>
    section.lines.forEach((line, i) => {
      const m = /^Actual:\s*___\s*\/\s*(\d+)\s*$/.exec(line.trim());
      if (m) actual = Number(m[1]);
      else if (/^Actual:/i.test(line.trim())) report(ctx, "error", file, section.startLine + i, "checkpoint/actual", 'the line must read "Actual: ___ / N"');
    });

  const checkLink = (n: number, target: string, id: string, anchor: string, line: number, kind: string) => {
    const [path, hash] = target.split("#");
    const lessonFile = resolve(dirname(file), path);
    if (idFromPath(lessonFile) !== id) report(ctx, "error", file, line, "checkpoint/link", `${kind} ${n}: link points at ${basename(lessonFile)} but is labelled (${id})`);
    if (hash !== anchor) report(ctx, "error", file, line, "checkpoint/link", `${kind} ${n}: the link must end in #${anchor}`);
    return lessonFile;
  };

  if (prompts) {
    const items = listItems(prompts).filter((it) => it.ordered);
    promptCount = items.length;
    if (promptCount < 6 || promptCount > 10) report(ctx, "error", file, prompts.line, "checkpoint/prompts", `expected six to ten prompts, found ${promptCount}`);
    items.forEach((it, index) => {
      const n = index + 1;
      const m = CHECKPOINT_PROMPT.exec(it.text.trim());
      if (!m || !m[1]) {
        report(ctx, "error", file, it.line, "checkpoint/prompts", `prompt ${n} must be "Label: [prompt](../lessons/<ID>-<slug>.md#retrieval-practice) (<ID>)"`);
        return;
      }
      const [, , text, target, id] = m;
      linked.push(id);
      promptIds.push(id);
      const lessonFile = checkLink(n, target, id, "retrieval-practice", it.line, "prompt");
      const source = lessonParts(ctx, lessonFile);
      if (!source) report(ctx, "error", file, it.line, "checkpoint/link", `prompt ${n}: ${target.split("#")[0]} does not exist`);
      else if (!source.prompts.includes(text)) report(ctx, "error", file, it.line, "checkpoint/verbatim", `prompt ${n} is not verbatim in ${id}'s Retrieval practice: "${text}"`);
    });
    findActual(prompts);
  }

  if (words) {
    const items = listItems(words).filter((it) => it.ordered);
    wordCountTotal = items.length;
    if (wordCountTotal > 12) report(ctx, "error", file, words.line, "checkpoint/words", `expected at most twelve words, found ${wordCountTotal}`);
    items.forEach((it, index) => {
      const n = index + 1;
      const m = CHECKPOINT_PROMPT.exec(it.text.trim());
      if (!m || m[1]) {
        report(ctx, "error", file, it.line, "checkpoint/words", `word ${n} must be "[meaning](../lessons/<ID>-<slug>.md#words) (<ID>)"`);
        return;
      }
      const [, , meaning, target, id] = m;
      linked.push(id);
      const lessonFile = checkLink(n, target, id, "words", it.line, "word");
      const source = lessonParts(ctx, lessonFile);
      if (!source) report(ctx, "error", file, it.line, "checkpoint/link", `word ${n}: ${target.split("#")[0]} does not exist`);
      else if (!source.meanings.includes(meaning)) report(ctx, "error", file, it.line, "checkpoint/verbatim", `word ${n}: "${meaning}" is not a Meaning in ${id}'s Words`);
    });
    findActual(words);
  }
  if (prompts && actual === null) report(ctx, "error", file, (words ?? prompts).line, "checkpoint/actual", 'missing "Actual: ___ / N" line after the prompts and words');

  const count = promptCount + wordCountTotal;
  if (predicted !== null && count > 0 && predicted !== count) report(ctx, "error", file, doc.titleLine || 1, "checkpoint/count", `Predicted says ${predicted} but there are ${count} prompts and words`);
  if (actual !== null && count > 0 && actual !== count) report(ctx, "error", file, prompts?.line ?? 1, "checkpoint/count", `Actual says ${actual} but there are ${count} prompts and words`);

  const linkedSet = [...new Set(linked)].sort();
  const sampleSet = [...new Set(samples)].sort();
  if (linked.length > 0 && linkedSet.join(",") !== sampleSet.join(",")) {
    report(ctx, "error", file, 1, "checkpoint/samples", `frontmatter samples [${sampleSet.join(", ")}] do not match the lessons linked in Prompts and Words [${linkedSet.join(", ")}]`);
  }

  const previous = previousSectionNumber(ctx.syllabus, item.section);
  let own = 0;
  for (const id of [...new Set(linked)]) {
    const lesson = findItem(ctx.syllabus.items, id);
    if (!lesson) continue;
    if (lesson.section === item.section) continue;
    if (previous === null) report(ctx, "error", file, 1, "checkpoint/sampling", `${id} is from section ${lesson.section}; the first checkpoint samples only its own section`);
    else if (lesson.section !== previous) report(ctx, "error", file, 1, "checkpoint/sampling", `${id} is from section ${lesson.section}; sample only sections ${item.section} and ${previous}`);
  }
  for (const id of promptIds) if (findItem(ctx.syllabus.items, id)?.section === item.section) own++;
  if (previous !== null && promptCount > 0 && Math.abs(own - Math.round((promptCount * 2) / 3)) > 1) {
    report(ctx, "warning", file, 1, "checkpoint/sampling", `${own} of ${promptCount} prompts are from section ${item.section}; about two thirds should be`);
  }

  if (!below) {
    report(ctx, "error", file, doc.titleLine || 1, "checkpoint/below", 'missing "## If you scored below M"');
  } else {
    const m = Number(/\d+$/.exec(below.heading)![0]);
    const expected = Math.floor((count * 3) / 4);
    if (count > 0 && m !== expected) report(ctx, "error", file, below.line, "checkpoint/below", `M is ${m} but three quarters of ${count} rounded down is ${expected}`);
    const items = listItems(below);
    const mentioned = new Set(items.map((it) => /^([LTC]\d{2})\b/.exec(it.text.trim())?.[1] ?? ""));
    if (items.length === 0) report(ctx, "error", file, below.line, "checkpoint/below", "the re-read list is empty");
    for (const id of sampleSet) {
      if (!mentioned.has(id)) report(ctx, "warning", file, below.line, "checkpoint/reread", `no re-read pointer for ${id}; name one place per sampled lesson`);
    }
  }
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
    else lintTask(ctx, file, doc, item);
  } catch (error) {
    // A parse failure in one file (bad frontmatter, most often) is one finding
    // that names the file, not the end of the run.
    report(ctx, "error", file, 1, "item/parse", `cannot parse ${basename(file)}: ${(error as Error).message}`);
  }
}

function lintTalkRecord(ctx: Context, file: string): void {
  const record = parseTalkRecord(file, readFileSync(file, "utf8"));
  if (!DATE_PATTERN.test(record.date)) report(ctx, "error", file, 1, "talk/frontmatter", `date "${record.date}" must be YYYY-MM-DD`);
  if (record.scope === "") report(ctx, "error", file, 1, "talk/frontmatter", "missing frontmatter scope: an item ID, a section number or free");
  if (record.turns === null) report(ctx, "error", file, 1, "talk/frontmatter", "missing or non-numeric frontmatter turns");
  if (record.title === null || !/^Talk:\s*\S/.test(record.title)) report(ctx, "error", file, record.doc.titleLine || 1, "talk/title", 'the heading must be "# Talk: <scenario>"');
  checkHeadings(ctx, file, record.doc, ["Corrections", "Focus next"], ["Corrections", "Focus next"], "talk/headings");
  if (record.table.header === null) {
    if (findSection(record.doc, "Corrections")) report(ctx, "error", file, 1, "talk/corrections", `Corrections must hold a table with columns ${TALK_COLUMNS.join(" | ")}`);
  } else if (record.table.header.join(" | ") !== TALK_COLUMNS.join(" | ")) {
    report(ctx, "error", file, record.table.headerLine, "talk/corrections", `columns must be exactly "${TALK_COLUMNS.join(" | ")}", got "${record.table.header.join(" | ")}"`);
  }
  if (record.corrections.length > TALK_MAX_CORRECTIONS) report(ctx, "error", file, record.table.headerLine, "talk/corrections", `${record.corrections.length} corrections; at most ${TALK_MAX_CORRECTIONS}, the ones that matter most`);
  for (const c of record.corrections) {
    if (c.wrote === "" || c.better === "") report(ctx, "error", file, c.line, "talk/corrections", "each correction names what the learner wrote and the better form");
    if (c.why === "") report(ctx, "warning", file, c.line, "talk/corrections", "empty Why cell; name the rule in a few words");
    if (c.lesson !== "-" && !(ID_PATTERN.test(c.lesson) && findItem(ctx.syllabus.items, c.lesson))) {
      report(ctx, "error", file, c.line, "talk/corrections", `Lesson "${c.lesson}" must be an item in the syllabus, or - when none teaches it`);
    }
  }
  if (record.focus === "") report(ctx, "error", file, 1, "talk/focus", "Focus next is empty; name what the next talk should practise");
}

function lintReview(ctx: Context, file: string): void {
  const review = parseReview(file, readFileSync(file, "utf8"));
  if (review.item !== "" && review.item !== "-" && !findItem(ctx.syllabus.items, review.item)) {
    report(ctx, "warning", file, 1, "review/item", `item ${review.item} is not in the syllabus`);
  }
  if (review.round === null || review.round < 1) report(ctx, "error", file, 1, "review/frontmatter", "frontmatter round must be 1 or more");
  if (!DATE_PATTERN.test(asString(review.data.date))) report(ctx, "error", file, 1, "review/frontmatter", "frontmatter date must be YYYY-MM-DD");
  if (review.title === null || !/^Review:\s*\S/.test(review.title)) report(ctx, "error", file, review.doc.titleLine || 1, "review/title", 'the heading must be "# Review: <what was written>"');
  checkHeadings(ctx, file, review.doc, ["Text", "Marks", "Next step"], ["Text", "Marks", "Next step"], "review/headings");
  if (review.table.header === null) {
    if (findSection(review.doc, "Marks")) report(ctx, "error", file, 1, "review/marks", `Marks must hold a table with columns ${REVIEW_COLUMNS.join(" | ")}`);
  } else if (review.table.header.join(" | ") !== REVIEW_COLUMNS.join(" | ")) {
    report(ctx, "error", file, review.table.headerLine, "review/marks", `columns must be exactly "${REVIEW_COLUMNS.join(" | ")}", got "${review.table.header.join(" | ")}"`);
  }
  if (review.marks.length > REVIEW_MAX_MARKS) report(ctx, "error", file, review.table.headerLine, "review/marks", `${review.marks.length} marks; mark at most ${REVIEW_MAX_MARKS}, the ones the current section teaches first`);
  const plain = review.text.replace(/\s*\[\d+\]/g, "");
  review.marks.forEach((mark, index) => {
    const n = index + 1;
    if (mark.n !== n) report(ctx, "error", file, mark.line, "review/marks", `mark numbers run 1, 2, 3 in order; expected ${n}`);
    if (!(ERROR_CODES as readonly string[]).includes(mark.code)) report(ctx, "error", file, mark.line, "review/code", `code "${mark.code}" must be one of ${ERROR_CODES.join(", ")}`);
    if (!REVIEW_STATUSES.includes(mark.status)) report(ctx, "error", file, mark.line, "review/status", `status "${mark.status}" must be one of ${REVIEW_STATUSES.join(", ")}`);
    if (mark.hint.trim() === "") report(ctx, "error", file, mark.line, "review/hint", "empty Hint; give a question or a pointer, never the corrected form");
    if (!review.text.includes(`[${n}]`)) report(ctx, "error", file, mark.line, "review/marker", `mark ${n} has no [${n}] marker in the Text section`);
    const where = mark.where.replace(/^["“'`]+|["”'`]+$/g, "").trim();
    if (where !== "" && !plain.includes(where)) report(ctx, "warning", file, mark.line, "review/where", `"${where}" does not appear in the Text section`);
  });
  if (styleApplies(ctx, "sidecar")) {
    for (const mark of review.marks) checkStyleLines(ctx, file, [mark.hint], mark.line);
  }
}

export function lintWorkspace(workspace: string, targets: string[] = []): LintResult {
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
  const files = targets.filter((t) => t.endsWith(".md"));
  const ids = targets.filter((t) => !t.endsWith(".md")).map((t) => t.toUpperCase());
  let ledger: Ledger = { data: {}, header: null, headerLine: 0, rows: [], excluded: [], notes: [], urls: new Set() };
  if (existsSync(ledgerFile)) {
    try {
      ledger = parseLedger(readFileSync(ledgerFile, "utf8"));
    } catch (error) {
      findings.push(finding("error", ledgerFile, 0, "ledger/parse", (error as Error).message));
    }
  } else if (targets.length === 0 || syllabus.items.some((it) => ids.includes(it.id) && it.type === "lesson")) {
    findings.push(finding("error", ledgerFile, 0, "ledger/missing", "ledger.md does not exist"));
  }
  const ctx: Context = { workspace, syllabus, ledger, fetched: readFetched(workspace), profile, findings, lessonCache: new Map() };

  if (targets.length === 0) {
    findings.push(
      ...validateSyllabus(syllabus, syllabusFile, workspace, {
        level: profile?.level,
        hoursPerWeek: profile?.hoursPerWeek,
        created: profile?.created,
        targetDate: profile?.targetDate,
      }),
    );
    if (existsSync(ledgerFile)) findings.push(...validateLedger(ledger, ledgerFile, new Set(syllabus.items.map((it) => it.id))));
    if (styleApplies(ctx, "introduction")) {
      const syllabusDoc = splitDoc(readFileSync(syllabusFile, "utf8"));
      checkStyleLines(ctx, syllabusFile, syllabusDoc.preamble, syllabusDoc.preambleLine);
    }
    for (const item of syllabus.items) {
      if ((item.status === "generated" || item.status === "done") && ID_PATTERN.test(item.id)) lintItem(ctx, item);
    }
  }
  for (const id of ids) {
    const item = findItem(syllabus.items, id);
    if (!item) {
      findings.push(finding("error", syllabusFile, 0, "item/unknown", `no item ${id} in the syllabus`));
      continue;
    }
    lintItem(ctx, item);
  }
  for (const target of files) {
    const file = resolve(workspace, target);
    if (!existsSync(file)) {
      findings.push(finding("error", file, 0, "record/missing", `${target} does not exist`));
      continue;
    }
    const dir = basename(dirname(file));
    try {
      checkLinkSchemes(ctx, file, readFileSync(file, "utf8"));
      if (dir === "talk") lintTalkRecord(ctx, file);
      else if (dir === "reviews") lintReview(ctx, file);
      else findings.push(finding("error", file, 0, "record/unknown", `${target} is neither a talk record in talk/ nor a review in reviews/`));
    } catch (error) {
      findings.push(finding("error", file, 1, "record/parse", `cannot parse ${basename(file)}: ${(error as Error).message}`));
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
  const [workspaceArg, ...targets] = args.positionals;
  if (!workspaceArg) throw Object.assign(new Error("expected <workspace>"), { code: 2 });
  const workspace = requireWorkspace(workspaceArg);
  const result = lintWorkspace(workspace, targets);
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
