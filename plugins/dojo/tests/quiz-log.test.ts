import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { quizRow } from "../skills/dojo/scripts/quiz-log.ts";
import { removeDir, runScript, tempWorkspace } from "./helpers.ts";

test("a row carries the date, scope, both counts and the lessons to re-read", () => {
  assert.equal(quizRow("section 2", 6, 4, ["l03", " L05", ""], "2026-09-26"), "| 2026-09-26 | section 2 | 6 | 4 | Re-read L03, L05 |");
  assert.equal(quizRow("a | b", 3, 3, [], "2026-09-26"), "| 2026-09-26 | a \\| b | 3 | 3 |  |");
});

test("the script appends one row, creating the log when it is missing", () => {
  const ws = tempWorkspace();
  try {
    const log = join(ws, "quiz-log.md");
    const before = readFileSync(log, "utf8");
    const result = runScript("quiz-log.ts", [ws, "--scope", "L01", "--predicted", "4", "--recalled", "3", "--reread", "L01"]);
    assert.equal(result.status, 0, result.stderr);
    const after = readFileSync(log, "utf8");
    assert.equal(after.slice(0, before.length), before);
    assert.match(after.slice(before.length), /^\| \d{4}-\d{2}-\d{2} \| L01 \| 4 \| 3 \| Re-read L01 \|\n$/);

    rmSync(log);
    assert.equal(runScript("quiz-log.ts", [ws, "--scope", "all", "--predicted", "2", "--recalled", "2"]).status, 0);
    assert.match(readFileSync(log, "utf8"), /^# Quiz log\n\n\| Date \| Scope \| Predicted \| Actual \| Notes \|\n\|[-|]+\n\| \d{4}-\d{2}-\d{2} \| all \| 2 \| 2 \|  \|\n$/);

    writeFileSync(log, "# Quiz log\n\n| Date | Scope | Predicted | Actual | Notes |\n|------|-------|-----------|--------|-------|");
    assert.equal(runScript("quiz-log.ts", [ws, "--scope", "all", "--predicted", "1", "--recalled", "0"]).status, 0);
    assert.match(readFileSync(log, "utf8"), /\|-------\|\n\| \d{4}/);
  } finally {
    removeDir(ws);
  }
});

test("bad counts and a missing scope are usage errors", () => {
  const ws = tempWorkspace();
  try {
    assert.equal(runScript("quiz-log.ts", [ws, "--scope", "all", "--predicted", "six", "--recalled", "1"]).status, 2);
    assert.equal(runScript("quiz-log.ts", [ws, "--predicted", "1", "--recalled", "1"]).status, 2);
  } finally {
    removeDir(ws);
  }
});
