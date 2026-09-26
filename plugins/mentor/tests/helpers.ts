// Shared test helpers: fixture paths, temporary directories and running a
// script as a child process with the current runtime.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
export const SCRIPTS_DIR = resolve(TESTS_DIR, "..", "skills", "mentor-review", "scripts");
export const FIXTURES = join(TESTS_DIR, "fixtures");
// A two-file dojo course, enough for the reviewer to recognise a workspace.
export const DOJO_WORKSPACE = join(FIXTURES, "dojo-workspace");

export function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "mentor-test-"));
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
