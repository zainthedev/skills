import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { current, lessonsInSection, nextPlanned, parseSyllabus, previousInSection, setStatus, validateSyllabus } from "../skills/dojo/scripts/lib/syllabus.ts";
import { WORKSPACE_FIXTURE } from "./helpers.ts";

const fixture = readFileSync(join(WORKSPACE_FIXTURE, "syllabus.md"), "utf8");

test("parses frontmatter, sections and items with line numbers", () => {
  const syllabus = parseSyllabus(fixture);
  assert.equal(syllabus.title, "Node fundamentals");
  assert.equal(syllabus.data.topic, "Node fundamentals");
  assert.deepEqual(syllabus.sections.map((s) => [s.number, s.title]), [[1, "Node fundamentals"]]);
  assert.deepEqual(
    syllabus.items.map((it) => [it.id, it.type, it.hours, it.status, it.done, it.section]),
    [
      ["L01", "lesson", 2, "done", "2026-09-20", 1],
      ["L02", "lesson", 2, "done", "2026-09-22", 1],
      ["P01", "completion-project", 3, "done", "2026-09-24", 1],
      ["P02", "capstone", 10, "planned", "", 1],
      ["C01", "checkpoint", 0.5, "generated", "", 1],
    ],
  );
  assert.equal(syllabus.items[0].line, 22);
  assert.deepEqual(syllabus.tables[0].header, ["ID", "Type", "Title", "Hours", "Status", "Done"]);
});

test("nextPlanned, current and section helpers", () => {
  const { items } = parseSyllabus(fixture);
  assert.equal(nextPlanned(items)?.id, "P02");
  assert.equal(current(items)?.id, "C01");
  assert.deepEqual(previousInSection(items, items[3]), ["L01", "L02", "P01"]);
  assert.deepEqual(lessonsInSection(items, 1), ["L01", "L02"]);
  const allDone = items.map((it) => ({ ...it, status: "done" }));
  assert.equal(nextPlanned(allDone), null);
  assert.equal(current(allDone), null);
  const noneGenerated = items.map((it) => ({ ...it, status: it.status === "generated" ? "planned" : it.status }));
  assert.equal(current(noneGenerated)?.id, "P02");
});

test("setStatus rewrites one row and leaves every other byte unchanged", () => {
  const result = setStatus(fixture, "P02", "done", "2026-09-25");
  const before = fixture.split("\n");
  const after = result.text.split("\n");
  assert.equal(after.length, before.length);
  const changed = after.map((line, i) => (line === before[i] ? null : i)).filter((i) => i !== null);
  assert.deepEqual(changed, [24]);
  assert.equal(after[24], "| P02 | capstone | Build a directory watcher | 10 | done | 2026-09-25 |");
  assert.equal(result.item.status, "done");
  assert.equal(result.item.done, "2026-09-25");
});

test("setStatus clears the date for non-done statuses and keeps odd spacing and CRLF", () => {
  const text = "# T\r\n\r\n## Section 1: A\r\n\r\n| ID | Type | Title | Hours | Status | Done |\r\n|---|---|---|---|---|---|\r\n|L01|lesson|  T  |2|   done   |2026-01-01|\r\n| L02 | lesson | U | 1 | planned | |\r\n";
  const result = setStatus(text, "L01", "generated");
  assert.equal(result.row, "|L01|lesson|  T  |2|   generated   | |");
  assert.equal(result.text.split("\r\n").length, text.split("\r\n").length);
  assert.equal(result.text.includes("| L02 | lesson | U | 1 | planned | |\r\n"), true);
});

test("setStatus rejects unknown IDs, statuses and dates", () => {
  assert.throws(() => setStatus(fixture, "L99", "done", "2026-09-25"), /no item with ID L99/);
  assert.throws(() => setStatus(fixture, "L01", "finished"), /invalid status/);
  assert.throws(() => setStatus(fixture, "L01", "done", "yesterday"), /invalid date/);
});

test("validateSyllabus passes the fixture and flags broken tables", () => {
  const clean = validateSyllabus(parseSyllabus(fixture), "/w/syllabus.md");
  assert.deepEqual(clean, []);

  const broken = `---
topic: T
level: beginner
depth: quick
generated: 2026-09-01
---
# T

## Section 1: A

| ID | Kind | Title | Hours | Status | Done |
|----|------|-------|-------|--------|------|
| L01 | lesson | One | two | started | |
| L01 | project | Two | 3 | planned | |
| P01 | project | Independent first | 3 | planned | |
| P02 | capstone | Cap | 3 | planned | |

## Section 2: B

| ID | Type | Title | Hours | Status | Done |
|----|------|-------|-------|--------|------|
| L03 | lesson | Three | 1 | planned | |
| P03 | project | After the capstone | 3 | planned | |
| C01 | checkpoint | Checkpoint: Section 2 | 0.5 | planned | |
| C02 | checkpoint | Extra | 0.5 | planned | |
`;
  const rules = validateSyllabus(parseSyllabus(broken), "/w/syllabus.md", undefined, { level: "beginner" }).map((f) => `${f.severity} ${f.rule}`);
  for (const expected of [
    "error syllabus/columns",
    "error syllabus/hours",
    "error syllabus/status",
    "error syllabus/id",
    "error syllabus/section-checkpoint",
    "error syllabus/capstone-last",
    "warning syllabus/beginner-completion",
  ]) {
    assert.equal(rules.includes(expected), true, `expected ${expected} in ${rules.join(", ")}`);
  }
});

test("validateSyllabus reports missing files for generated items when given a workspace", () => {
  const text = fixture.replace("| P02 | capstone | Build a directory watcher | 10 | planned | |", "| P02 | capstone | Build a directory watcher | 10 | generated | |");
  const findings = validateSyllabus(parseSyllabus(text), join(WORKSPACE_FIXTURE, "syllabus.md"), WORKSPACE_FIXTURE);
  assert.deepEqual(findings.map((f) => f.rule), ["syllabus/file-exists"]);
});
