import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { arm, collect, isArmed, logPathFor, record, tempLogPath } from "../skills/dojo/scripts/fetch-log.ts";
import { SCRIPTS_DIR, removeDir, runScript, tempDir, tempWorkspace } from "./helpers.ts";

const hook = (input: unknown, cwd: string) => spawnSync(process.execPath, [join(SCRIPTS_DIR, "fetch-log.ts")], { input: JSON.stringify(input), encoding: "utf8", cwd });

test("a WebFetch inside a workspace lands in its fetched.jsonl; other tools and bad URLs are ignored", () => {
  const ws = tempWorkspace();
  try {
    const log = join(ws, ".dojo", "fetched.jsonl");
    const before = readFileSync(log, "utf8");
    assert.equal(logPathFor(join(ws, "lessons")), log);
    assert.equal(record({ tool_name: "WebFetch", tool_input: { url: "https://example.com/a" } }, join(ws, "lessons")), log);
    assert.equal(record({ tool_name: "Read", tool_input: { file_path: "x" } }, ws), null);
    assert.equal(record({ tool_name: "WebFetch", tool_input: { url: "javascript:x" } }, ws), null);
    const after = readFileSync(log, "utf8");
    assert.equal(after.startsWith(before), true);
    assert.match(after.slice(before.length), /^\{"url":"https:\/\/example\.com\/a","fetched_at":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z","item":"hook"\}\n$/);
    const result = hook({ tool_name: "WebFetch", tool_input: { url: "https://example.com/b" }, cwd: ws }, ws);
    assert.equal(result.status, 0, result.stderr);
    assert.match(readFileSync(log, "utf8"), /example\.com\/b/);
    assert.equal(hook("not json", ws).status, 0, "a broken hook never blocks a fetch");
  } finally {
    removeDir(ws);
  }
});

test("outside a workspace nothing is recorded until --arm, then the temp log waits for --collect", () => {
  const dir = tempDir();
  const ws = tempWorkspace();
  const temp = tempLogPath(dir);
  rmSync(temp, { force: true });
  try {
    assert.equal(logPathFor(dir), null);
    assert.equal(record({ tool_name: "WebFetch", tool_input: { url: "https://example.com/ignored" } }, dir), null);
    assert.equal(existsSync(temp), false);
    assert.equal(arm(dir), temp);
    assert.equal(isArmed(dir), true);
    assert.equal(logPathFor(dir), temp);
    record({ tool_name: "WebFetch", tool_input: { url: "https://example.com/new" } }, dir);
    // Already in the fixture's log, so it must not be added twice.
    record({ tool_name: "WebFetch", tool_input: { url: "https://nodejs.org/api/fs.html#fragment" } }, dir);
    assert.deepEqual(collect(ws, dir), { added: 1, seen: 2 });
    const log = readFileSync(join(ws, ".dojo", "fetched.jsonl"), "utf8");
    assert.equal((log.match(/nodejs\.org\/api\/fs\.html/g) ?? []).length, 1);
    assert.match(log, /example\.com\/new/);
    assert.equal(existsSync(temp), false);
    assert.equal(isArmed(dir), false, "collect disarms");
    assert.deepEqual(collect(ws, dir), { added: 0, seen: 0 });
    const armed = spawnSync(process.execPath, [join(SCRIPTS_DIR, "fetch-log.ts"), "--arm"], { encoding: "utf8", cwd: dir });
    assert.equal(armed.status, 0, armed.stderr);
    assert.equal(isArmed(dir), true);
    const cli = spawnSync(process.execPath, [join(SCRIPTS_DIR, "fetch-log.ts"), "--collect", ws], { encoding: "utf8", cwd: dir });
    assert.equal(cli.status, 0, cli.stderr);
    assert.match(cli.stdout, /0 new URL\(s\)/);
    assert.equal(runScript("fetch-log.ts", ["--help"]).status, 0);
  } finally {
    rmSync(temp, { force: true });
    removeDir(dir);
    removeDir(ws);
    assert.equal(existsSync(temp), false);
  }
});
