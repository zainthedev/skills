import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { planWords } from "../skills/lingo/scripts/checkpoint.ts";
import type { SampledLesson } from "../skills/lingo/scripts/context.ts";
import { removeDir, runScript, tempWorkspace } from "./helpers.ts";

function lesson(id: string, section: number, words: number): SampledLesson {
  return {
    id,
    section,
    title: id,
    file: `../lessons/${id}-x.md`,
    prompts: [],
    words: Array.from({ length: words }, (_, i) => ({ word: `w${i}`, reading: "-", meaning: `m${i}` })),
    anchors: [],
    assignment: [],
  };
}

test("writes prompts with their labels and words by meaning, and refuses to overwrite", () => {
  const ws = tempWorkspace();
  try {
    const result = runScript("checkpoint.ts", [ws, "C01"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /8 prompts, 8 from its own section, and 10 words, from L01, L02/);
    const text = readFileSync(join(ws, "checkpoints", "C01-section-1.md"), "utf8");
    assert.match(text, /^Predicted: ___ \/ 18$/m);
    assert.match(text, /^1\. Explain: \[How does a reflexive verb/m);
    assert.match(text, /^Write the Spanish word for each meaning, out loud or on paper\.$/m);
    assert.match(text, /^1\. \[to wake up\]\(\.\.\/lessons\/L01-daily-routines-with-reflexive-verbs\.md#words\) \(L01\)$/m);
    assert.match(text, /^## If you scored below 13$/m);
    assert.match(text, /drill its \[Words\]/);
    assert.equal(runScript("checkpoint.ts", [ws, "C01"]).status, 1);
    assert.equal(runScript("checkpoint.ts", [ws, "C01", "--force"]).status, 0);
    assert.equal(runScript("checkpoint.ts", [ws, "L01"]).status, 1);
  } finally {
    removeDir(ws);
  }
});

test("words come two thirds from the own section, spread through each table and interleaved", () => {
  const words = planWords([lesson("L03", 2, 12), lesson("L04", 2, 8)], [lesson("L01", 1, 10)]);
  assert.equal(words.length, 10);
  assert.equal(words.filter((w) => w.lesson.section === 2).length, 7);
  assert.equal(new Set(words.map((w) => `${w.lesson.id}:${w.index}`)).size, 10, "no word twice");
  words.forEach((w, i) => i > 0 && assert.notEqual(w.lesson.id, words[i - 1].lesson.id));
  const fromL03 = words.filter((w) => w.lesson.id === "L03").map((w) => w.index);
  assert.ok(Math.max(...fromL03) >= 8, "words reach the end of the table, not only its first rows");
  assert.deepEqual(planWords([lesson("L01", 1, 0)], []), []);
});
