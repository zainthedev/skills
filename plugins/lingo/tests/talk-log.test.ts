import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readMistakes } from "../skills/lingo/scripts/lib/records.ts";
import { removeDir, runScript, tempWorkspace } from "./helpers.ts";

const RECORD = `---
date: 2026-10-06
scope: T01
turns: 9
---
# Talk: A cousin asks about your morning

## Corrections

| You wrote | Better | Why | Lesson |
|-----------|--------|-----|--------|
| Yo me ducho en la mañana | Me ducho por la mañana | Parts of the day take por | - |

## Focus next

Times of day with a las.
`;

test("files a talk record in talk-log.md and its corrections in mistakes.md, once", () => {
  const ws = tempWorkspace();
  try {
    writeFileSync(join(ws, "talk", "2026-10-06-morning.md"), RECORD);
    const result = runScript("talk-log.ts", [ws, "talk/2026-10-06-morning.md"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^\| 2026-10-06 \| \[T01\]\(talk\/2026-10-06-morning\.md\) \| 9 \| 1 \| Times of day with a las\. \|$/m);
    assert.match(result.stdout, /mistakes\.md: added 3/);
    const mistakes = readMistakes(ws);
    assert.deepEqual(mistakes.at(-1), { n: 3, date: "2026-10-06", lesson: "-", wrote: "Yo me ducho en la mañana", better: "Me ducho por la mañana", why: "Parts of the day take por", cleared: "", line: mistakes.at(-1)!.line });
    const again = runScript("talk-log.ts", [ws, "talk/2026-10-06-morning.md"]);
    assert.equal(again.status, 1);
    assert.match(again.stderr, /already lists/);
    assert.equal(readMistakes(ws).length, 3);
  } finally {
    removeDir(ws);
  }
});

test("refuses a record that fails lint or lives outside talk/", () => {
  const ws = tempWorkspace();
  try {
    writeFileSync(join(ws, "talk", "2026-10-06-bad.md"), RECORD.replace("| - |", "| L42 |"));
    const bad = runScript("talk-log.ts", [ws, "talk/2026-10-06-bad.md"]);
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /fails lint/);
    writeFileSync(join(ws, "notes.md"), RECORD);
    assert.equal(runScript("talk-log.ts", [ws, "notes.md"]).status, 2);
    assert.equal(readMistakes(ws).length, 2);
    assert.equal(existsSync(join(ws, "talk-log.md")), true);
  } finally {
    removeDir(ws);
  }
});

test("quiz-log marks the mistakes the learner fixed as cleared", () => {
  const ws = tempWorkspace();
  try {
    const result = runScript("quiz-log.ts", [ws, "--scope", "all", "--predicted", "8", "--recalled", "6", "--reread", "L02", "--cleared", "2"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\| all \| 8 \| 6 \| Re-read L02 \|/);
    assert.match(result.stdout, /mistakes\.md: cleared 2/);
    const today = new Date().toISOString().slice(0, 10);
    assert.deepEqual(readMistakes(ws).map((m) => m.cleared), ["", today]);
    assert.match(readFileSync(join(ws, "quiz-log.md"), "utf8"), /Re-read L02/);
    assert.equal(runScript("quiz-log.ts", [ws, "--scope", "all", "--predicted", "1", "--recalled", "1", "--cleared", "x"]).status, 2);
  } finally {
    removeDir(ws);
  }
});
