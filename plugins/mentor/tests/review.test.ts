import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lintReview } from "../skills/mentor-review/scripts/review-lint.ts";
import { findDojoWorkspace, locationFile, parseReview, scopeSlug, setFlag } from "../skills/mentor-review/scripts/lib/review.ts";
import { DOJO_WORKSPACE, FIXTURES, removeDir, runScript, tempDir } from "./helpers.ts";

const REVIEW = readFileSync(join(FIXTURES, "review.md"), "utf8");

function reviewFile(dir: string, text = REVIEW): string {
  mkdirSync(join(dir, ".mentor", "reviews"), { recursive: true });
  const path = join(dir, ".mentor", "reviews", "branch-feature-cart.md");
  writeFileSync(path, text);
  return path;
}

test("the flags table parses into flags with their table lines", () => {
  const review = parseReview(REVIEW);
  assert.equal(review.flags.length, 2);
  assert.deepEqual(
    { ...review.flags[0], line: 0 },
    { number: 1, category: "bug", severity: "high", location: "src/cart.ts:42-48", title: "Total of an empty cart", status: "open", answered: false, line: 0 },
  );
  assert.equal(REVIEW.split("\n")[review.flags[1].line - 1].startsWith("| 2 |"), true);
  assert.equal(locationFile("src/cart.ts:42-48"), "src/cart.ts");
  assert.equal(locationFile("`src/a.ts:3`"), "src/a.ts");
  assert.equal(locationFile("src/utils/date.ts"), "src/utils/date.ts");
});

test("setFlag rewrites one row's cells and nothing else", () => {
  const { text, row } = setFlag(REVIEW, 2, { status: "resolved", answered: true });
  assert.equal(row, "| 2 | hand-rolled | medium | src/utils/date.ts | Date arithmetic | resolved | yes |");
  const before = REVIEW.split("\n");
  const after = text.split("\n");
  assert.equal(after.length, before.length);
  assert.deepEqual(
    after.map((l, i) => (l === before[i] ? null : i)).filter((i) => i !== null),
    [parseReview(REVIEW).flags[1].line - 1],
  );
  assert.throws(() => setFlag(REVIEW, 9, { status: "resolved" }), /no flag 9/);
  assert.throws(() => setFlag(REVIEW, 1, { status: "done" }), /invalid status/);
});

test("review-mark updates a flag, and refuses files outside a reviews directory", () => {
  const dir = tempDir();
  try {
    const path = reviewFile(dir);
    const result = runScript("review-mark.ts", [path, "1", "--answered"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\| open \| yes \|/);
    assert.equal(parseReview(readFileSync(path, "utf8")).flags[0].answered, true);
    assert.equal(runScript("review-mark.ts", [path, "1"]).status, 2);
    const stray = join(dir, "notes.md");
    writeFileSync(stray, REVIEW);
    assert.equal(runScript("review-mark.ts", [stray, "1", "--status", "resolved"]).status, 2);
    assert.equal(readFileSync(stray, "utf8"), REVIEW);
  } finally {
    removeDir(dir);
  }
});

test("a review in the format passes lint", () => {
  const dir = tempDir();
  try {
    const result = lintReview(reviewFile(dir));
    assert.deepEqual(result.findings, []);
    const cli = runScript("review-lint.ts", [join(dir, ".mentor", "reviews", "branch-feature-cart.md")]);
    assert.equal(cli.status, 0, cli.stdout);
  } finally {
    removeDir(dir);
  }
});

test("lint catches a flag that shows code, drifts from its row, or breaks the format", () => {
  const dir = tempDir();
  try {
    const broken = REVIEW.replace("| 2 | hand-rolled | medium |", "| 3 | nitpick | urgent |")
      .replace("### 1. Total of an empty cart", "### 1. Missing initial value")
      .replace("- **Question:** What does the payment API receive when `items` is empty?", "- **Question:** Add an initial value.\n\n```ts\nitems.reduce((s, i) => s + i.price, 0)\n```")
      .replace("- **Look:** log", "- **Peek:** log");
    const rules = new Set(lintReview(reviewFile(dir, broken)).findings.map((f) => f.rule));
    for (const rule of ["review/number", "review/category", "review/severity", "review/flag-title", "review/question", "review/code", "review/flag-field", "review/flag-missing", "review/flag-orphan"]) {
      assert.ok(rules.has(rule), rule);
    }
    const eight = REVIEW.replace(
      "| 2 | hand-rolled | medium | src/utils/date.ts | Date arithmetic | open | no |",
      Array.from({ length: 7 }, (_, i) => `| ${i + 2} | bug | low | src/a.ts | Flag ${i + 2} | open | no |`).join("\n"),
    );
    assert.ok(lintReview(reviewFile(dir, eight)).findings.some((f) => f.rule === "review/too-many"));
    const noTitle = REVIEW.replace("# Review: branch feature/cart", "# Branch review").replace("reviewed: 2026-09-26", "reviewed: today");
    const noTitleRules = new Set(lintReview(reviewFile(dir, noTitle)).findings.map((f) => f.rule));
    assert.ok(noTitleRules.has("review/title") && noTitleRules.has("review/frontmatter"));
  } finally {
    removeDir(dir);
  }
});

test("a dojo workspace is found from inside it, and scope slugs name review files", () => {
  assert.equal(findDojoWorkspace(join(DOJO_WORKSPACE, "projects", "P01-todo-api", "starter", "app.js")), DOJO_WORKSPACE);
  assert.equal(findDojoWorkspace(FIXTURES), null);
  assert.equal(scopeSlug("branch feature/cart in src/api"), "branch-feature-cart-in-src-api");
  assert.equal(scopeSlug("!!!"), "review");
  assert.ok(scopeSlug("x ".repeat(80)).length <= 60);
});
