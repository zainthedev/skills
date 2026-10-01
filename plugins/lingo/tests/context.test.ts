import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildDigest, buildQuiz, buildTalk, formatDigest } from "../skills/lingo/scripts/context.ts";
import { WORKSPACE_FIXTURE, removeDir, runScript, tempWorkspace } from "./helpers.ts";

test("a lesson digest lists the words already taught and the language of each part", () => {
  const digest = buildDigest(WORKSPACE_FIXTURE, "L03");
  assert.deepEqual(digest.taught.map((t) => t.id), ["L01", "L02"]);
  assert.ok(digest.taught[0].words.includes("levantarse"));
  assert.equal(digest.profile.skills.speaking, "A1");
  const text = formatDigest(WORKSPACE_FIXTURE, digest);
  assert.match(text, /for a native English speaker\. Placement A2 \(listening A2, reading B1, speaking A1, writing A2\), target B1/);
  assert.match(text, /Authored language at A2: introduction English/);
  assert.match(text, /## Words already taught \(20\)/);
  assert.match(text, /\| Score \| Type \| Resource \| Freshness \| Level \| Used in \|/);
});

test("at B1 the overview moves into the target language while the introduction stays native", () => {
  const ws = tempWorkspace();
  try {
    runScript("mark-done.ts", [ws, "L01"]);
    const profile = join(ws, "profile.md");
    writeFileSync(profile, readFileSync(profile, "utf8").replace("level: A2", "level: B1"));
    const text = formatDigest(ws, buildDigest(ws, "L03"));
    assert.match(text, /introduction English, overview Spanish, core English, assignment Spanish/);
  } finally {
    removeDir(ws);
  }
});

test("a quiz mixes prompts, words and uncleared mistakes", () => {
  const quiz = buildQuiz(WORKSPACE_FIXTURE, null, 8, 0, 5, 3);
  assert.equal(quiz.scope, "every finished lesson");
  assert.deepEqual(quiz.lessons, ["L01"]);
  assert.equal(quiz.prompts.length, 4);
  assert.equal(quiz.prompts[0].label, "Explain");
  assert.equal(quiz.words.length, 5);
  assert.equal(quiz.words[0].meaning, "to get up");
  assert.deepEqual(quiz.mistakes.map((m) => m.n), [1, 2]);
  const section = buildQuiz(WORKSPACE_FIXTURE, "1", 8, 1, 4, 0);
  assert.deepEqual(section.lessons, ["L01", "L02"]);
  assert.equal(section.words.length, 4);
  assert.notEqual(section.words[0].lesson, section.words[1].lesson);
  assert.equal(section.mistakes.length, 0);
  const cli = runScript("context.ts", [WORKSPACE_FIXTURE, "quiz", "L02", "--words", "2"]);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /## Words: show the meaning/);
  assert.match(cli.stdout, /## Mistakes: show what the learner once wrote/);
});

test("a talk digest scopes to the current item, a section or free", () => {
  const current = buildTalk(WORKSPACE_FIXTURE, null);
  assert.equal(current.scope, "T01");
  assert.equal(current.task?.id, "T01");
  assert.deepEqual(current.lessons.map((l) => l.id), ["L01", "L02"]);
  assert.match(current.lastFocus, /Reflexive verbs in the past/);
  assert.equal(current.mistakes.length, 2);
  const lesson = buildTalk(WORKSPACE_FIXTURE, "L02");
  assert.equal(lesson.task, null);
  assert.ok(lesson.lessons[0].words.some((w) => w.word === "el sábado"));
  const free = buildTalk(WORKSPACE_FIXTURE, "free");
  assert.deepEqual(free.lessons, []);
  const cli = runScript("context.ts", [WORKSPACE_FIXTURE, "talk", "1"]);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /^# Talk: section 1/);
  assert.match(cli.stdout, /Feedback language: English/);
  assert.equal(runScript("context.ts", [WORKSPACE_FIXTURE, "talk", "X99"]).status, 1);
});
