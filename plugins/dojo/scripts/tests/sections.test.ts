import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fenceCount, findSection, firstContentLine, itemMarkdown, linksIn, listItems, splitDoc, urlsIn, wordCount } from "../lib/sections.ts";
import { WORKSPACE_FIXTURE } from "./helpers.ts";

const lesson = readFileSync(join(WORKSPACE_FIXTURE, "lessons", "L01-what-node-is.md"), "utf8");

test("splitDoc finds the title, sections and file line numbers", () => {
  const doc = splitDoc(lesson);
  assert.equal(doc.title, "What Node is");
  assert.equal(doc.titleLine, 8);
  assert.deepEqual(
    doc.sections.map((s) => s.heading),
    ["Introduction", "Lesson overview", "Before you start", "Core idea", "Assignment", "Retrieval practice", "Additional resources"],
  );
  const intro = findSection(doc, "introduction")!;
  assert.equal(intro.line, 10);
  assert.equal(intro.startLine, 11);
  assert.equal(firstContentLine(intro)?.line, 12);
});

test("listItems keeps continuation lines, sub-bullets and lazy lines with the item", () => {
  const doc = splitDoc(lesson);
  const items = listItems(findSection(doc, "Assignment")!);
  assert.equal(items.length, 3);
  assert.equal(items[0].ordered, true);
  assert.equal(items[0].line, 37);
  assert.match(items[0].text, /^\*\*\[Introduction to Node\.js\]/);
  assert.deepEqual(items[0].continuation, [
    "Why: the official one-page answer to what Node is.",
    "How: read the whole page; skip the code sample on the first read.",
    "Do: write the one-line version of what Node is in your own words.",
  ]);
  assert.equal(items[1].continuation[3], "- Skip the assignment links at the bottom; this lesson covers them.");

  const lazy = splitDoc("# T\n\n## S\n\n- first\nlazy line\n- second\n\n  indented after blank\n\nparagraph\n");
  const lazyItems = listItems(lazy.sections[0]);
  assert.deepEqual(lazyItems.map((it) => [it.text, it.continuation]), [
    ["first", ["lazy line"]],
    ["second", ["", "indented after blank"]],
  ]);
  assert.equal(itemMarkdown(lazyItems[0]), "first\nlazy line");
});

test("task list items report their checked state", () => {
  const doc = splitDoc("# T\n\n## Done when\n\n- [ ] one\n- [x] two\n- three\n");
  const items = listItems(doc.sections[0]);
  assert.deepEqual(items.map((it) => [it.text, it.checked]), [
    ["one", false],
    ["two", true],
    ["three", null],
  ]);
});

test("wordCount ignores fenced code, link targets and bare URLs", () => {
  const lines = ["Node is a [runtime](https://nodejs.org/en) for `code`.", "", "```js", "const x = 1;", "```", "See https://example.com now."];
  assert.equal(wordCount(lines), 8);
  assert.equal(fenceCount(lines), 1);
});

test("urlsIn collects link targets and bare URLs outside code", () => {
  const lines = ["A [link](https://a.com/x) and <https://b.com> and https://c.com/y.", "`https://ignored.com`", "```", "https://fenced.com", "```"];
  assert.deepEqual(
    urlsIn(lines, 10).map((u) => [u.url, u.line]),
    [
      ["https://a.com/x", 10],
      ["https://b.com", 10],
      ["https://c.com/y", 10],
    ],
  );
  assert.deepEqual(linksIn("[a](#x) then [b](https://b.com \"t\")"), [
    { text: "a", target: "#x" },
    { text: "b", target: "https://b.com" },
  ]);
});
