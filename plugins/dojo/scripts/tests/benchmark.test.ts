import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { claudeArgs, emptyCells, formatTable, parseClaudeResult, prompt } from "../benchmark.ts";
import { FIXTURES, runScript } from "./helpers.ts";

const fixture = readFileSync(join(FIXTURES, "benchmark", "claude-result.json"), "utf8");

test("reads usage and cost from claude's JSON result", () => {
  assert.deepEqual(parseClaudeResult(fixture), { input: 130250, output: 6100, cost: 0.4321 });
  assert.throws(() => parseClaudeResult('{"is_error": true, "result": "boom"}'), /claude reported an error: boom/);
});

test("formats the table with one row per artifact and depth, columns per level", () => {
  const cells = emptyCells();
  cells.lesson.quick.beginner = { input: 130250, output: 6100, cost: 0.4321, runs: 1 };
  cells.syllabus.deep.advanced = { input: 250000.4, output: 12000, cost: 1.1, runs: 2 };
  const table = formatTable({ date: "2026-09-25", model: "claude-example", runs: 1, cells, notes: ["one run failed"] });
  const lines = table.split("\n");
  assert.equal(lines[0], "# Token benchmark");
  assert.match(lines[2], /^Measured on 2026-09-25 with model `claude-example`, 1 run\(s\) per cell/);
  assert.equal(lines[4], "| Artifact | Depth | Beginner | Intermediate | Advanced |");
  assert.equal(lines[5], "|---|---|---|---|---|");
  assert.equal(lines[6], "| syllabus | quick | not measured | not measured | not measured |");
  assert.equal(lines[8], "| syllabus | deep | not measured | not measured | 250,000 / 12,000 |");
  assert.equal(lines[9], "| lesson | quick | 130,250 / 6,100 | not measured | not measured |");
  assert.equal(lines.filter((l) => l.startsWith("| ")).length, 13);
  assert.match(table, /2 cell\(s\) measured; total cost of the runs USD 1\.53\./);
  assert.match(table, /- one run failed/);
  assert.match(formatTable({ date: "2026-09-25", model: "m", runs: 1, cells: emptyCells(), notes: [] }), /No cells measured \(dry run\)\./);
});

test("builds the claude command and prompts per artifact", () => {
  assert.deepEqual(claudeArgs("p", "/plugin", "claude-x"), ["-p", "p", "--output-format", "json", "--plugin-dir", "/plugin", "--permission-mode", "acceptEdits", "--model", "claude-x"]);
  assert.match(prompt("syllabus", "/ws", "deep", "advanced"), /\/dojo:plan in the workspace \/ws.*level advanced.*depth deep/);
  assert.match(prompt("checkpoint", "/ws", "quick", "beginner"), /\/dojo:next in the workspace \/ws/);
});

test("--dry-run prints 36 commands and writes an unmeasured table without running claude", () => {
  const out = join(process.env.TMPDIR ?? "/tmp", `dojo-bench-${process.pid}.md`);
  const result = runScript("benchmark.ts", ["--plugin", "/plugin", "--out", out, "--dry-run"]);
  assert.equal(result.status, 0, result.stderr);
  const commands = result.stdout.split("\n").filter((l) => l.startsWith("claude -p"));
  assert.equal(commands.length, 36);
  assert.match(commands[0], /--output-format json --plugin-dir \/plugin --permission-mode acceptEdits$/);
  assert.match(readFileSync(out, "utf8"), /\| checkpoint \| deep \| not measured \| not measured \| not measured \|/);
  assert.equal(runScript("benchmark.ts", ["--help"]).status, 0);
});
