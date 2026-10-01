import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { describeItem, readSyllabus, tokenEstimate } from "../skills/lingo/scripts/next-item.ts";
import { findItem } from "../skills/lingo/scripts/lib/syllabus.ts";
import { WORKSPACE_FIXTURE, removeDir, runScript, tempWorkspace } from "./helpers.ts";

test("the next planned item is the first checkpoint, with its samples", () => {
  const result = runScript("next-item.ts", [WORKSPACE_FIXTURE]);
  assert.equal(result.status, 0, result.stderr);
  const item = JSON.parse(result.stdout);
  assert.equal(item.id, "C01");
  assert.equal(item.path, join("checkpoints", "C01-section-1.md"));
  assert.deepEqual(item.unfinished, ["L02", "T01"]);
  assert.deepEqual(item.samples, { section: ["L01", "L02"], previousSection: [] });
  assert.equal(item.estimate, "40k weighted (estimate, script-written)");
});

test("a task carries no sidecar and quotes the task row of the token table", () => {
  const syllabus = readSyllabus(WORKSPACE_FIXTURE);
  const info = describeItem(WORKSPACE_FIXTURE, syllabus, findItem(syllabus.items, "T02")!);
  assert.equal(info.sidecar, undefined);
  assert.equal(info.path, join(WORKSPACE_FIXTURE, "tasks", "T02-an-evening-with-the-family.md"));
  assert.equal(tokenEstimate("capstone", "A2"), "200k weighted (estimate from dojo)");
  assert.equal(tokenEstimate("lesson", "B2"), "240k weighted (estimate from dojo)");
  assert.equal(tokenEstimate("guided-task", "A0"), "200k weighted (estimate from dojo)");
  assert.equal(tokenEstimate("lesson", "beginner"), null);
});

test("--id and --current pick one item", () => {
  const one = JSON.parse(runScript("next-item.ts", [WORKSPACE_FIXTURE, "--id", "l03"]).stdout);
  assert.equal(one.id, "L03");
  assert.equal(one.sidecar, join("lessons", "L03-the-preterite-for-finished-actions.answers.md"));
  const current = JSON.parse(runScript("next-item.ts", [WORKSPACE_FIXTURE, "--current"]).stdout);
  assert.equal(current.id, "T01");
  const ws = tempWorkspace();
  try {
    assert.equal(runScript("next-item.ts", [ws, "--id", "X99"]).status, 1);
  } finally {
    removeDir(ws);
  }
});
