import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildDigest, formatDigest } from "../skills/dojo/scripts/context.ts";
import { WORKSPACE_FIXTURE, removeDir, runScript, tempWorkspace } from "./helpers.ts";

test("a lesson digest carries the profile, the section, the previous item, the ledger and the scout", () => {
  const ws = tempWorkspace();
  try {
    writeFileSync(
      join(ws, ".dojo", "scout.json"),
      JSON.stringify({
        dojo_scout: "0.1.0",
        topic: "Node",
        generated: "2026-09-25T09:20:00Z",
        thin_evidence: false,
        resources: [
          { url: "https://nodejs.org/en/learn", title: "Node.js: Learn", breadth: 10, depth: 15, curated: ["wiki"], freshness: { last_modified: "2026-09-01" }, hn_mentions_24m: 2, objective_score: 60, max_objective: 70 },
          { url: "https://example.com/event-loop", title: "The event loop explained", breadth: 3, depth: 5, curated: [], freshness: { last_modified: null }, hn_mentions_24m: 0, objective_score: 55, max_objective: 70 },
        ],
      }),
    );
    const d = buildDigest(ws, "L02");
    assert.equal(d.kind, "item");
    assert.equal(d.item?.id, "L02");
    assert.equal(d.profile.researchModel, "inherit");
    assert.ok(d.section && d.section.items.some((it) => it.id === "L02"));
    assert.equal(d.previous.length, 1);
    assert.equal(d.previous[0].id, "L01");
    assert.ok(d.previous[0].overview.length > 0);
    assert.ok(d.previous[0].prompts.length > 0);
    assert.ok(d.ledger.rows.length > 0);
    assert.equal(d.scout?.total, 2);
    // The title match ("event loop") outranks the higher raw score.
    assert.equal(d.scout?.resources[0].url, "https://example.com/event-loop");
    const text = formatDigest(ws, d);
    assert.match(text, /^# Digest for L02 /);
    assert.match(text, /## Previous items in this section\n### L01 /);
    assert.match(text, /## Scout: top 2 of 2 resources/);
    assert.doesNotMatch(text, /Sampled lessons/);
  } finally {
    removeDir(ws);
  }
});

test("a checkpoint digest lists the sampled lessons' prompts with their answers", () => {
  const d = buildDigest(WORKSPACE_FIXTURE, "C01");
  assert.equal(d.item?.type, "checkpoint");
  assert.equal(d.scout, null);
  assert.ok(d.sampled.length >= 1);
  const first = d.sampled[0];
  assert.match(first.file, /^\.\.\/lessons\/L0\d-.*\.md$/);
  assert.ok(first.prompts.length > 0);
  assert.ok(first.prompts.every((p) => p.text.length > 0));
  const text = formatDigest(WORKSPACE_FIXTURE, d);
  assert.match(text, /## Sampled lessons: prompts and answers/);
  assert.match(text, /Answer: /);
});

test("the syllabus digest needs no syllabus and uses the wider scout cut", () => {
  const d = buildDigest(WORKSPACE_FIXTURE, "syllabus");
  assert.equal(d.kind, "syllabus");
  assert.equal(d.item, null);
  assert.match(formatDigest(WORKSPACE_FIXTURE, d), /^# Digest for the syllabus pass: /);
});

test("the CLI prints Markdown, JSON with --json, and fails on an unknown ID", () => {
  const md = runScript("context.ts", [WORKSPACE_FIXTURE, "L01"]);
  assert.equal(md.status, 0);
  assert.match(md.stdout, /^# Digest for L01 /);
  const json = runScript("context.ts", [WORKSPACE_FIXTURE, "L01", "--json"]);
  assert.equal(json.status, 0);
  assert.equal(JSON.parse(json.stdout).item.id, "L01");
  const bad = runScript("context.ts", [WORKSPACE_FIXTURE, "L99"]);
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /no item L99/);
});
