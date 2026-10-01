import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WORKSPACE_FIXTURE, removeDir, runScript, tempWorkspace } from "./helpers.ts";

const original = readFileSync(join(WORKSPACE_FIXTURE, "syllabus.md"), "utf8");

function changedLines(text: string): number[] {
  const before = original.split("\n");
  const after = text.split("\n");
  assert.equal(after.length, before.length);
  return after.map((line, i) => (line === before[i] ? -1 : i)).filter((i) => i >= 0);
}

test("marks an item done with today's date by default", () => {
  const ws = tempWorkspace();
  try {
    const result = runScript("mark-done.ts", [ws, "T02"]);
    assert.equal(result.status, 0, result.stderr);
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(result.stdout.trim(), `| T02 | capstone | An evening with the family | 10 | done | ${today} |`);
    const text = readFileSync(join(ws, "syllabus.md"), "utf8");
    assert.deepEqual(changedLines(text), [30]);
  } finally {
    removeDir(ws);
  }
});

test("--status and --date are honoured and other statuses clear the date", () => {
  const ws = tempWorkspace();
  try {
    const dated = runScript("mark-done.ts", [ws, "T02", "--date", "2026-10-01", "--json"]);
    assert.deepEqual(JSON.parse(dated.stdout), { id: "T02", status: "done", done: "2026-10-01", row: "| T02 | capstone | An evening with the family | 10 | done | 2026-10-01 |" });
    const reverted = runScript("mark-done.ts", [ws, "L01", "--status", "planned"]);
    assert.equal(reverted.stdout.trim(), "| L01 | lesson | Daily routines with reflexive verbs | 3 | planned | |");
    assert.deepEqual(changedLines(readFileSync(join(ws, "syllabus.md"), "utf8")), [19, 30]);
  } finally {
    removeDir(ws);
  }
});

test("refuses a row with too few cells instead of corrupting it", () => {
  const ws = tempWorkspace();
  try {
    const path = join(ws, "syllabus.md");
    const broken = original.replace("| T02 | capstone | An evening with the family | 10 | planned | |", "| T02 | capstone | An evening with the family | 10 | planned |");
    assert.notEqual(broken, original);
    writeFileSync(path, broken);
    const result = runScript("mark-done.ts", [ws, "T02"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /row for T02 at line \d+ has 5 cells, expected 6/);
    assert.equal(readFileSync(path, "utf8"), broken);
  } finally {
    removeDir(ws);
  }
});

test("fails with a one-line reason on an unknown ID or status", () => {
  const ws = tempWorkspace();
  try {
    const unknown = runScript("mark-done.ts", [ws, "L99"]);
    assert.equal(unknown.status, 1);
    assert.equal(unknown.stderr.trim(), "error: no item with ID L99 in the syllabus");
    const badStatus = runScript("mark-done.ts", [ws, "L01", "--status", "finished"]);
    assert.equal(badStatus.status, 2);
    assert.equal(readFileSync(join(ws, "syllabus.md"), "utf8"), original);
    assert.equal(runScript("mark-done.ts", ["--help"]).status, 0);
  } finally {
    removeDir(ws);
  }
});
