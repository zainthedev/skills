import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatReport, measure, projectDirNames, sumTranscript } from "../skills/dojo/scripts/measure.ts";
import { FIXTURES, removeDir, runScript, tempDir } from "./helpers.ts";

const PROJECTS = join(FIXTURES, "transcript", "projects");
const TRANSCRIPT = join(PROJECTS, "-tmp-dojo-measure", "session-a.jsonl");

test("sums each assistant message once, at or after --since", async () => {
  const usage = await sumTranscript(TRANSCRIPT, "2026-09-25T10:30:00Z");
  assert.deepEqual(usage, { input: 210, output: 85, cacheCreation: 30, cacheRead: 40, messages: 2 });
  const all = await sumTranscript(TRANSCRIPT, "2026-09-25T00:00:00Z");
  assert.equal(all.messages, 3);
  assert.equal(all.input, 310);
});

test("resolves the transcript from cwd and adds subagent usage as a separate row", async () => {
  const result = await measure({ since: "2026-09-25T10:30:00Z", cwd: "/tmp/dojo/measure", projectsDir: PROJECTS });
  assert.equal(result.available, true);
  assert.equal(result.session, "session-a");
  assert.equal(result.subagentFiles, 1);
  assert.deepEqual(result.subagents, { input: 1000, output: 300, cacheCreation: 0, cacheRead: 500, messages: 1 });
  assert.deepEqual(result.total, { input: 1210, output: 385, cacheCreation: 30, cacheRead: 540, messages: 3 });
  const report = formatReport(result);
  assert.match(report, /session +210 +30 +40 +85 +365 +2/);
  assert.match(report, /subagents \(1\) +1,000/);
  assert.match(report, /total +1,210/);
  assert.match(report, /Subagent transcripts were summed separately/);
});

test("without --session the most recently modified transcript wins", async () => {
  const base = tempDir();
  try {
    const dir = join(base, "-work-dir");
    mkdirSync(dir, { recursive: true });
    copyFileSync(TRANSCRIPT, join(dir, "old.jsonl"));
    writeFileSync(join(dir, "new.jsonl"), '{"type":"assistant","timestamp":"2026-09-25T12:00:00Z","message":{"id":"m","usage":{"input_tokens":7,"output_tokens":1}}}\n');
    utimesSync(join(dir, "old.jsonl"), new Date("2026-01-01"), new Date("2026-01-01"));
    utimesSync(join(dir, "new.jsonl"), new Date("2026-06-01"), new Date("2026-06-01"));
    const result = await measure({ since: "2026-09-25T00:00:00Z", cwd: "/work/dir", projectsDir: base });
    assert.equal(result.session, "new");
    assert.equal(result.main.input, 7);
    const explicit = await measure({ since: "2026-09-25T00:00:00Z", cwd: "/work/dir", projectsDir: base, session: "old" });
    assert.equal(explicit.main.messages, 3);
  } finally {
    removeDir(base);
  }
});

test("an unavailable transcript is reported, points at /usage and still exits 0", async () => {
  const result = await measure({ since: "2026-09-25T00:00:00Z", cwd: "/nowhere", projectsDir: PROJECTS });
  assert.equal(result.available, false);
  assert.match(formatReport(result), /transcript unavailable[\s\S]*\/usage/);
  const cli = runScript("measure.ts", ["--since", "2026-09-25T00:00:00Z", "--cwd", "/nowhere", "--projects-dir", PROJECTS, "--json"]);
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).available, false);
  const bad = runScript("measure.ts", ["--since", "yesterday"]);
  assert.equal(bad.status, 1);
  assert.equal(runScript("measure.ts", ["--help"]).status, 0);
});

test("command line prints the table for --transcript", () => {
  const cli = runScript("measure.ts", ["--since", "2026-09-25T10:30:00Z", "--transcript", TRANSCRIPT]);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /Token usage since 2026-09-25T10:30:00Z \(session session-a/);
  assert.match(cli.stdout, /total +1,210/);
});

test("project directory names", () => {
  assert.deepEqual(projectDirNames("/Users/x/Projects/skills"), ["-Users-x-Projects-skills"]);
  assert.deepEqual(projectDirNames("/Users/x/my.app"), ["-Users-x-my.app", "-Users-x-my-app"]);
});
