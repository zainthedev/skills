import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findItemFile, findWorkspace, idFromPath, itemPath, readProfile, sidecarPath, slugify, starterDir } from "../lib/workspace.ts";
import { WORKSPACE_FIXTURE } from "./helpers.ts";

test("findWorkspace walks up from a nested directory or file", () => {
  assert.equal(findWorkspace(WORKSPACE_FIXTURE), WORKSPACE_FIXTURE);
  assert.equal(findWorkspace(join(WORKSPACE_FIXTURE, "lessons")), WORKSPACE_FIXTURE);
  assert.equal(findWorkspace(join(WORKSPACE_FIXTURE, "lessons", "L01-what-node-is.md")), WORKSPACE_FIXTURE);
  assert.equal(findWorkspace(join(WORKSPACE_FIXTURE, "projects", "P01-finish-the-file-counter", "starter")), WORKSPACE_FIXTURE);
});

test("findWorkspace returns null when no profile with a dojo key is above", () => {
  assert.equal(findWorkspace(tmpdir()), null);
});

test("itemPath resolves the existing file by ID and falls back to a slug", () => {
  assert.equal(itemPath(WORKSPACE_FIXTURE, { id: "L01", type: "lesson", title: "Something else" }), join(WORKSPACE_FIXTURE, "lessons", "L01-what-node-is.md"));
  assert.equal(itemPath(WORKSPACE_FIXTURE, { id: "C01", type: "checkpoint" }), join(WORKSPACE_FIXTURE, "checkpoints", "C01-section-1.md"));
  assert.equal(itemPath(WORKSPACE_FIXTURE, { id: "P02", type: "capstone", title: "Build a directory watcher" }), join(WORKSPACE_FIXTURE, "projects", "P02-build-a-directory-watcher.md"));
  assert.equal(findItemFile(WORKSPACE_FIXTURE, "P02", "capstone"), null);
});

test("sidecar files are never resolved as the item file", () => {
  assert.equal(findItemFile(WORKSPACE_FIXTURE, "L01", "lesson"), join(WORKSPACE_FIXTURE, "lessons", "L01-what-node-is.md"));
});

test("sidecar and starter paths", () => {
  assert.equal(sidecarPath("/w/lessons/L03-middleware.md"), "/w/lessons/L03-middleware.answers.md");
  assert.equal(starterDir("/w/projects/P02-todo-api.md"), "/w/projects/P02-todo-api/starter");
  assert.equal(idFromPath("/w/lessons/L03-middleware.md"), "L03");
  assert.equal(idFromPath("/w/README.md"), null);
});

test("slugify follows the format examples", () => {
  assert.equal(slugify("Checkpoint: Section 2"), "section-2");
  assert.equal(slugify("Todo API"), "todo-api");
  assert.equal(slugify("  Middleware!  "), "middleware");
  assert.equal(slugify("x".repeat(80)).length <= 60, true);
});

test("readProfile exposes frontmatter fields and body sections", () => {
  const profile = readProfile(WORKSPACE_FIXTURE);
  assert.equal(profile.topic, "Node fundamentals");
  assert.equal(profile.level, "beginner");
  assert.equal(profile.depth, "standard");
  assert.equal(profile.hoursPerWeek, 6);
  assert.equal(profile.targetDate, "2026-12-15");
  assert.equal(profile.created, "2026-09-01");
  assert.match(profile.goal, /^Ship a small command line tool/);
  assert.match(profile.experience, /Two years of JavaScript/);
  assert.equal(profile.notes, "Prefers text over video.");
});
