import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSite } from "../skills/lingo/scripts/build-site.ts";
import { removeDir, runScript, tempWorkspace } from "./helpers.ts";

test("--if-exists does nothing without a site and rebuilds when one exists", () => {
  const ws = tempWorkspace();
  try {
    const skipped = runScript("build-site.ts", [ws, "--if-exists"]);
    assert.equal(skipped.status, 0, skipped.stderr);
    assert.match(skipped.stdout, /no site built yet; skipping \(run \/lingo-build/);
    assert.equal(runScript("build-site.ts", [ws]).status, 0);
    assert.match(runScript("build-site.ts", [ws, "--if-exists"]).stdout, /^built \d+ files/);
  } finally {
    removeDir(ws);
  }
});

test("writes items, practice records, mistakes and the deck, with a sidebar for each", () => {
  const ws = tempWorkspace();
  try {
    writeFileSync(join(ws, "deck.tsv"), "#separator:tab\nayer\t\tyesterday\t\tL01\tlingo\n");
    const result = buildSite(ws);
    assert.deepEqual(result.files.sort(), [
      "assets/lingo.css",
      "assets/lingo.js",
      "deck.tsv",
      "how-this-works.html",
      "index.html",
      "lessons/L01-daily-routines-with-reflexive-verbs.html",
      "lessons/L02-telling-the-time-and-the-days-of-the-week.html",
      "mistakes.html",
      "reviews/T01-voice-note-script-r1.html",
      "talk/2026-10-04-weekend-plans.html",
      "tasks/T01-describe-your-morning-in-a-voice-note.html",
    ]);
    const index = readFileSync(join(ws, "site", "index.html"), "utf8");
    assert.match(index, /<h1>Spanish<\/h1>/);
    assert.match(index, /<a href="mistakes.html">Mistakes to fix<\/a>/);
    assert.match(index, /<a href="deck.tsv" download>Anki deck \(deck.tsv\)<\/a>/);
    assert.match(index, /Talk sessions<\/span> <span class="sidebar-section-count">1<\/span>/);
    assert.match(index, /2026-10-04 Weekend plans with a friend<\/span> <span class="sidebar-section-count">2 fixes<\/span>/);
    assert.match(index, /Voice note script<\/span> <span class="sidebar-section-count">2 open<\/span>/);
    assert.match(index, /<p class="continue-label">Continue<\/p><p class="continue-title"><a href="lessons\/L02-telling-the-time-and-the-days-of-the-week.html">/);
    const lesson = readFileSync(join(ws, "site", "lessons", "L01-daily-routines-with-reflexive-verbs.html"), "utf8");
    assert.match(lesson, /<table>/);
    assert.match(lesson, /<td>levantarse<\/td>/);
    assert.match(lesson, /class="reveal-toggle"/);
    const task = readFileSync(join(ws, "site", "tasks", "T01-describe-your-morning-in-a-voice-note.html"), "utf8");
    assert.match(task, /Finished with this task\?/);
    assert.equal(existsSync(join(ws, "site", ".lingo-site.json")), true);
    assert.match(readFileSync(join(ws, "site", "assets", "lingo.js"), "utf8"), /\/lingo-build/);
  } finally {
    removeDir(ws);
  }
});
