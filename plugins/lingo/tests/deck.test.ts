import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deckNotes, renderDeck } from "../skills/lingo/scripts/deck.ts";
import { WORKSPACE_FIXTURE, removeDir, runScript, tempWorkspace } from "./helpers.ts";

test("every generated or done lesson's words become one note each, with Anki's headers", () => {
  const notes = deckNotes(WORKSPACE_FIXTURE);
  assert.equal(notes.length, 20);
  assert.deepEqual(notes[0], { word: "levantarse", reading: "", meaning: "to get up", example: "Me levanto a las siete.", lesson: "L01", tags: ["lingo", "spanish", "L01", "section-1"] });
  // Italics mark an authored example; the deck keeps the text without the marks.
  assert.equal(notes.find((n) => n.word === "despertarse")?.example, "Me despierto antes que mi hermana.");
  const tsv = renderDeck(notes).split("\n");
  assert.deepEqual(tsv.slice(0, 4), ["#separator:tab", "#html:false", "#columns:Word\tReading\tMeaning\tExample\tLesson\tTags", "#tags column:6"]);
  assert.equal(tsv[4].split("\t").length, 6);
});

test("a word repeated in a later lesson is exported once, and planned lessons are skipped", () => {
  const ws = tempWorkspace();
  try {
    const l02 = join(ws, "lessons", "L02-telling-the-time-and-the-days-of-the-week.md");
    writeFileSync(l02, readFileSync(l02, "utf8").replace("| menos cuarto | - | quarter to |", "| levantarse | - | quarter to |"));
    assert.equal(deckNotes(ws).length, 19);
    runScript("mark-done.ts", [ws, "L02", "--status", "planned"]);
    assert.equal(deckNotes(ws).length, 10);
    const cli = runScript("deck.ts", [ws]);
    assert.equal(cli.status, 0, cli.stderr);
    assert.match(cli.stdout, /wrote deck\.tsv: 10 notes/);
    assert.equal(readFileSync(join(ws, "deck.tsv"), "utf8").trim().split("\n").length, 14);
  } finally {
    removeDir(ws);
  }
});
