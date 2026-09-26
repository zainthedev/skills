import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildDigest, buildQuiz, formatDigest } from "../skills/dojo/scripts/context.ts";
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

test("a checkpoint digest also carries each sampled lesson's anchors and assignment titles", () => {
  const d = buildDigest(WORKSPACE_FIXTURE, "C01");
  const first = d.sampled[0];
  assert.ok(first.anchors.includes("#core-idea"), first.anchors.join(","));
  assert.ok(first.anchors.includes("#retrieval-practice"));
  assert.ok(first.assignment.length > 0);
  assert.match(formatDigest(WORKSPACE_FIXTURE, d), /Anchors for the re-read list: .*#core-idea/);
});

test("the scout rows carry thread counts, newest mention, excerpt and the single-author flag", () => {
  const ws = tempWorkspace();
  try {
    writeFileSync(
      join(ws, ".dojo", "scout.json"),
      JSON.stringify({
        resources: [
          { url: "https://a.example/", title: "A", breadth: 3, depth: 5, curated: [], freshness: { last_modified: null }, hn_mentions_24m: 0, objective_score: 8, max_objective: 70, threads: 2, newest_mention: "2026-01-02", excerpt: "use A | it is good", author_only: true },
        ],
      }),
    );
    const text = formatDigest(ws, buildDigest(ws, "L02"));
    assert.match(text, /\| Score \| Resource \| Threads \| Newest \| Curated \| Updated \| HN \| Excerpt \|/);
    assert.match(text, /\[A\]\(https:\/\/a\.example\/\) \(single author\) \| 2 \| 2026-01-02 \| .* \| use A \\\| it is good \|/);
  } finally {
    removeDir(ws);
  }
});

test("a quiz interleaves capped prompts across the done lessons with answers and sources", () => {
  const all = buildQuiz(WORKSPACE_FIXTURE, null, 10, 0);
  assert.equal(all.scope, "every finished lesson");
  assert.deepEqual(all.lessons, ["L01", "L02"]);
  assert.ok(all.prompts.length > 2 && all.prompts.length <= 10);
  assert.equal(all.prompts.length, Math.min(10, all.total));
  for (let i = 1; i < Math.min(all.prompts.length, all.lessons.length * 2); i++) assert.notEqual(all.prompts[i].lesson, all.prompts[i - 1].lesson);
  assert.ok(all.prompts.every((p) => p.text && p.answer && /^\.\.\/lessons\/L0\d-.*#retrieval-practice$/.test(p.source)));
  const capped = buildQuiz(WORKSPACE_FIXTURE, null, 2, 0);
  assert.equal(capped.prompts.length, 2);
  // A different day starts each lesson at a different prompt.
  assert.notEqual(buildQuiz(WORKSPACE_FIXTURE, null, 10, 1).prompts[0].n, all.prompts[0].n);
  const one = buildQuiz(WORKSPACE_FIXTURE, "l01", 10, 0);
  assert.deepEqual(one.lessons, ["L01"]);
  assert.equal(buildQuiz(WORKSPACE_FIXTURE, "1", 10, 0).lessons.length, 2);
  assert.throws(() => buildQuiz(WORKSPACE_FIXTURE, "L99", 10, 0), /no item L99/);
  const cli = runScript("context.ts", [WORKSPACE_FIXTURE, "quiz", "--cap", "3"]);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /^# Quiz: every finished lesson, 3 of \d+ prompts from L01, L02\n\n1\. \(L0\d prompt \d+\) /);
  assert.match(cli.stdout, /   Answer: .+\n   Source: \.\.\/lessons\//);
  const json = runScript("context.ts", ["quiz", "L02", "--json"], WORKSPACE_FIXTURE);
  assert.deepEqual(JSON.parse(json.stdout).lessons, ["L02"]);
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
