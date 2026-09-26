#!/usr/bin/env node
// Maintainer tool: regenerates docs/tokens.md by running each dojo command
// headlessly per artifact, depth and level and reading the usage it reports.

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatNumber, isMain, parseCli, requireString, runCli, todayIso } from "./lib/cli.ts";
import { DEPTHS, LEVELS, type Depth, type Level } from "./lib/constants.ts";
import { updateFrontmatter } from "./lib/frontmatter.ts";
import { setStatus } from "./lib/syllabus.ts";
import { initWorkspace } from "./init-workspace.ts";

const USAGE = `usage: benchmark.ts --plugin <plugin dir> --out <file> [--runs 1] [--model <id>] [--dry-run] [--seed <workspace>]

For each artifact (syllabus, lesson, project, checkpoint), depth (quick,
standard, deep) and level (beginner, intermediate, advanced), runs
  claude -p "<prompt>" --output-format json --plugin-dir <plugin> --permission-mode acceptEdits
in a temporary workspace seeded from --seed (default: the test fixture) and
records usage and total_cost_usd. --dry-run prints the commands and writes
the table with "not measured" cells. --runs averages several runs per cell.`;

export const ARTIFACTS = ["syllabus", "lesson", "project", "checkpoint"] as const;
export type Artifact = (typeof ARTIFACTS)[number];

export interface Cell {
  input: number;
  output: number;
  cost: number;
  runs: number;
}

export type Cells = Record<Artifact, Record<Depth, Record<Level, Cell | null>>>;

export interface BenchmarkResults {
  date: string;
  model: string;
  runs: number;
  cells: Cells;
  notes: string[];
}

export interface ClaudeUsage {
  input: number;
  output: number;
  cost: number;
}

const SEED = resolve(dirname(fileURLToPath(import.meta.url)), "tests", "fixtures", "workspace");

export function emptyCells(): Cells {
  const cells = {} as Cells;
  for (const artifact of ARTIFACTS) {
    cells[artifact] = {} as Record<Depth, Record<Level, Cell | null>>;
    for (const depth of DEPTHS) {
      cells[artifact][depth] = {} as Record<Level, Cell | null>;
      for (const level of LEVELS) cells[artifact][depth][level] = null;
    }
  }
  return cells;
}

// Reads usage and total_cost_usd from `claude -p --output-format json`.
// Input counts cache reads and writes, since they are billed and sent.
export function parseClaudeResult(json: string): ClaudeUsage {
  const result = JSON.parse(json) as {
    usage?: { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
    total_cost_usd?: number;
    is_error?: boolean;
    result?: string;
  };
  if (result.is_error) throw new Error(`claude reported an error: ${String(result.result ?? "").slice(0, 200)}`);
  const usage = result.usage ?? {};
  return {
    input: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
    output: usage.output_tokens ?? 0,
    cost: result.total_cost_usd ?? 0,
  };
}

export function prompt(artifact: Artifact, workspace: string, depth: Depth, level: Level): string {
  if (artifact === "syllabus") {
    return (
      `Run /dojo:plan in the workspace ${workspace} for the topic "Node fundamentals". ` +
      `Use these intake answers and ask nothing: goal "Ship a small command line tool in Node that counts and watches files", ` +
      `level ${level}, 6 hours a week until 2026-12-15, depth ${depth}. Generate the syllabus and stop.`
    );
  }
  return `Run /dojo:next in the workspace ${workspace}. The previous item is already marked; do not ask whether it is finished and ask no other questions. Generate the one next item and stop.`;
}

export function claudeArgs(promptText: string, plugin: string, model?: string): string[] {
  const args = ["-p", promptText, "--output-format", "json", "--plugin-dir", plugin, "--permission-mode", "acceptEdits"];
  if (model) args.push("--model", model);
  return args;
}

// A temporary workspace whose next planned item has the artifact's type.
function prepareWorkspace(artifact: Artifact, depth: Depth, level: Level, seed: string): string {
  const dir = mkdtempSync(join(tmpdir(), `dojo-bench-${artifact}-`));
  if (artifact === "syllabus") {
    rmSync(dir, { recursive: true, force: true });
    initWorkspace({
      dir,
      topic: "Node fundamentals",
      level,
      depth,
      hours: 6,
      target: "2026-12-15",
      goal: "Ship a small command line tool in Node that counts and watches files.",
      experience: "Two years of JavaScript in the browser.",
    });
    return dir;
  }
  cpSync(seed, dir, { recursive: true });
  const profile = join(dir, "profile.md");
  writeFileSync(profile, updateFrontmatter(readFileSync(profile, "utf8"), { level, depth }));
  const syllabusPath = join(dir, "syllabus.md");
  let text = readFileSync(syllabusPath, "utf8");
  const order = ["L01", "L02", "P01", "P02", "C01"];
  const nextIndex = artifact === "lesson" ? 0 : artifact === "project" ? 2 : 4;
  order.forEach((id, index) => {
    text = setStatus(text, id, index < nextIndex ? "done" : "planned", index < nextIndex ? "2026-09-20" : "").text;
  });
  writeFileSync(syllabusPath, text);
  if (artifact === "checkpoint") {
    // The checkpoint must be regenerated, so the seed's copy goes away.
    rmSync(join(dir, "checkpoints"), { recursive: true, force: true });
  } else {
    rmSync(join(dir, "lessons"), { recursive: true, force: true });
    rmSync(join(dir, "projects"), { recursive: true, force: true });
    rmSync(join(dir, "checkpoints"), { recursive: true, force: true });
  }
  return dir;
}

function formatCell(cell: Cell | null): string {
  if (!cell) return "not measured";
  return `${formatNumber(Math.round(cell.input))} / ${formatNumber(Math.round(cell.output))}`;
}

export function formatTable(results: BenchmarkResults): string {
  const lines: string[] = [];
  lines.push("# Token benchmark");
  lines.push("");
  lines.push(
    `Measured on ${results.date} with model \`${results.model}\`, ${results.runs} run(s) per cell. ` +
      "Cells are input / output tokens for generating one artifact at that depth and level; input includes cache reads and writes. " +
      "Regenerate with `node scripts/benchmark.ts --plugin plugins/dojo --out plugins/dojo/docs/tokens.md`.",
  );
  lines.push("");
  const header = ["Artifact", "Depth", ...LEVELS.map((l) => l[0].toUpperCase() + l.slice(1))];
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`|${header.map(() => "---").join("|")}|`);
  let cost = 0;
  let measured = 0;
  for (const artifact of ARTIFACTS) {
    for (const depth of DEPTHS) {
      const cells = LEVELS.map((level) => results.cells[artifact][depth][level]);
      for (const cell of cells) {
        if (cell) {
          cost += cell.cost;
          measured++;
        }
      }
      lines.push(`| ${artifact} | ${depth} | ${cells.map(formatCell).join(" | ")} |`);
    }
  }
  lines.push("");
  lines.push(measured > 0 ? `${measured} cell(s) measured; total cost of the runs USD ${cost.toFixed(2)}.` : "No cells measured (dry run).");
  for (const note of results.notes) lines.push(`- ${note}`);
  return lines.join("\n") + "\n";
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    plugin: { type: "string" },
    out: { type: "string" },
    runs: { type: "string", default: "1" },
    model: { type: "string" },
    seed: { type: "string" },
    "dry-run": { type: "boolean" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const plugin = resolve(requireString(args.values, "plugin"));
  const out = resolve(requireString(args.values, "out"));
  const runs = Math.max(1, Number(args.values.runs) || 1);
  const model = typeof args.values.model === "string" ? args.values.model : undefined;
  const seed = typeof args.values.seed === "string" ? resolve(args.values.seed) : SEED;
  const dryRun = Boolean(args.values["dry-run"]);
  const results: BenchmarkResults = { date: todayIso(), model: model ?? "session default", runs, cells: emptyCells(), notes: [] };

  for (const artifact of ARTIFACTS) {
    for (const depth of DEPTHS) {
      for (const level of LEVELS) {
        if (dryRun) {
          const args_ = claudeArgs(prompt(artifact, `<tmp workspace for ${artifact}>`, depth, level), plugin, model);
          console.log(`claude ${args_.map((a) => (a.includes(" ") ? JSON.stringify(a) : a)).join(" ")}`);
          continue;
        }
        const sums: ClaudeUsage = { input: 0, output: 0, cost: 0 };
        let completed = 0;
        for (let run = 0; run < runs; run++) {
          const workspace = prepareWorkspace(artifact, depth, level, seed);
          process.stderr.write(`${artifact} ${depth} ${level} run ${run + 1}/${runs} in ${workspace}\n`);
          const proc = spawnSync("claude", claudeArgs(prompt(artifact, workspace, depth, level), plugin, model), {
            encoding: "utf8",
            maxBuffer: 64 * 1024 * 1024,
            timeout: 60 * 60 * 1000,
          });
          rmSync(workspace, { recursive: true, force: true });
          if (proc.error) throw new Error(`cannot run claude: ${proc.error.message}`);
          try {
            const usage = parseClaudeResult(proc.stdout);
            sums.input += usage.input;
            sums.output += usage.output;
            sums.cost += usage.cost;
            completed++;
          } catch (error) {
            results.notes.push(`${artifact}/${depth}/${level} run ${run + 1} failed: ${(error as Error).message.split("\n")[0]}`);
          }
        }
        if (completed > 0) {
          results.cells[artifact][depth][level] = { input: sums.input / completed, output: sums.output / completed, cost: sums.cost, runs: completed };
        }
      }
    }
  }
  writeFileSync(out, formatTable(results));
  console.log(`wrote ${out}`);
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
