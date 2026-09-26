import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { asList, asNumber, parseFrontmatter, parseScalar, stringifyFrontmatter, updateFrontmatter, withFrontmatter } from "../lib/frontmatter.ts";
import { WORKSPACE_FIXTURE } from "./helpers.ts";

test("parses every scalar kind the formats use", () => {
  const text = `---
dojo: 0.1.0
hours_per_week: 6
hours: 0.5
thin_evidence: false
target_date: 2026-12-15
title: "Checkpoint: Section 2"
single: 'it''s quoted'
empty:
nothing: null
---
body`;
  const { data, body, hasFrontmatter, frontmatterLines } = parseFrontmatter(text);
  assert.equal(hasFrontmatter, true);
  assert.equal(frontmatterLines, 11);
  assert.deepEqual(data, {
    dojo: "0.1.0",
    hours_per_week: 6,
    hours: 0.5,
    thin_evidence: false,
    target_date: "2026-12-15",
    title: "Checkpoint: Section 2",
    single: "it's quoted",
    empty: "",
    nothing: null,
  });
  assert.equal(body, "body");
});

test("parses inline and block lists", () => {
  const text = `---
reuses: [L01, L03, L04]
subreddits: []
structure_sources:
  - https://expressjs.com/en/guide/routing.html
  - "https://example.com/a, b"
---
`;
  const { data } = parseFrontmatter(text);
  assert.deepEqual(data.reuses, ["L01", "L03", "L04"]);
  assert.deepEqual(data.subreddits, []);
  assert.deepEqual(data.structure_sources, ["https://expressjs.com/en/guide/routing.html", "https://example.com/a, b"]);
});

test("text without frontmatter is all body", () => {
  const parsed = parseFrontmatter("# Title\n\ntext\n");
  assert.equal(parsed.hasFrontmatter, false);
  assert.deepEqual(parsed.data, {});
  assert.equal(parsed.body, "# Title\n\ntext\n");
});

test("round-trips the fixture files byte for byte", () => {
  for (const name of ["profile.md", "syllabus.md", "ledger.md", "checkpoints/C01-section-1.md", "projects/P01-finish-the-file-counter.md"]) {
    const original = readFileSync(join(WORKSPACE_FIXTURE, name), "utf8");
    const parsed = parseFrontmatter(original);
    assert.equal(withFrontmatter(parsed.data, parsed.body), original, name);
  }
});

test("body is preserved even when it contains fences and odd bytes", () => {
  const body = "\n---\nnot frontmatter\n\r\n  trailing spaces  \n```\n---\n```\n";
  const text = withFrontmatter({ id: "L01" }, body);
  const parsed = parseFrontmatter(text);
  assert.equal(parsed.body, body);
  assert.deepEqual(parsed.data, { id: "L01" });
});

test("serializes strings that need quoting and keeps dates bare", () => {
  const out = stringifyFrontmatter({ title: "Checkpoint: Section 2", date: "2026-09-25", n: 3, flag: true, version: "0.1.0", empty: "", listy: "[x]" });
  assert.equal(out, '---\ntitle: "Checkpoint: Section 2"\ndate: 2026-09-25\nn: 3\nflag: true\nversion: 0.1.0\nempty: ""\nlisty: "[x]"\n---\n');
  const back = parseFrontmatter(out + "x").data;
  assert.deepEqual(back, { title: "Checkpoint: Section 2", date: "2026-09-25", n: 3, flag: true, version: "0.1.0", empty: "", listy: "[x]" });
});

test("updateFrontmatter merges keys and leaves the body alone", () => {
  const text = "---\nlevel: beginner\ndepth: quick\n---\n# Body\n";
  const updated = updateFrontmatter(text, { level: "advanced" });
  assert.equal(updated, "---\nlevel: advanced\ndepth: quick\n---\n# Body\n");
});

test("scalar helpers", () => {
  assert.equal(parseScalar('"a\\"b"'), 'a"b');
  assert.equal(parseScalar("12"), 12);
  assert.equal(parseScalar("2026-09"), "2026-09");
  assert.equal(asNumber("4"), 4);
  assert.equal(asNumber("x"), null);
  assert.deepEqual(asList("L01"), ["L01"]);
  assert.deepEqual(asList(undefined), []);
});

test("rejects a malformed line", () => {
  assert.throws(() => parseFrontmatter("---\nno colon here\n---\n"), /expected "key: value"/);
});
