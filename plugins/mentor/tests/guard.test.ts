import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decide, decideBash, decideFile } from "../skills/mentor-review/scripts/guard.ts";
import { DOJO_WORKSPACE, SCRIPTS_DIR, removeDir, tempDir } from "./helpers.ts";

const GUARD = join(SCRIPTS_DIR, "guard.ts");

test("the reviewer's scripts pass as one plain call, and nothing else does", () => {
  assert.deepEqual(decideBash(`node ${join(SCRIPTS_DIR, "review-scope.ts")} branch src/api --label "the backend"`, "/"), { allow: true });
  assert.deepEqual(decideBash(`node ${join(SCRIPTS_DIR, "review-mark.ts")} /repo/.mentor/reviews/all.md 2 --answered`, "/"), { allow: true });
  assert.deepEqual(decideBash(`bun ${join(SCRIPTS_DIR, "review-lint.ts")} /repo/.mentor/reviews/all.md`, "/"), { allow: true });
  for (const command of [
    `node ${join(SCRIPTS_DIR, "review-scope.ts")} ; rm -rf src`,
    `node ${join(SCRIPTS_DIR, "review-scope.ts")} $(id)`,
    `node ${join(SCRIPTS_DIR, "guard.ts")}`,
    "git diff",
    "npm test",
  ]) {
    assert.equal(decideBash(command, "/").allow, false, command);
  }
  for (const tool of ["Read", "Grep", "Glob", "WebFetch"]) assert.deepEqual(decide({ tool_name: tool, tool_input: {} }), { allow: true });
  for (const tool of ["Agent", "NotebookEdit", "mcp__serena__replace_content"]) assert.equal(decide({ tool_name: tool, tool_input: {} }).allow, false, tool);
});

test("each skill's scripts run only from that skill's own folder", () => {
  const dir = tempDir();
  try {
    for (const [owner, script] of [["dojo", "lint.ts"], ["mentor-review", "review-scope.ts"]]) {
      mkdirSync(join(dir, owner, "scripts"), { recursive: true });
      writeFileSync(join(dir, owner, "scripts", script), "");
    }
    mkdirSync(join(dir, "dojo-evil", "scripts"), { recursive: true });
    writeFileSync(join(dir, "dojo-evil", "scripts", "review-scope.ts"), "");
    mkdirSync(join(dir, "dojo", "scripts"), { recursive: true });
    writeFileSync(join(dir, "dojo", "scripts", "review-scope.ts"), "");
    assert.deepEqual(decideBash(`node ${join(dir, "dojo", "scripts", "lint.ts")} /ws`, "/"), { allow: true });
    assert.deepEqual(decideBash(`node ${join(dir, "mentor-review", "scripts", "review-scope.ts")}`, "/"), { allow: true });
    assert.equal(decideBash(`node ${join(dir, "dojo", "scripts", "review-scope.ts")}`, "/").allow, false);
    assert.equal(decideBash(`node ${join(dir, "dojo-evil", "scripts", "review-scope.ts")}`, "/").allow, false);
  } finally {
    removeDir(dir);
  }
});

test("file tools may write only a Markdown review inside a reviews directory", () => {
  const repo = tempDir();
  try {
    mkdirSync(join(repo, ".mentor", "reviews"), { recursive: true });
    mkdirSync(join(repo, "src"), { recursive: true });
    mkdirSync(join(repo, "reviews"), { recursive: true });
    cpSync(DOJO_WORKSPACE, join(repo, "course"), { recursive: true });
    mkdirSync(join(repo, "course", "reviews"));
    for (const tool of ["Write", "Edit", "MultiEdit"]) {
      assert.deepEqual(decide({ tool_name: tool, tool_input: { file_path: join(repo, ".mentor", "reviews", "all.md") } }), { allow: true }, tool);
    }
    assert.deepEqual(decideFile(".mentor/reviews/branch-x.md", repo), { allow: true });
    assert.deepEqual(decideFile(join(repo, "course", "reviews", "all.md"), "/"), { allow: true });
    // A reviews/ directory outside a dojo workspace is not the reviewer's.
    assert.equal(decideFile(join(repo, "reviews", "all.md"), "/").allow, false);
    assert.equal(decideFile(join(repo, ".mentor", "reviews", "evil.ts"), "/").allow, false);
    assert.equal(decideFile(join(repo, ".mentor", "reviews", "nested", "x.md"), "/").allow, false);
    assert.equal(decideFile(join(repo, "src", "notes.md"), "/").allow, false);
    assert.equal(decideFile("", "/").allow, false);
    // A reviews directory linked into the source tree resolves to src and is refused.
    mkdirSync(join(repo, "other", ".mentor"), { recursive: true });
    symlinkSync(join(repo, "src"), join(repo, "other", ".mentor", "reviews"));
    assert.equal(decideFile(join(repo, "other", ".mentor", "reviews", "x.md"), "/").allow, false);
  } finally {
    removeDir(repo);
  }
});

test("as a hook: deny is JSON on stdout, allow is silent, bad input exits 2", () => {
  const run = (stdin: string) => spawnSync(process.execPath, [GUARD], { input: stdin, encoding: "utf8" });
  const write = run(JSON.stringify({ tool_name: "Write", tool_input: { file_path: "/tmp/app.js" } }));
  assert.equal(write.status, 0);
  assert.match(JSON.parse(write.stdout).hookSpecificOutput.permissionDecisionReason, /read-only/);
  assert.equal(run(JSON.stringify({ tool_name: "Read", tool_input: {} })).stdout, "");
  assert.equal(run("not json").status, 2);
});
