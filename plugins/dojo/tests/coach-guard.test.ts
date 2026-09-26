import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decide, decideBash } from "../skills/dojo-coach/coach-guard.ts";
import { SCRIPTS_DIR, TESTS_DIR, removeDir, tempDir } from "./helpers.ts";

const GUARD = resolve(TESTS_DIR, "..", "skills", "dojo-coach", "coach-guard.ts");
const LINT = join(SCRIPTS_DIR, "lint.ts");

function run(stdin: string): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [GUARD], { input: stdin, encoding: "utf8", cwd: SCRIPTS_DIR });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function denied(stdout: string): string | null {
  if (stdout.trim() === "") return null;
  const parsed = JSON.parse(stdout) as { hookSpecificOutput: { permissionDecision: string; permissionDecisionReason: string } };
  assert.equal(parsed.hookSpecificOutput.permissionDecision, "deny");
  return parsed.hookSpecificOutput.permissionDecisionReason;
}

test("read-only tools pass and every other tool is denied, MCP tools included", () => {
  for (const tool of ["Read", "Grep", "Glob", "WebFetch", "Skill"]) assert.deepEqual(decide({ tool_name: tool, tool_input: {} }), { allow: true });
  for (const tool of ["Task", "mcp__serena__replace_content", "mcp__terminal__run_in_terminal", "Write", "Edit", "NotebookEdit"]) {
    const decision = decide({ tool_name: tool, tool_input: { file_path: "/tmp/app.js", command: "x" } });
    assert.equal(decision.allow, false, tool);
  }
  assert.deepEqual(decide({ tool_name: "Write", tool_input: { file_path: "/ws/quiz-log.md" } }), { allow: true });
  assert.equal(decide({}).allow, false);
});

test("a shell command is allowed only as one plain call to a read-only dojo script", () => {
  assert.deepEqual(decideBash(`node ${LINT} /ws L01`, "/"), { allow: true });
  assert.deepEqual(decideBash(`bun "${LINT}" /ws`, "/"), { allow: true });
  assert.deepEqual(decideBash("node lint.ts /ws", SCRIPTS_DIR), { allow: true });
  const bypass = decideBash(`node ${LINT} /ws ; echo hi > src/app.js`, "/");
  assert.equal(bypass.allow, false);
  assert.match((bypass as { reason: string }).reason, /Shell operators/);
  for (const command of [
    `node ${LINT} && rm -rf /`,
    `node ${LINT} | tee out`,
    `node ${LINT} $(id)`,
    `node ${LINT} > /tmp/x`,
    `node ${join(SCRIPTS_DIR, "mark-done.ts")} /ws L01`,
    `node ${join(SCRIPTS_DIR, "does-not-exist.ts")}`,
    `node --eval "process.exit()"`,
    `python3 ${LINT}`,
    "ls",
    "",
  ]) {
    assert.equal(decideBash(command, "/").allow, false, command);
  }
});

test("a read-only script name outside the dojo scripts directory is denied", () => {
  const dir = tempDir();
  try {
    mkdirSync(join(dir, "elsewhere"), { recursive: true });
    writeFileSync(join(dir, "elsewhere", "lint.ts"), "process.exit(0)");
    const decision = decideBash(`node ${join(dir, "elsewhere", "lint.ts")}`, "/");
    assert.equal(decision.allow, false);
    assert.match((decision as { reason: string }).reason, /scripts directory/);
    mkdirSync(join(dir, "dojo", "scripts"), { recursive: true });
    writeFileSync(join(dir, "dojo", "scripts", "measure.ts"), "process.exit(0)");
    assert.deepEqual(decideBash(`node ${join(dir, "dojo", "scripts", "measure.ts")} --since x`, "/"), { allow: true });
  } finally {
    removeDir(dir);
  }
});

test("as a hook: deny is JSON on stdout with exit 0, allow is silent, bad input exits 2", () => {
  const write = run(JSON.stringify({ tool_name: "Write", tool_input: { file_path: "/tmp/app.js" } }));
  assert.equal(write.status, 0);
  assert.match(denied(write.stdout) ?? "", /read-only/);
  const chained = run(JSON.stringify({ tool_name: "Bash", tool_input: { command: `node ${LINT} /ws ; echo hi > src/app.js` } }));
  assert.equal(chained.status, 0);
  assert.match(denied(chained.stdout) ?? "", /Shell operators/);
  const read = run(JSON.stringify({ tool_name: "Read", tool_input: { file_path: "/tmp/app.js" } }));
  assert.equal(read.status, 0);
  assert.equal(read.stdout, "");
  const plain = run(JSON.stringify({ tool_name: "Bash", tool_input: { command: `node ${LINT} /ws` }, cwd: "/" }));
  assert.equal(plain.stdout, "");
  const garbage = run("not json");
  assert.equal(garbage.status, 2);
  assert.match(garbage.stderr, /blocked/);
  const empty = run("");
  assert.equal(empty.status, 2);
});
