import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assignmentCard, buildSite } from "../skills/dojo/scripts/build-site.ts";
import { FIXTURES, removeDir, runScript, tempWorkspace } from "./helpers.ts";

test("--if-exists does nothing without a site and rebuilds when one exists", () => {
  const ws = tempWorkspace();
  try {
    const skipped = runScript("build-site.ts", [ws, "--if-exists"]);
    assert.equal(skipped.status, 0, skipped.stderr);
    assert.match(skipped.stdout, /no site built yet/);
    assert.equal(existsSync(join(ws, "site", "index.html")), false);
    assert.equal(runScript("build-site.ts", [ws]).status, 0);
    const rebuilt = runScript("build-site.ts", [ws, "--if-exists"]);
    assert.match(rebuilt.stdout, /^built \d+ files/);
  } finally {
    removeDir(ws);
  }
});

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
    // P02 is planned with no file, so it gets a note instead of a button.
    assert.equal((index.match(/class="done-button"/g) ?? []).length, 4);
    assert.match(index, /<tr class="status-planned" data-id="P02">.*<span class="not-generated">not generated yet<\/span>/);
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
    // Each Why, How and Do line is its own labelled row in a card, the first letter capitalised.
    assert.equal((page.match(/class="assignment-card"/g) ?? []).length, 3);
    assert.match(page, /<p class="assignment-title"><strong><a href="https:\/\/nodejs\.org\/en\/learn\/getting-started\/introduction-to-nodejs">Introduction to Node\.js<\/a><\/strong> <span class="assignment-host">nodejs\.org<\/span><\/p>/);
    assert.match(page, /<div class="step step-why"><dt>Why<\/dt><dd>The official one-page answer to what Node is\.<\/dd><\/div><div class="step step-how">/);
    assert.match(page, /<div class="step step-do"><dt>Do<\/dt><dd>Run <code>node --version<\/code> and a one-line script from the terminal\.<\/dd><\/div><\/dl>\n<ul>\n<li>Skip the assignment links/);
    // A done item ends with its date and the way on.
    assert.match(page, /<section class="finish controls"><p>Done on 2026-09-20\. <a href="\.\.\/lessons\/L02-the-event-loop\.html">Next: L02 The event loop<\/a><\/p><\/section>/);
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
    assert.match(page, /<li class="status-done is-current"><a href="\.\.\/lessons\/L02-the-event-loop.html" aria-current="page"><span class="status-dot status-dot-done" aria-hidden="true"><\/span><span class="visually-hidden">\(done\)<\/span><span class="item-id">L02<\/span> <span class="item-title">The event loop<\/span><\/a><\/li>/);
    assert.match(page, /<span class="sidebar-planned"><span class="status-dot status-dot-planned" aria-hidden="true"><\/span><span class="visually-hidden">\(planned\)<\/span><span class="item-id">P02<\/span> <span class="item-title">Build a directory watcher<\/span><\/span>/);
    assert.match(page, /<nav class="sidebar" aria-label="Syllabus">/);
    assert.match(page, /<p class="sidebar-progress">3 of 5 done<\/p>/);
    assert.match(page, /role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="5" aria-valuenow="3"><span style="width: 60%">/);
    // The page's own section is open, with its count.
    assert.match(page, /<details class="sidebar-section" open><summary><span class="sidebar-section-title">Section 1: Node fundamentals<\/span> <span class="sidebar-section-count" aria-label="3 of 5 done">3\/5<\/span><\/summary>/);
    assert.equal(page.includes("badge-planned"), false);
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

test("the site script ships as plain JavaScript stripped from the TypeScript source", () => {
  const ws = tempWorkspace();
  try {
    assert.equal(runScript("build-site.ts", [ws]).status, 0);
    const js = readFileSync(join(ws, "site", "assets", "dojo.js"), "utf8");
    assert.doesNotMatch(js, /\bvar\b/);
    assert.doesNotMatch(js, /: (string|void|HTMLButtonElement|NoticeKind)\b|interface DoneResponse|as DoneResponse/);
    assert.match(js, /const setupReveals = /);
    assert.match(js, /\/api\/done/);
    // It parses as JavaScript.
    new Function(js);
  } finally {
    removeDir(ws);
  }
});

test("assignmentCard leaves items without Why, How and Do lines alone", () => {
  assert.equal(assignmentCard("Given a directory, the tool prints one line per file."), null);
  assert.equal(assignmentCard('<strong><a href="https://x.example/a">A</a></strong><br>\nWhat: not a step'), null);
  const wrapped = assignmentCard('<strong><a href="https://www.x.example/a">A</a></strong><br>\nWhy: one<br>\ntwo<br>\nDo: three');
  assert.match(wrapped ?? "", /<span class="assignment-host">x\.example<\/span>/);
  assert.match(wrapped ?? "", /<dt>Why<\/dt><dd>One two<\/dd>/);
});

test("an unfinished item ends with a done button that opens the next item, and the index shows where to continue", () => {
  const ws = tempWorkspace();
  try {
    buildSite(ws);
    const checkpoint = readFileSync(join(ws, "site", "checkpoints", "C01-section-1.html"), "utf8");
    assert.match(checkpoint, /<section class="finish controls"><p class="finish-prompt">Finished with this checkpoint\?<\/p><span class="done-control"><button type="button" class="done-button" data-id="C01" data-status="done">Mark done<\/button>/);
    const index = readFileSync(join(ws, "site", "index.html"), "utf8");
    assert.match(index, /<section class="continue continue-next"><p class="continue-label">Next up<\/p><p class="continue-title">Build a directory watcher<\/p>/);
    assert.match(index, /Run <code>\/dojo-next<\/code> in your agent to generate it\./);
  } finally {
    removeDir(ws);
  }
});

test("a workspace's code reviews get a page each and a sidebar entry with their open count", () => {
  const ws = tempWorkspace();
  try {
    mkdirSync(join(ws, "reviews"));
    writeFileSync(join(ws, "reviews", "branch-feature-cart.md"), readFileSync(join(FIXTURES, "review.md"), "utf8"));
    const result = buildSite(ws);
    assert.ok(result.files.includes("reviews/branch-feature-cart.html"));
    const page = readFileSync(join(ws, "site", "reviews", "branch-feature-cart.html"), "utf8");
    assert.match(page, /<h1[^>]*>Review: branch feature\/cart<\/h1>/);
    assert.match(page, /aria-current="page"><span class="item-title">Review: branch feature\/cart<\/span> <span class="sidebar-section-count">2 open<\/span>/);
    const index = readFileSync(join(ws, "site", "index.html"), "utf8");
    assert.match(index, /<a href="reviews\/branch-feature-cart\.html">/);
  } finally {
    removeDir(ws);
  }
});
