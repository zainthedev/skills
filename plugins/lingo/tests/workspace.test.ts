import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { findItemFile, findWorkspace, idFromPath, itemPath, readProfile, sidecarPath, slugify } from "../skills/lingo/scripts/lib/workspace.ts";
import { WORKSPACE_FIXTURE, removeDir, tempDir } from "./helpers.ts";

test("findWorkspace walks up to the profile with a lingo key", () => {
  assert.equal(findWorkspace(join(WORKSPACE_FIXTURE, "lessons", "L01-daily-routines-with-reflexive-verbs.md")), WORKSPACE_FIXTURE);
  assert.equal(findWorkspace(join(WORKSPACE_FIXTURE, "talk")), WORKSPACE_FIXTURE);
  const dir = tempDir();
  try {
    assert.equal(findWorkspace(dir), null);
  } finally {
    removeDir(dir);
  }
});

test("items map to lessons/, tasks/ and checkpoints/", () => {
  assert.equal(itemPath(WORKSPACE_FIXTURE, { id: "L01", type: "lesson", title: "Something else" }), join(WORKSPACE_FIXTURE, "lessons", "L01-daily-routines-with-reflexive-verbs.md"));
  assert.equal(itemPath(WORKSPACE_FIXTURE, { id: "T02", type: "capstone", title: "An evening with the family" }), join(WORKSPACE_FIXTURE, "tasks", "T02-an-evening-with-the-family.md"));
  assert.equal(itemPath(WORKSPACE_FIXTURE, { id: "C01", type: "checkpoint", title: "Checkpoint: Section 1" }), join(WORKSPACE_FIXTURE, "checkpoints", "C01-section-1.md"));
  assert.equal(findItemFile(WORKSPACE_FIXTURE, "T01", "guided-task"), join(WORKSPACE_FIXTURE, "tasks", "T01-describe-your-morning-in-a-voice-note.md"));
  assert.equal(sidecarPath("/w/lessons/L03-x.md"), "/w/lessons/L03-x.answers.md");
  assert.equal(idFromPath("/w/tasks/T03-x.md"), "T03");
});

test("slugs drop accents and fall back for titles with no Latin letters", () => {
  assert.equal(slugify("El pretérito: ¿cuándo se usa?"), "el-preterito-cuando-se-usa");
  assert.equal(slugify("Straße und Größe"), "strasse-und-grosse");
  assert.equal(slugify("Checkpoint: Section 2"), "section-2");
  assert.equal(slugify("は と が"), "item");
  assert.equal(slugify("Particles は and が"), "particles-and");
});

test("the profile carries the language, the per-skill levels and the exam", () => {
  const p = readProfile(WORKSPACE_FIXTURE);
  assert.equal(p.language, "Spanish");
  assert.equal(p.languageCode, "es-MX");
  assert.equal(p.nativeLanguage, "English");
  assert.equal(p.level, "A2");
  assert.deepEqual(p.skills, { listening: "A2", reading: "B1", speaking: "A1", writing: "A2" });
  assert.equal(p.targetLevel, "B1");
  assert.equal(p.exam, "");
  assert.match(p.focus, /Speaking and listening/);
});
