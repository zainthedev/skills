// Shared test helpers: fixture paths, temporary workspace copies and running
// a script as a child process with the current runtime.

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
export const SCRIPTS_DIR = resolve(TESTS_DIR, "..");
export const FIXTURES = join(TESTS_DIR, "fixtures");
export const WORKSPACE_FIXTURE = join(FIXTURES, "workspace");
export const INVALID_FIXTURES = join(FIXTURES, "invalid");

// A fresh copy of the fixture workspace in a temporary directory.
export function tempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "dojo-test-"));
  cpSync(WORKSPACE_FIXTURE, dir, { recursive: true });
  return dir;
}

export function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "dojo-test-"));
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

export function runScript(script: string, args: string[], cwd = tmpdir()): RunResult {
  const result = spawnSync(process.execPath, [join(SCRIPTS_DIR, script), ...args], { encoding: "utf8", cwd });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
