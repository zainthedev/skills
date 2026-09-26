import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { describeItem, readSyllabus } from "../next-item.ts";
import { WORKSPACE_FIXTURE, runScript } from "./helpers.ts";

test("default output is the next planned item with its target path", () => {
  const result = runScript("next-item.ts", [WORKSPACE_FIXTURE]);
  assert.equal(result.status, 0, result.stderr);
  const item = JSON.parse(result.stdout);
  assert.equal(item.id, "P02");
  assert.equal(item.type, "capstone");
  assert.equal(item.status, "planned");
  assert.equal(item.path, join(WORKSPACE_FIXTURE, "projects", "P02-build-a-directory-watcher.md"));
  assert.equal(item.exists, false);
  assert.deepEqual(item.previous, ["L01", "L02", "P01"]);
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
  const items = JSON.parse(result.stdout);
  assert.deepEqual(items.map((it: { id: string }) => it.id), ["L01", "L02", "P01", "P02", "C01"]);
  assert.equal(items[0].sidecar, join(WORKSPACE_FIXTURE, "lessons", "L01-what-node-is.answers.md"));
  assert.equal(items[2].starter, join(WORKSPACE_FIXTURE, "projects", "P01-finish-the-file-counter", "starter"));
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
});
