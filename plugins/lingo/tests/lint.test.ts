import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lintWorkspace } from "../skills/lingo/scripts/lint.ts";
import { WORKSPACE_FIXTURE, removeDir, runScript, tempWorkspace } from "./helpers.ts";

const L01 = join("lessons", "L01-daily-routines-with-reflexive-verbs.md");
const L01_ANSWERS = join("lessons", "L01-daily-routines-with-reflexive-verbs.answers.md");
const T01 = join("tasks", "T01-describe-your-morning-in-a-voice-note.md");
const TALK = join("talk", "2026-10-04-weekend-plans.md");
const REVIEW = join("reviews", "T01-voice-note-script-r1.md");

function rules(ws: string, targets: string[] = []): string[] {
  return [...new Set(lintWorkspace(ws, targets).findings.map((f) => `${f.severity} ${f.rule}`))].sort();
}

// Runs check on a copy of the fixture with one file edited.
function edited(file: string, edit: (text: string) => string, check: (ws: string) => void): void {
  const ws = tempWorkspace();
  try {
    const path = join(ws, file);
    const before = readFileSync(path, "utf8");
    const after = edit(before);
    assert.notEqual(after, before, `the edit to ${file} changed nothing`);
    writeFileSync(path, after);
    check(ws);
  } finally {
    removeDir(ws);
  }
}

test("the fixture, its talk record and its review pass with no findings", () => {
  assert.deepEqual(lintWorkspace(WORKSPACE_FIXTURE).findings, []);
  assert.deepEqual(lintWorkspace(WORKSPACE_FIXTURE, [TALK, REVIEW]).findings, []);
  const cli = runScript("lint.ts", [WORKSPACE_FIXTURE, "L01", "T01"]);
  assert.equal(cli.status, 0, cli.stdout);
  assert.match(cli.stdout, /0 error\(s\), 0 warning\(s\)/);
});

test("a lesson needs its Words table, with the four columns, enough rows and a source", () => {
  // Dropping Words also breaks the prompts that point at #words.
  edited(L01, (t) => t.replace(/## Words[\s\S]*?(?=## Assignment)/, ""), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/headings", "error lesson/retrieval-anchor"]));
  edited(L01, (t) => t.replace("| Word | Reading | Meaning | Example |", "| Word | Meaning | Reading | Example |"), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/words"]));
  edited(L01, (t) => t.replace(/\| primero[^\n]*\n\| luego[^\n]*\n\| después[^\n]*\n/, ""), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/words"]));
  edited(L01, (t) => t.replace(/Source: \[Wiktionary[^\n]*\n/, ""), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/words-source"]));
  edited(L01, (t) => t.replace("Source: [Wiktionary: Spanish frequency list](https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/Spanish1000)", "Source: [Somewhere](https://example.com/words)"), (ws) =>
    assert.deepEqual(rules(ws, ["L01"]), ["error lesson/words-source"]),
  );
  edited(L01, (t) => t.replace("| temprano | - | early |", "| temprano |  | early |"), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/words"]));
});

test("retrieval prompts carry a label, and a lesson has at least one Explain and one Say", () => {
  edited(L01, (t) => t.replace("1. Explain: [How does", "1. Recall: [How does"), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/retrieval-explain"]));
  edited(L01, (t) => t.replaceAll("Say: [", "Recall: ["), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/retrieval-say"]));
  edited(L01, (t) => t.replace("3. Recall: [Where", "3. Translate: [Where"), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/retrieval"]));
  edited(L01, (t) => t.replace("3. Recall: [Where does the pronoun go", "3. [Where does the pronoun go"), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/retrieval"]));
});

test("the word budget and the style rules follow the placement", () => {
  const padding = Array.from({ length: 60 }, () => "Spanish uses this pattern for the steps of a morning at home.").join(" ");
  edited(L01, (t) => t.replace("## Lesson overview", `${padding}\n\n## Lesson overview`), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/budget"]));
  // At A2 the introduction is English prose, so the style rules apply to it.
  edited(L01, (t) => t.replace("Spanish describes most of a morning", "Spanish delves into most of a morning"), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error style/vocabulary"]));
  // At B2 every authored part is in Spanish, so English style rules never run on it.
  edited(L01, (t) => t.replace("Spanish describes most of a morning", "Spanish delves into most of a morning"), (ws) => {
    const profile = join(ws, "profile.md");
    writeFileSync(profile, readFileSync(profile, "utf8").replace("level: A2", "level: B2"));
    assert.deepEqual(rules(ws, ["L01"]), []);
  });
  // A native language other than English turns the style rules off for native parts too.
  edited(L01, (t) => t.replace("Spanish describes most of a morning", "Spanish delves into most of a morning"), (ws) => {
    const profile = join(ws, "profile.md");
    writeFileSync(profile, readFileSync(profile, "utf8").replace("native_language: English", "native_language: French"));
    assert.deepEqual(rules(ws, ["L01"]), []);
  });
});

test("sidecar counts must match the lesson", () => {
  edited(L01_ANSWERS, (t) => t.replace(/4\. One model: "¿A qué hora te acuestas\?"[^\n]*\n/, ""), (ws) => assert.deepEqual(rules(ws, ["L01"]), ["error lesson/sidecar"]));
});

test("a guided task needs a model with gaps and the fixed rules", () => {
  edited(T01, (t) => t.replaceAll("___", "siete"), (ws) => assert.deepEqual(rules(ws, ["T01"]), ["error task/model"]));
  edited(T01, (t) => t.replace("> **Authored model text.** Written for this task, not quoted from a resource.", "Here is a model."), (ws) => assert.deepEqual(rules(ws, ["T01"]), ["error task/model"]));
  edited(T01, (t) => t.replace("- Produce it yourself.", "- Write it yourself."), (ws) => assert.deepEqual(rules(ws, ["T01"]), ["error task/rules"]));
  edited(T01, (t) => t.replace("skills: [speaking, listening]", "skills: [grammar]"), (ws) => assert.deepEqual(rules(ws, ["T01"]), ["error task/skills"]));
  edited(T01, (t) => t.replace("kind: guided", "kind: independent"), (ws) => assert.deepEqual(rules(ws, ["T01"]), ["error task/kind"]));
  edited(join("syllabus.md"), (t) => t.replace("| T01 | guided-task |", "| T01 | task |"), (ws) => {
    assert.deepEqual(
      lintWorkspace(ws, ["T01"])
        .findings.map((f) => f.rule)
        .sort(),
      ["task/kind", "task/model"],
    );
    assert.equal(lintWorkspace(ws).findings.some((f) => f.rule === "syllabus/guided-first"), false, "A2 needs no guided task first");
    const profile = join(ws, "profile.md");
    writeFileSync(profile, readFileSync(profile, "utf8").replace("level: A2", "level: A1"));
    assert.ok(lintWorkspace(ws).findings.some((f) => f.rule === "syllabus/guided-first"));
  });
});

test("a checkpoint written by the script lints clean, and a changed meaning is caught", () => {
  const ws = tempWorkspace();
  try {
    assert.equal(runScript("checkpoint.ts", [ws, "C01"]).status, 0);
    runScript("mark-done.ts", [ws, "C01", "--status", "generated"]);
    assert.deepEqual(lintWorkspace(ws).findings, []);
    const path = join(ws, "checkpoints", "C01-section-1.md");
    writeFileSync(path, readFileSync(path, "utf8").replace("[to wake up]", "[to awaken]"));
    assert.deepEqual(rules(ws, ["C01"]), ["error checkpoint/verbatim"]);
    writeFileSync(path, readFileSync(path, "utf8").replace("Predicted: ___ / 18", "Predicted: ___ / 8"));
    assert.ok(rules(ws, ["C01"]).includes("error checkpoint/count"));
  } finally {
    removeDir(ws);
  }
});

test("a talk record holds at most five corrections, each tied to a lesson or -", () => {
  const row = "| Es las cinco | Son las cinco | Plural hours take son | L02 |\n";
  edited(TALK, (t) => t.replace("| Es las cinco | Son las cinco | Plural hours take son | L02 |\n", row.repeat(5)), (ws) => assert.deepEqual(rules(ws, [TALK]), ["error talk/corrections"]));
  edited(TALK, (t) => t.replace("| Days take el, not en | L02 |", "| Days take el, not en | L09 |"), (ws) => assert.deepEqual(rules(ws, [TALK]), ["error talk/corrections"]));
  edited(TALK, (t) => t.replace(/## Focus next\n\n[^\n]+\n/, "## Focus next\n"), (ws) => assert.deepEqual(rules(ws, [TALK]), ["error talk/focus"]));
});

test("a writing review uses known codes, numbered marks and a marker per mark", () => {
  edited(REVIEW, (t) => t.replace("| preposition |", "| grammar |"), (ws) => assert.deepEqual(rules(ws, [REVIEW]), ["error review/code"]));
  edited(REVIEW, (t) => t.replace("en lunes [2]", "en lunes"), (ws) => assert.deepEqual(rules(ws, [REVIEW]), ["error review/marker"]));
  edited(REVIEW, (t) => t.replace("| 2 | en lunes |", "| 3 | en lunes |"), (ws) => assert.deepEqual(rules(ws, [REVIEW]), ["error review/marks"]));
  const many = Array.from({ length: 9 }, (_, i) => `| ${i + 1} | Me | spelling | What is the first letter? | open |`).join("\n");
  edited(REVIEW, (t) => t.replace(/\| 1 \| yo desayuno[^\n]*\n\| 2 \| en lunes[^\n]*/, many).replace("Me levanto", "Me [1][2][3][4][5][6][7][8][9] levanto"), (ws) =>
    assert.deepEqual(rules(ws, [REVIEW]), ["error review/marks"]),
  );
});

test("the ledger's Level column takes a CEFR band, a range or -", () => {
  edited("ledger.md", (t) => t.replace("| 2026-09 | A1-B1 | L01, L02 |", "| 2026-09 | beginner | L01, L02 |"), (ws) => assert.deepEqual(rules(ws), ["error ledger/level"]));
  edited("ledger.md", (t) => t.replace("| 2026-09 | A1-B1 | L01, L02 |", "| 2026-09 | B1-A1 | L01, L02 |"), (ws) => assert.deepEqual(rules(ws), ["error ledger/level"]));
});
