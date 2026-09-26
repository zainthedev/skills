#!/usr/bin/env node
// Checks one review against REVIEW-FORMAT.md: the flags table, at most seven
// open flags, the three lines every flag carries, no fenced code under Flags,
// and the style rules on the prose. The flags hold no code because the
// learner writes every fix, and an answer they ask for is given in chat.

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { CliError, isMain, parseCli, runCli } from "./lib/cli.ts";
import { finding, hasErrors, type Finding, type Severity } from "./lib/findings.ts";
import { asString } from "./lib/frontmatter.ts";
import { FLAG_COLUMNS, FLAG_STATUSES, MAX_OPEN_FLAGS, REVIEW_CATEGORIES, REVIEW_SEVERITIES, parseReview } from "./lib/review.ts";
import { findSection, linksIn, splitDoc, type Section } from "./lib/sections.ts";
import { checkStyle } from "./lib/style.ts";

const USAGE = `usage: review-lint.ts <review file> [--json]

One "<line>: <message>" per finding under its severity and rule. Exit 1 when
any error was found, 0 otherwise.`;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCATION = /^[^\s:]+(?::\d+(?:-\d+)?)?$/;
const FLAG_HEADING = /^###\s+(\d+)\.\s+(.+?)\s*$/;
const FLAG_FIELDS = ["Why it matters", "Look", "Question"];
const HEADINGS = ["Summary", "Flags", "Held back"];
const SAFE_SCHEMES = new Set(["http", "https", "mailto"]);

export interface LintResult {
  findings: Finding[];
  errors: number;
  warnings: number;
}

function isSafeHref(href: string): boolean {
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(href.trim());
  return !m || SAFE_SCHEMES.has(m[1].toLowerCase());
}

export function lintReview(file: string): LintResult {
  const findings: Finding[] = [];
  const report = (severity: Severity, line: number, rule: string, message: string) => findings.push(finding(severity, file, line, rule, message));
  const style = (lines: string[], startLine: number) => {
    for (const f of checkStyle(lines, startLine)) report(f.severity, f.line, f.rule, f.message);
  };
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    report("error", 0, "review/missing", `cannot read ${file}: ${(error as Error).message}`);
    return summarize(findings);
  }
  const doc = splitDoc(text);
  const fm = doc.frontmatterLines > 0 ? 1 : 0;
  if (!asString(doc.data.scope)) report("error", fm, "review/frontmatter", "frontmatter needs scope");
  if (!DATE.test(asString(doc.data.reviewed))) report("error", fm, "review/frontmatter", "frontmatter needs reviewed: YYYY-MM-DD");
  if (!doc.title || !/^Review: \S/.test(doc.title)) report("error", doc.titleLine, "review/title", 'the title is "# Review: <scope>"');

  let last = -1;
  const seen = new Set<string>();
  for (const section of doc.sections) {
    const index = HEADINGS.indexOf(section.heading);
    if (index < 0) report("error", section.line, "review/headings", `unexpected heading "## ${section.heading}"; allowed: ${HEADINGS.join(", ")}`);
    else if (seen.has(section.heading)) report("error", section.line, "review/headings", `duplicate heading "## ${section.heading}"`);
    else if (index < last) report("error", section.line, "review/headings", `"## ${section.heading}" is out of order; expected order: ${HEADINGS.join(", ")}`);
    seen.add(section.heading);
    last = Math.max(last, index);
  }
  for (const heading of ["Summary", "Flags"]) {
    if (!seen.has(heading)) report("error", doc.titleLine || 1, "review/headings", `missing required heading "## ${heading}"`);
  }

  let fence = false;
  text.split("\n").forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) return;
    for (const link of linksIn(line)) {
      if (!isSafeHref(link.target)) report("error", i + 1, "link/scheme", `link target "${link.target}" must be http(s), mailto, relative or an anchor`);
    }
  });

  const review = parseReview(text);
  const flagsSection = findSection(doc, "Flags");
  if (flagsSection && review.tableLine === 0) report("error", flagsSection.line, "review/table", `## Flags starts with the table: ${FLAG_COLUMNS.join(" | ")}`);
  if (review.tableLine > 0) {
    const header = text
      .split("\n")
      [review.tableLine - 1].split(/(?<!\\)\|/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (header.join("|") !== FLAG_COLUMNS.join("|")) report("error", review.tableLine, "review/table", `the columns are ${FLAG_COLUMNS.join(" | ")}`);
  }
  review.flags.forEach((flag, i) => {
    if (flag.number !== i + 1) report("error", flag.line, "review/number", `flags are numbered 1, 2, 3 in table order; this row is ${i + 1}`);
    if (!(REVIEW_CATEGORIES as readonly string[]).includes(flag.category)) report("error", flag.line, "review/category", `category "${flag.category}" is not one of ${REVIEW_CATEGORIES.join(", ")}`);
    if (!(REVIEW_SEVERITIES as readonly string[]).includes(flag.severity)) report("error", flag.line, "review/severity", `severity "${flag.severity}" is not one of ${REVIEW_SEVERITIES.join(", ")}`);
    if (!LOCATION.test(flag.location)) report("error", flag.line, "review/location", `location "${flag.location}" is path, path:line or path:start-end, from the repository root`);
    if (!(FLAG_STATUSES as readonly string[]).includes(flag.status)) report("error", flag.line, "review/status", `status "${flag.status}" is not one of ${FLAG_STATUSES.join(", ")}`);
  });
  const open = review.flags.filter((f) => f.status === "open").length;
  if (open > MAX_OPEN_FLAGS) report("error", review.tableLine, "review/too-many", `${open} flags are open; at most ${MAX_OPEN_FLAGS}, and the rest are counted under ## Held back`);

  if (flagsSection) {
    const blocks = new Map<number, { title: string; line: number; lines: string[] }>();
    let current: { title: string; line: number; lines: string[] } | null = null;
    let inFence = false;
    flagsSection.lines.forEach((raw, i) => {
      const line = flagsSection.startLine + i;
      if (/^\s*(```|~~~)/.test(raw)) {
        if (!inFence) report("error", line, "review/code", "a flag shows no code block: the learner writes the fix");
        inFence = !inFence;
        return;
      }
      if (inFence) return;
      const heading = FLAG_HEADING.exec(raw);
      if (heading) {
        current = { title: heading[2], line, lines: [] };
        blocks.set(Number(heading[1]), current);
        return;
      }
      if (current) current.lines.push(raw);
      for (const m of raw.matchAll(/`([^`]+)`/g)) {
        if (m[1].length > 40) report("warning", line, "review/long-code", "inline code over 40 characters reads like a fix; point at the code by location instead");
      }
    });
    for (const flag of review.flags) {
      const block = blocks.get(flag.number);
      if (!block) {
        report("error", flag.line, "review/flag-missing", `flag ${flag.number} has no "### ${flag.number}. ${flag.title}" section`);
        continue;
      }
      if (block.title !== flag.title) report("error", block.line, "review/flag-title", `the heading's title differs from the table's: "${flag.title}"`);
      const body = block.lines.join("\n");
      for (const field of FLAG_FIELDS) {
        if (!new RegExp(`^\\s*- \\*\\*${field}:\\*\\*\\s+\\S`, "m").test(body)) report("error", block.line, "review/flag-field", `flag ${flag.number} needs a "- **${field}:**" line`);
      }
      const question = /^\s*- \*\*Question:\*\*\s+(.+)$/m.exec(body);
      if (question && !question[1].trim().endsWith("?")) report("error", block.line, "review/question", `flag ${flag.number}'s Question ends with a question mark`);
      style(block.lines, block.line + 1);
    }
    for (const [number, block] of blocks) {
      if (!review.flags.some((f) => f.number === number)) report("error", block.line, "review/flag-orphan", `section ${number} has no row in the flags table`);
    }
  }
  for (const section of [findSection(doc, "Summary"), findSection(doc, "Held back")] as (Section | null)[]) {
    if (section) style(section.lines, section.startLine);
  }
  style(doc.preamble, doc.preambleLine);
  findings.sort((a, b) => a.line - b.line);
  return summarize(findings);
}

function summarize(findings: Finding[]): LintResult {
  return {
    findings,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
  };
}

// Findings grouped by severity and rule, so each rule name appears once.
export function formatGrouped(findings: Finding[]): string[] {
  const byRule = new Map<string, Finding[]>();
  for (const f of findings) byRule.set(`${f.severity} ${f.rule}`, [...(byRule.get(`${f.severity} ${f.rule}`) ?? []), f]);
  const keys = [...byRule.keys()].sort((a, b) => (a.startsWith("error") === b.startsWith("error") ? a.localeCompare(b) : a.startsWith("error") ? -1 : 1));
  return keys.flatMap((key) => [key, ...byRule.get(key)!.map((f) => `  ${f.line}: ${f.message}`)]);
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {});
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const [fileArg] = args.positionals;
  if (!fileArg) throw new CliError("expected <review file>", 2);
  const file = resolve(fileArg);
  const result = lintReview(file);
  if (args.values.json) {
    console.log(JSON.stringify({ file, errors: result.errors, warnings: result.warnings, findings: result.findings }, null, 2));
  } else {
    console.log(basename(file));
    for (const line of formatGrouped(result.findings)) console.log(`  ${line}`);
    console.log(`${result.errors} error(s), ${result.warnings} warning(s)`);
  }
  return hasErrors(result.findings) ? 1 : 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
