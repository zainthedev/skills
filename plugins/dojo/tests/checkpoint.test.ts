import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { planCheckpoint, rereadLine } from "../skills/dojo/scripts/checkpoint.ts";
import type { SampledLesson } from "../skills/dojo/scripts/context.ts";
import { removeDir, runScript, tempWorkspace } from "./helpers.ts";

function lesson(id: string, section: number, prompts: number, extra: Partial<SampledLesson> = {}): SampledLesson {
  return {
    id,
    section,
    title: id,
    file: `../lessons/${id}-x.md`,
    prompts: Array.from({ length: prompts }, (_, i) => ({ text: `${id} prompt ${i + 1}`, answer: "" })),
    anchors: ["#core-idea", "#assignment"],
    assignment: [],
    ...extra,
  };
}

test("the script writes a checkpoint that lint accepts, and will not overwrite without --force", () => {
  const ws = tempWorkspace();
  try {
    const file = join(ws, "checkpoints", "C01-section-1.md");
    const refused = runScript("checkpoint.ts", [ws, "C01"]);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /exists; pass --force/);
    rmSync(file);
    const wrote = runScript("checkpoint.ts", [ws, "c01"]);
    assert.equal(wrote.status, 0, wrote.stderr);
    assert.match(wrote.stdout, /^wrote checkpoints\/C01-section-1\.md: 8 prompts/);
    const text = readFileSync(file, "utf8");
    assert.match(text, /^samples: \[L01, L02\]$/m);
    assert.match(text, /^## If you scored below 6$/m);
    const lint = runScript("lint.ts", [ws, "C01"]);
    assert.equal(lint.status, 0, lint.stdout + lint.stderr);
    assert.match(lint.stdout, /0 error\(s\), 0 warning\(s\)/);
  } finally {
    removeDir(ws);
  }
});

test("it refuses an item that is not a checkpoint", () => {
  const ws = tempWorkspace();
  try {
    const result = runScript("checkpoint.ts", [ws, "L01"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /L01 is a lesson, not a checkpoint/);
  } finally {
    removeDir(ws);
  }
});

test("about two thirds come from the own section, capped at ten, interleaved across lessons", () => {
  const plan = planCheckpoint([lesson("L04", 2, 5), lesson("L05", 2, 5)], [lesson("L01", 1, 4), lesson("L02", 1, 4)]);
  assert.equal(plan.prompts.length, 10);
  assert.equal(plan.own, 7);
  assert.equal(plan.prompts.filter((p) => p.lesson.section === 2).length, 7);
  for (let i = 1; i < plan.prompts.length; i++) assert.notEqual(plan.prompts[i].lesson.id, plan.prompts[i - 1].lesson.id);
});

test("a thin previous section gives way to the own section, and the first checkpoint samples only its own", () => {
  const thin = planCheckpoint([lesson("L04", 2, 8)], [lesson("L01", 1, 1)]);
  assert.equal(thin.prompts.length, 9);
  assert.equal(thin.own, 8);
  const first = planCheckpoint([lesson("L01", 1, 4), lesson("L02", 1, 4)], []);
  assert.equal(first.own, first.prompts.length);
  assert.throws(() => planCheckpoint([lesson("L01", 1, 3)], [lesson("L00", 0, 2)]), /only 5 retrieval prompts/);
});

test("the re-read pointer names Core idea, or Assignment without one, and the assignment item the answers cite most", () => {
  const cited = lesson("L03", 2, 3, {
    assignment: [
      { title: "A", url: "https://a.example/guide" },
      { title: "B", url: "https://b.example/docs/" },
    ],
    prompts: [
      { text: "p1", answer: "x. Source: [B](https://b.example/docs#routing)" },
      { text: "p2", answer: "y. Source: [B](https://b.example/docs)" },
      { text: "p3", answer: "z. Source: [Core idea](#core-idea)" },
    ],
  });
  assert.equal(rereadLine(cited, [0, 1, 2]), "- L03: re-read [Core idea](../lessons/L03-x.md#core-idea) and redo assignment item 2.");
  const advanced = lesson("L07", 3, 2, { anchors: ["#assignment"] });
  assert.equal(rereadLine(advanced, [0]), "- L07: re-read [Assignment](../lessons/L07-x.md#assignment).");
});
