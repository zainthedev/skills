import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSite } from "../skills/dojo/scripts/build-site.ts";
import { removeDir, runScript, tempWorkspace } from "./helpers.ts";

test("writes the index, one page per item, lesson zero and the assets", () => {
  const ws = tempWorkspace();
  try {
    const result = buildSite(ws);
    assert.equal(result.outDir, join(ws, "site"));
    assert.deepEqual(result.files.sort(), [
      "assets/dojo.css",
      "assets/dojo.js",
      "checkpoints/C01-section-1.html",
      "how-this-works.html",
      "index.html",
      "lessons/L01-what-node-is.html",
      "lessons/L02-the-event-loop.html",
      "projects/P01-finish-the-file-counter.html",
    ]);
    for (const file of result.files) assert.equal(existsSync(join(ws, "site", file)), true, file);

    const index = readFileSync(join(ws, "site", "index.html"), "utf8");
    assert.match(index, /<h1>Node fundamentals<\/h1>/);
    assert.match(index, /<div class="course-goal"><h2>Goal<\/h2><p>Ship a small command line tool/);
    assert.match(index, /<h2>Section 1: Node fundamentals<\/h2>/);
    assert.match(index, /<tr class="status-done" data-id="L01">.*<a href="lessons\/L01-what-node-is.html">What Node is<\/a>.*<span class="badge badge-done">done<\/span>.*<td>2026-09-20<\/td>/);
    assert.match(index, /<tr class="status-planned" data-id="P02">.*<td>Build a directory watcher<\/td>/);
    assert.equal((index.match(/class="done-button"/g) ?? []).length, 5);
    assert.match(index, /<button type="button" class="done-button" data-id="P02" data-status="done">Mark done<\/button>/);
    assert.match(index, /<button type="button" class="done-button" data-id="L01" data-status="generated">Mark not done<\/button>/);
    assert.match(index, /href="assets\/dojo.css"/);
    assert.match(index, /<script defer src="assets\/dojo.js">/);

    const zero = readFileSync(join(ws, "site", "how-this-works.html"), "utf8");
    assert.match(zero, /<h1 id="how-this-course-works">How this course works<\/h1>/);
    assert.equal(zero.includes("id: L00"), false);
    assert.match(readFileSync(join(ws, "site", "assets", "dojo.css"), "utf8"), /@media print/);
  } finally {
    removeDir(ws);
  }
});

test("lesson pages carry accessible reveal controls filled from the sidecar", () => {
  const ws = tempWorkspace();
  try {
    buildSite(ws);
    const page = readFileSync(join(ws, "site", "lessons", "L01-what-node-is.html"), "utf8");
    assert.equal((page.match(/class="reveal-toggle"/g) ?? []).length, 6);
    assert.match(page, /<button type="button" class="reveal-toggle" aria-expanded="false" aria-controls="answer-prediction-1">Show answer<\/button><div class="reveal-panel" id="answer-prediction-1" hidden><p>A runtime: it runs JavaScript/);
    assert.match(page, /aria-controls="answer-retrieval-4"/);
    assert.match(page, /<li><a href="#core-idea">Explain in plain English what Node adds to JavaScript<\/a>\n<div class="reveal">/);
    assert.match(page, /<h2 id="retrieval-practice">Retrieval practice<\/h2>/);
    // Only the two answer sections get controls: the Assignment list has none.
    assert.equal(/<h2 id="assignment">[\s\S]*?<h2 id="retrieval-practice">/.exec(page)![0].includes("reveal"), false);
    assert.match(page, /href="\.\.\/assets\/dojo.css"/);
    assert.match(page, /<button type="button" class="done-button" data-id="L01" data-status="generated">Mark not done<\/button>/);
    assert.match(page, /<a class="pager-next" rel="next" href="\.\.\/lessons\/L02-the-event-loop.html">Next: L02 The event loop<\/a>/);
  } finally {
    removeDir(ws);
  }
});

test("the sidebar lists the syllabus and marks the current page once", () => {
  const ws = tempWorkspace();
  try {
    buildSite(ws);
    const page = readFileSync(join(ws, "site", "lessons", "L02-the-event-loop.html"), "utf8");
    assert.equal((page.match(/aria-current="page"/g) ?? []).length, 1);
    assert.match(page, /<li class="status-done is-current"><a href="\.\.\/lessons\/L02-the-event-loop.html" aria-current="page"><span class="item-id">L02<\/span> The event loop<\/a> <span class="badge badge-done">done<\/span><\/li>/);
    assert.match(page, /<span class="sidebar-planned"><span class="item-id">P02<\/span> Build a directory watcher<\/span>/);
    assert.match(page, /<nav class="sidebar" aria-label="Syllabus">/);
    assert.match(page, /<p class="sidebar-progress">3 of 5 done<\/p>/);
  } finally {
    removeDir(ws);
  }
});

test("relative .md links become .html links and keep their anchors", () => {
  const ws = tempWorkspace();
  try {
    buildSite(ws);
    const page = readFileSync(join(ws, "site", "checkpoints", "C01-section-1.html"), "utf8");
    assert.match(page, /href="\.\.\/lessons\/L01-what-node-is\.html#retrieval-practice"/);
    assert.equal(page.includes(".md#"), false);
    assert.match(page, /Predicted: ___ \/ 6/);
    assert.match(page, /<h2 id="if-you-scored-below-4">If you scored below 4<\/h2>/);
  } finally {
    removeDir(ws);
  }
});

test("answers are absent, not broken, when the sidecar is missing", () => {
  const ws = tempWorkspace();
  try {
    rmSync(join(ws, "lessons", "L02-the-event-loop.answers.md"));
    buildSite(ws);
    const page = readFileSync(join(ws, "site", "lessons", "L02-the-event-loop.html"), "utf8");
    assert.equal(page.includes("reveal"), false);
    assert.match(page, /<li><a href="#core-idea">Explain in plain English why Node does not wait/);
  } finally {
    removeDir(ws);
  }
});

test("rebuilding removes pages it generated before and leaves other files alone", () => {
  const ws = tempWorkspace();
  try {
    buildSite(ws);
    writeFileSync(join(ws, "site", "notes.txt"), "mine");
    renameSync(join(ws, "lessons", "L02-the-event-loop.md"), join(ws, "lessons", "L02-event-loop.md"));
    renameSync(join(ws, "lessons", "L02-the-event-loop.answers.md"), join(ws, "lessons", "L02-event-loop.answers.md"));
    buildSite(ws);
    assert.equal(existsSync(join(ws, "site", "lessons", "L02-the-event-loop.html")), false);
    assert.equal(existsSync(join(ws, "site", "lessons", "L02-event-loop.html")), true);
    assert.equal(readFileSync(join(ws, "site", "notes.txt"), "utf8"), "mine");
  } finally {
    removeDir(ws);
  }
});

test("command line honours --out and reports failures", () => {
  const ws = tempWorkspace();
  try {
    const out = join(ws, "public");
    const result = runScript("build-site.ts", [ws, "--out", out, "--json"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).outDir, out);
    assert.equal(existsSync(join(out, "index.html")), true);
    rmSync(join(ws, "syllabus.md"));
    const failed = runScript("build-site.ts", [ws]);
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /no syllabus\.md/);
    assert.equal(runScript("build-site.ts", ["--help"]).status, 0);
  } finally {
    removeDir(ws);
  }
});
