import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalUrl, findRow, ledgerHas, parseFetched, parseLedger, readFetched, validateLedger } from "../lib/ledger.ts";
import { WORKSPACE_FIXTURE } from "./helpers.ts";

const fixture = readFileSync(join(WORKSPACE_FIXTURE, "ledger.md"), "utf8");

test("parses rows, excluded entries and frontmatter", () => {
  const ledger = parseLedger(fixture);
  assert.equal(ledger.rows.length, 6);
  assert.deepEqual(ledger.header, ["Resource", "Type", "Score", "Endorsements", "Freshness", "Version", "Used in"]);
  const first = ledger.rows[0];
  assert.equal(first.title, "Introduction to Node.js");
  assert.equal(first.url, "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs");
  assert.equal(first.type, "docs");
  assert.equal(first.score, 90);
  assert.equal(first.freshness, "2026-08");
  assert.equal(first.version, "Node 24");
  assert.deepEqual(first.usedIn, ["L01", "L02"]);
  assert.equal(ledger.excluded.length, 1);
  assert.equal(ledger.excluded[0].url, "https://www.manning.com/books/node-js-in-action-second-edition");
  assert.match(ledger.excluded[0].reason, /paid/);
  assert.deepEqual(ledger.data.subreddits, ["node", "learnjavascript"]);
  assert.equal(ledger.data.thin_evidence, false);
});

test("canonicalUrl strips fragments, tracking params, case and trailing slashes", () => {
  assert.equal(canonicalUrl("HTTPS://Example.COM/Path/?utm_source=x&b=1#frag"), "https://example.com/Path?b=1");
  assert.equal(canonicalUrl("https://example.com/"), "https://example.com");
  assert.equal(canonicalUrl("https://example.com/a/b/"), "https://example.com/a/b");
  assert.equal(canonicalUrl("https://example.com/?utm_campaign=z"), "https://example.com");
  assert.equal(canonicalUrl("not a url"), "not a url");
});

test("ledgerHas and findRow compare canonical forms", () => {
  const ledger = parseLedger(fixture);
  assert.equal(ledgerHas(ledger, "https://nodejs.org/api/fs.html#fs"), true);
  assert.equal(ledgerHas(ledger, "https://NODEJS.org/api/fs.html/"), true);
  assert.equal(ledgerHas(ledger, "https://nodejs.org/api/path.html"), false);
  assert.equal(findRow(ledger, "https://nodejs.org/api/stream.html")?.type, "reference");
});

test("fetched.jsonl parsing tolerates bad lines and bare URLs", () => {
  const set = parseFetched('{"url": "https://a.com/x/", "fetched_at": "t", "item": "L01"}\nnot json\nhttps://b.com/#top\n{"nourl": true}\n');
  assert.deepEqual([...set].sort(), ["https://a.com/x", "https://b.com"]);
  const fromWorkspace = readFetched(WORKSPACE_FIXTURE);
  assert.equal(fromWorkspace?.has("https://nodejs.org/api/fs.html"), true);
  assert.equal(readFetched("/nonexistent"), null);
});

test("validateLedger passes the fixture and flags bad cells", () => {
  const ledger = parseLedger(fixture);
  assert.deepEqual(validateLedger(ledger, "/w/ledger.md", new Set(["L01", "L02", "P01"])), []);
  const bad = parseLedger(`---
topic: T
---
# Ledger

| Resource | Type | Score | Endorsements | Freshness | Version | Used in |
|---|---|---|---|---|---|---|
| plain text | blog | 120 | | 2026 | | L99, nope |
| [A](https://a.com/?utm_source=x) | docs | 50 | x | unknown | - | |
| [A again](https://a.com/) | docs | 50 | x | unknown | - | |
`);
  const rules = validateLedger(bad, "/w/ledger.md", new Set(["L01"])).map((f) => `${f.severity} ${f.rule}`);
  for (const expected of ["error ledger/resource", "error ledger/type", "error ledger/score", "warning ledger/endorsements", "error ledger/freshness", "error ledger/version", "error ledger/used-in", "warning ledger/used-in", "warning ledger/duplicate-url"]) {
    assert.equal(rules.includes(expected), true, `expected ${expected} in ${rules.join(", ")}`);
  }
});
