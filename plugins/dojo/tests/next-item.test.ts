import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { describeItem, readSyllabus, tokenEstimate } from "../skills/dojo/scripts/next-item.ts";
import { WORKSPACE_FIXTURE, removeDir, runScript, tempWorkspace } from "./helpers.ts";

test("default output is the next planned item with its target path", () => {
  const result = runScript("next-item.ts", [WORKSPACE_FIXTURE]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim().split("\n").length, 1, "one line of JSON");
  const item = JSON.parse(result.stdout);
  assert.equal(item.workspace, WORKSPACE_FIXTURE);
  assert.match(item.started, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(item.id, "P02");
  assert.equal(item.type, "capstone");
  assert.equal(item.status, "planned");
  assert.equal(item.path, join("projects", "P02-build-a-directory-watcher.md"));
  assert.equal(item.exists, false);
  assert.deepEqual(item.previous, ["L01", "L02", "P01"]);
  assert.deepEqual(item.unfinished, []);
});

test("--id picks one item and fails on an unknown one", () => {
  const one = runScript("next-item.ts", [WORKSPACE_FIXTURE, "--id", "l02"]);
  assert.equal(one.status, 0, one.stderr);
  assert.equal(JSON.parse(one.stdout).id, "L02");
  const bad = runScript("next-item.ts", [WORKSPACE_FIXTURE, "--id", "L99"]);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /no item L99/);
});

test("unfinished lists every earlier generated item, across sections", () => {
  const ws = tempWorkspace();
  try {
    runScript("mark-done.ts", [ws, "P01", "--status", "generated"]);
    const item = JSON.parse(runScript("next-item.ts", [ws]).stdout);
    assert.deepEqual(item.unfinished, ["P01"]);
    // C01 (generated) sits after P02 in course order, so it is not "before" P02.
    const all = JSON.parse(runScript("next-item.ts", [ws, "--all"]).stdout);
    assert.deepEqual(all.items.find((it: { id: string }) => it.id === "C01").unfinished, ["P01"]);
  } finally {
    removeDir(ws);
  }
});

test("--current is the last generated item; checkpoints list the lessons to sample", () => {
  const result = runScript("next-item.ts", [WORKSPACE_FIXTURE, "--current", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const item = JSON.parse(result.stdout);
  assert.equal(item.id, "C01");
  assert.equal(item.exists, true);
  assert.deepEqual(item.samples, { section: ["L01", "L02"], previousSection: [] });
});

test("--all lists every item; lessons carry a sidecar path and completion projects a starter", () => {
  const result = runScript("next-item.ts", [WORKSPACE_FIXTURE, "--all"]);
  assert.equal(result.status, 0, result.stderr);
  const { items } = JSON.parse(result.stdout);
  assert.deepEqual(items.map((it: { id: string }) => it.id), ["L01", "L02", "P01", "P02", "C01"]);
  assert.equal(items[0].sidecar, join("lessons", "L01-what-node-is.answers.md"));
  assert.equal(items[2].starter, join("projects", "P01-finish-the-file-counter", "starter"));
});

test("finds the workspace from a subdirectory and fails cleanly outside one", () => {
  const inside = runScript("next-item.ts", [join(WORKSPACE_FIXTURE, "lessons")]);
  assert.equal(JSON.parse(inside.stdout).id, "P02");
  const outside = runScript("next-item.ts", ["/"]);
  assert.equal(outside.status, 2);
  assert.match(outside.stderr, /no dojo workspace/);
});

test("describeItem works programmatically", () => {
  const syllabus = readSyllabus(WORKSPACE_FIXTURE);
  const info = describeItem(WORKSPACE_FIXTURE, syllabus, syllabus.items[4]);
  assert.equal(info.sectionTitle, "Node fundamentals");
  assert.equal(info.hours, 0.5);
  assert.equal(info.path, join(WORKSPACE_FIXTURE, "checkpoints", "C01-section-1.md"));
});

test("a single item carries its TOKENS.md estimate at the profile's level", () => {
  const checkpoint = JSON.parse(runScript("next-item.ts", [WORKSPACE_FIXTURE, "--id", "C01"]).stdout);
  assert.match(checkpoint.estimate, /^\d+k weighted \(/);
  const table = "| Item | Level | Weighted | Basis |\n|---|---|---|---|\n| lesson | beginner | 300k | estimate |\n| project, with a starter | beginner | 360k | measured |\n";
  assert.equal(tokenEstimate("lesson", "beginner", table), "300k weighted (estimate)");
  assert.equal(tokenEstimate("completion-project", "beginner", table), "360k weighted (measured)");
  assert.equal(tokenEstimate("project", "beginner", table), "360k weighted (measured; upper bound, this project has no starter)");
  assert.equal(tokenEstimate("lesson", "advanced", table), null);
  assert.equal(tokenEstimate("lesson", "", table), null);
});
