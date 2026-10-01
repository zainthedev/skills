import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decide, decideBash, decideFile, isLingoWorkspace } from "../skills/lingo/scripts/guard.ts";
import { SCRIPTS_DIR, removeDir, tempDir, tempWorkspace } from "./helpers.ts";

test("lingo's scripts run from lingo's own scripts directory, and only the listed ones", () => {
  for (const script of ["next-item.ts", "lint.ts", "measure.ts", "context.ts", "quiz-log.ts", "talk-log.ts"]) {
    assert.deepEqual(decideBash(`node ${join(SCRIPTS_DIR, script)} /ws`, "/"), { allow: true }, script);
  }
  assert.deepEqual(decideBash(`node ${join(SCRIPTS_DIR, "quiz-log.ts")} /ws --scope all --predicted 8 --recalled 6 --cleared 1,2`, "/"), { allow: true });
  for (const script of ["mark-done.ts", "deck.ts", "checkpoint.ts", "build-site.ts", "init-workspace.ts"]) {
    assert.equal(decideBash(`node ${join(SCRIPTS_DIR, script)} /ws`, "/").allow, false, script);
  }
  assert.equal(decideBash(`node ${join(SCRIPTS_DIR, "talk-log.ts")} /ws talk/x.md ; rm -rf /`, "/").allow, false);
});

test("a script name shared with dojo is allowed from either skill's folder and no other", () => {
  const dir = tempDir();
  try {
    for (const folder of ["dojo", "lingo", "elsewhere"]) {
      mkdirSync(join(dir, folder, "scripts"), { recursive: true });
      writeFileSync(join(dir, folder, "scripts", "next-item.ts"), "process.exit(0)");
      writeFileSync(join(dir, folder, "scripts", "talk-log.ts"), "process.exit(0)");
    }
    assert.deepEqual(decideBash(`node ${join(dir, "dojo", "scripts", "next-item.ts")}`, "/"), { allow: true });
    assert.deepEqual(decideBash(`node ${join(dir, "lingo", "scripts", "next-item.ts")}`, "/"), { allow: true });
    assert.equal(decideBash(`node ${join(dir, "elsewhere", "scripts", "next-item.ts")}`, "/").allow, false);
    // talk-log.ts is lingo's alone.
    assert.equal(decideBash(`node ${join(dir, "dojo", "scripts", "talk-log.ts")}`, "/").allow, false);
    assert.match((decideBash(`node ${join(dir, "dojo", "scripts", "talk-log.ts")}`, "/") as { reason: string }).reason, /the lingo skill/);
  } finally {
    removeDir(dir);
  }
});

test("file tools may write a talk record or a review in a lingo workspace, and nothing else", () => {
  const ws = tempWorkspace();
  const other = tempDir();
  try {
    assert.equal(isLingoWorkspace(ws), true);
    assert.deepEqual(decideFile(join(ws, "talk", "2026-10-06-morning.md"), "/"), { allow: true });
    assert.deepEqual(decideFile(join(ws, "reviews", "T01-x-r2.md"), "/"), { allow: true });
    assert.deepEqual(decide({ tool_name: "Write", tool_input: { file_path: "talk/2026-10-06-morning.md" }, cwd: ws }), { allow: true });
    for (const file of ["mistakes.md", "syllabus.md", join("lessons", "L01-daily-routines-with-reflexive-verbs.md"), join("tasks", "T01-describe-your-morning-in-a-voice-note.md"), join("talk", "notes.txt")]) {
      assert.equal(decideFile(join(ws, file), "/").allow, false, file);
    }
    mkdirSync(join(other, "talk"));
    assert.equal(isLingoWorkspace(other), false);
    assert.equal(decideFile(join(other, "talk", "x.md"), "/").allow, false, "talk/ outside a lingo workspace");
    assert.equal(decide({ tool_name: "Edit", tool_input: { file_path: join(ws, "deck.tsv") } }).allow, false);
    assert.equal(decide({ tool_name: "mcp__fs__write_file", tool_input: {} }).allow, false);
  } finally {
    removeDir(ws);
    removeDir(other);
  }
});
