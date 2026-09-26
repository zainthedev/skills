import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../skills/dojo/scripts/lib/frontmatter.ts";
import { fillTemplate, initWorkspace } from "../skills/dojo/scripts/init-workspace.ts";
import { removeDir, runScript, tempDir } from "./helpers.ts";

const options = {
  topic: "Node and Express",
  level: "intermediate",
  depth: "standard",
  hours: 6,
  target: "2026-12-15",
  goal: "Build and deploy a small REST API\nwith auth and tests.",
  experience: "Three years of TypeScript in React front ends.",
  created: "2026-09-25",
};

test("creates every workspace file from the intake answers", () => {
  const dir = join(tempDir(), "ws");
  try {
    const result = initWorkspace({ dir, ...options });
    assert.equal(result.workspace, dir);
    for (const name of ["profile.md", "00-how-this-works.md", "quiz-log.md", "ledger.md", ".dojo/fetched.jsonl", "lessons", "projects", "checkpoints"]) {
      assert.equal(existsSync(join(dir, name)), true, name);
    }
    const profile = parseFrontmatter(readFileSync(join(dir, "profile.md"), "utf8"));
    assert.deepEqual(profile.data, {
      dojo: "0.1.0",
      topic: "Node and Express",
      slug: "node-and-express",
      level: "intermediate",
      depth: "standard",
      research_model: "inherit",
      hours_per_week: 6,
      target_date: "2026-12-15",
      created: "2026-09-25",
    });
    assert.match(profile.body, /## Goal\n\nBuild and deploy a small REST API\nwith auth and tests\.\n\n## Prior experience\n\nThree years/);
    assert.match(profile.body, /## Notes\n\nNone\.\n$/);

    const zero = readFileSync(join(dir, "00-how-this-works.md"), "utf8");
    assert.equal(zero.includes("{{"), false);
    assert.match(zero, /course on Node and Express, built for one goal: Build and deploy a small REST API with auth and tests\./);
    assert.match(zero, /about 6 hours a week to 2026-12-15, at intermediate level/);
    assert.match(zero, /docs\/evidence\.md/);
    assert.match(zero, /dojo 0\.1\.0\. Generated on 2026-09-25\./);

    assert.equal(readFileSync(join(dir, "quiz-log.md"), "utf8"), "# Quiz log\n\n| Date | Scope | Predicted | Actual | Notes |\n|------|-------|-----------|--------|-------|\n");
    const ledger = readFileSync(join(dir, "ledger.md"), "utf8");
    assert.match(ledger, /^---\ntopic: Node and Express\n/);
    assert.match(ledger, /\| Resource \| Type \| Score \| Endorsements \| Freshness \| Version \| Used in \|/);
  } finally {
    removeDir(join(dir, ".."));
  }
});

test("refuses to overwrite an existing profile", () => {
  const dir = join(tempDir(), "ws");
  try {
    initWorkspace({ dir, ...options });
    assert.throws(() => initWorkspace({ dir, ...options }), (error: Error & { code?: number }) => error.code === 2 && /already exists/.test(error.message));
  } finally {
    removeDir(join(dir, ".."));
  }
});

test("validates level, depth, hours and target", () => {
  const dir = join(tempDir(), "ws");
  try {
    assert.throws(() => initWorkspace({ dir, ...options, level: "expert" }), /--level/);
    assert.throws(() => initWorkspace({ dir, ...options, depth: "max" }), /--depth/);
    assert.throws(() => initWorkspace({ dir, ...options, hours: 0 }), /--hours/);
    assert.throws(() => initWorkspace({ dir, ...options, target: "soon" }), /--target/);
    assert.equal(existsSync(join(dir, "profile.md")), false);
  } finally {
    removeDir(join(dir, ".."));
  }
});

test("fillTemplate rejects unknown placeholders", () => {
  assert.equal(fillTemplate("a {{x}} b", { x: "1" }), "a 1 b");
  assert.throws(() => fillTemplate("a {{y}}", { x: "1" }), /\{\{y\}\}/);
});

test("command line: help, missing options and @file values", () => {
  assert.equal(runScript("init-workspace.ts", ["--help"]).status, 0);
  const missing = runScript("init-workspace.ts", ["--dir", "/tmp/x"]);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /--topic is required/);

  const base = tempDir();
  try {
    const goalFile = join(base, "goal.txt");
    writeFileSync(goalFile, "Goal from a file.\n");
    const result = runScript("init-workspace.ts", [
      "--dir", join(base, "ws"), "--topic", "T", "--level", "beginner", "--depth", "quick", "--hours", "4", "--target", "2026-12-01",
      "--goal", `@${goalFile}`, "--experience", "none", "--json",
    ]);
    assert.equal(result.status, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.workspace, join(base, "ws"));
    assert.match(readFileSync(join(base, "ws", "profile.md"), "utf8"), /Goal from a file\./);
  } finally {
    removeDir(base);
  }
});
