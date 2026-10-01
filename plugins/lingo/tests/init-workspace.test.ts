import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readProfile } from "../skills/lingo/scripts/lib/workspace.ts";
import { removeDir, runScript, tempDir } from "./helpers.ts";

const BASE = ["--language", "Japanese", "--code", "ja", "--level", "A0", "--target-level", "A2", "--hours", "6", "--target", "2027-09-01", "--goal", "Read a manga volume with a dictionary.", "--experience", "None.", "--created", "2026-10-01"];

test("creates the workspace with per-skill levels, logs and lesson zero", () => {
  const dir = tempDir();
  try {
    const ws = join(dir, "japanese");
    const result = runScript("init-workspace.ts", ["--dir", ws, ...BASE, "--reading", "A1", "--exam", "JLPT N4"]);
    assert.equal(result.status, 0, result.stderr);
    for (const file of ["profile.md", "00-how-this-works.md", "ledger.md", "quiz-log.md", "talk-log.md", "mistakes.md", ".lingo/fetched.jsonl"]) assert.ok(existsSync(join(ws, file)), file);
    for (const sub of ["lessons", "tasks", "checkpoints", "talk", "reviews"]) assert.ok(existsSync(join(ws, sub)), sub);
    const profile = readProfile(ws);
    assert.equal(profile.slug, "japanese");
    assert.deepEqual(profile.skills, { listening: "A0", reading: "A1", speaking: "A0", writing: "A0" });
    assert.equal(profile.exam, "JLPT N4");
    assert.equal(profile.nativeLanguage, "English");
    const zero = readFileSync(join(ws, "00-how-this-works.md"), "utf8");
    assert.match(zero, /course in Japanese for a native English speaker, built for one goal: Read a manga volume with a dictionary\. It starts from A0 and aims at A2/);
    assert.doesNotMatch(zero, /\{\{/);
    assert.match(readFileSync(join(ws, "ledger.md"), "utf8"), /\| Resource \| Type \| Score \| Endorsements \| Freshness \| Level \| Used in \|/);
    assert.equal(runScript("init-workspace.ts", ["--dir", ws, ...BASE]).status, 2, "never overwrites");
  } finally {
    removeDir(dir);
  }
});

test("rejects a target at or below the placement, an unknown level and a bad language tag", () => {
  const dir = tempDir();
  try {
    const run = (extra: string[]) => runScript("init-workspace.ts", ["--dir", join(dir, "x"), ...BASE, ...extra]);
    assert.equal(run(["--level", "B1", "--target-level", "B1"]).status, 2);
    assert.equal(run(["--level", "intermediate"]).status, 2);
    assert.equal(run(["--speaking", "C2"]).status, 2);
    assert.equal(run(["--code", "Japanese please"]).status, 2);
    assert.equal(existsSync(join(dir, "x", "profile.md")), false);
  } finally {
    removeDir(dir);
  }
});
