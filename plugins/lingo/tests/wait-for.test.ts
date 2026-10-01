import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scoutFileForSlug, waitFor } from "../skills/lingo/scripts/wait-for.ts";
import { removeDir, runScript, tempDir } from "./helpers.ts";

test("resolves once the file exists", async () => {
  const dir = tempDir();
  try {
    const file = join(dir, "scout.json");
    setTimeout(() => writeFileSync(file, '{"done": true}'), 200);
    const started = Date.now();
    assert.equal(await waitFor(file, 10, 0.1), true);
    assert.ok(Date.now() - started >= 200, "returned before the file existed");
  } finally {
    removeDir(dir);
  }
});

test("keeps waiting while the file is still growing", async () => {
  const dir = tempDir();
  try {
    const file = join(dir, "scout.json");
    let text = "";
    const growth = setInterval(() => {
      text += "x".repeat(64);
      writeFileSync(file, text);
    }, 40);
    setTimeout(() => clearInterval(growth), 500);
    const started = Date.now();
    assert.equal(await waitFor(file, 10, 0.1), true);
    assert.ok(Date.now() - started >= 500, "returned while the file was still growing");
  } finally {
    removeDir(dir);
  }
});

test("gives up at the timeout", async () => {
  const dir = tempDir();
  try {
    assert.equal(await waitFor(join(dir, "never.json"), 0.3, 0.1), false);
  } finally {
    removeDir(dir);
  }
});

test("the CLI exits 1 on timeout and 0 when the file is ready", () => {
  const dir = tempDir();
  try {
    const missing = runScript("wait-for.ts", [join(dir, "missing.json"), "--timeout", "1", "--interval", "0.2"]);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /not ready after 1s/);
    const file = join(dir, "ready.json");
    writeFileSync(file, "{}");
    const ready = runScript("wait-for.ts", [file, "--timeout", "5", "--interval", "0.2"]);
    assert.equal(ready.status, 0);
    assert.equal(ready.stdout.trim(), file);
    assert.equal(runScript("wait-for.ts", ["--help"]).status, 0);
  } finally {
    removeDir(dir);
  }
});

test("--slug names the scout's temp file and --into moves the ready file into place", () => {
  const dir = tempDir();
  try {
    assert.equal(scoutFileForSlug("Rust Async!"), join(tmpdir(), "lingo-scout-rust-async.json"));
    const file = join(dir, "lingo-scout-test.json");
    writeFileSync(file, '{"ok": true}');
    const into = join(dir, "ws", ".lingo", "scout.json");
    const moved = runScript("wait-for.ts", [file, "--timeout", "5", "--interval", "0.2", "--into", into]);
    assert.equal(moved.status, 0, moved.stderr);
    assert.equal(moved.stdout.trim(), into);
    assert.equal(existsSync(file), false);
    assert.equal(readFileSync(into, "utf8"), '{"ok": true}');
    const noArgs = runScript("wait-for.ts", []);
    assert.equal(noArgs.status, 2);
  } finally {
    removeDir(dir);
  }
});
