#!/usr/bin/env node
// Creates a dojo workspace from the intake answers: profile.md, lesson zero,
// the item directories, the quiz log and an empty ledger.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fail, isMain, parseCli, requireString, runCli, textOrFile, todayIso } from "./lib/cli.ts";
import { DATE_PATTERN, DEPTHS, DOJO_VERSION, EVIDENCE_URL, LEVELS } from "./lib/constants.ts";
import { withFrontmatter } from "./lib/frontmatter.ts";
import { slugify } from "./lib/workspace.ts";

const USAGE = `usage: init-workspace.ts --dir <path> --topic <text> --level <beginner|intermediate|advanced>
                         --depth <quick|standard|deep> --hours <n> --target <YYYY-MM-DD>
                         --goal <text or @file> --experience <text or @file>
                         [--slug <slug>] [--notes <text or @file>] [--created <YYYY-MM-DD>] [--json]

Creates the workspace directory with profile.md, 00-how-this-works.md, lessons/,
projects/, checkpoints/, .dojo/, quiz-log.md and an empty ledger.md.
Refuses (exit 2) when profile.md already exists in --dir.
Text options accept @path to read the value from a file. --created overrides
today's date (for fixtures).`;

export interface InitOptions {
  dir: string;
  topic: string;
  slug?: string;
  level: string;
  depth: string;
  hours: number;
  target: string;
  goal: string;
  experience: string;
  notes?: string;
  created?: string;
}

export interface InitResult {
  workspace: string;
  files: string[];
}

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE_PATH = resolve(SCRIPTS_DIR, "..", "templates", "00-how-this-works.md");

// Fills every {{placeholder}} in the lesson-zero template. Throws on a
// placeholder the values do not cover.
export function fillTemplate(template: string, values: Record<string, string>): string {
  const filled = template.replace(/\{\{([a-z_]+)\}\}/g, (whole, key: string) => (key in values ? values[key] : whole));
  const left = /\{\{([a-z_]+)\}\}/.exec(filled);
  if (left) throw new Error(`template placeholder {{${left[1]}}} has no value`);
  return filled;
}

export function initWorkspace(opts: InitOptions): InitResult {
  if (!(LEVELS as readonly string[]).includes(opts.level)) fail(`--level must be one of ${LEVELS.join(", ")}`, 2);
  if (!(DEPTHS as readonly string[]).includes(opts.depth)) fail(`--depth must be one of ${DEPTHS.join(", ")}`, 2);
  if (!Number.isFinite(opts.hours) || opts.hours <= 0) fail("--hours must be a positive number", 2);
  if (!DATE_PATTERN.test(opts.target)) fail("--target must be a YYYY-MM-DD date", 2);
  if (opts.topic.trim() === "") fail("--topic must not be empty", 2);
  if (opts.goal.trim() === "") fail("--goal must not be empty", 2);

  const workspace = resolve(opts.dir);
  const profilePath = join(workspace, "profile.md");
  if (existsSync(profilePath)) fail(`${profilePath} already exists; plan asks whether to extend or restart, it never overwrites`, 2);
  const created = opts.created ?? todayIso();
  const slug = opts.slug && opts.slug.trim() !== "" ? slugify(opts.slug) : slugify(opts.topic);
  const files: string[] = [];
  const write = (relativePath: string, content: string) => {
    const path = join(workspace, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    files.push(path);
  };

  for (const dir of ["lessons", "projects", "checkpoints", ".dojo"]) mkdirSync(join(workspace, dir), { recursive: true });

  const notes = (opts.notes ?? "").trim();
  write(
    "profile.md",
    withFrontmatter(
      {
        dojo: DOJO_VERSION,
        topic: opts.topic.trim(),
        slug,
        level: opts.level,
        depth: opts.depth,
        hours_per_week: opts.hours,
        target_date: opts.target,
        created,
      },
      `# Profile\n\n## Goal\n\n${opts.goal.trim()}\n\n## Prior experience\n\n${opts.experience.trim() || "Not given."}\n\n## Notes\n\n${notes || "None."}\n`,
    ),
  );

  const template = readFileSync(TEMPLATE_PATH, "utf8");
  write(
    "00-how-this-works.md",
    fillTemplate(template, {
      topic: opts.topic.trim(),
      goal: opts.goal.trim().replace(/\s*\n+\s*/g, " "),
      hours_per_week: String(opts.hours),
      target_date: opts.target,
      level: opts.level,
      depth: opts.depth,
      evidence_url: EVIDENCE_URL,
      dojo_version: DOJO_VERSION,
      created,
    }),
  );

  write("quiz-log.md", "# Quiz log\n\n| Date | Scope | Predicted | Actual | Notes |\n|------|-------|-----------|--------|-------|\n");

  write(
    "ledger.md",
    withFrontmatter(
      { topic: opts.topic.trim(), scouted: "pending", subreddits: [], thin_evidence: false },
      "# Ledger\n\n| Resource | Type | Score | Endorsements | Freshness | Version | Used in |\n|----------|------|-------|--------------|-----------|---------|---------|\n\n## Excluded\n\n## Notes\n\n- Structure sources: not yet researched.\n- Thin evidence: not yet scouted.\n",
    ),
  );

  write(".dojo/fetched.jsonl", "");
  return { workspace, files };
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    dir: { type: "string" },
    topic: { type: "string" },
    slug: { type: "string" },
    level: { type: "string" },
    depth: { type: "string" },
    hours: { type: "string" },
    target: { type: "string" },
    goal: { type: "string" },
    experience: { type: "string" },
    notes: { type: "string" },
    created: { type: "string" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const v = args.values;
  const result = initWorkspace({
    dir: requireString(v, "dir"),
    topic: textOrFile(requireString(v, "topic")),
    slug: typeof v.slug === "string" ? v.slug : undefined,
    level: requireString(v, "level"),
    depth: requireString(v, "depth"),
    hours: Number(requireString(v, "hours")),
    target: requireString(v, "target"),
    goal: textOrFile(requireString(v, "goal")),
    experience: textOrFile(requireString(v, "experience")),
    notes: typeof v.notes === "string" ? textOrFile(v.notes) : undefined,
    created: typeof v.created === "string" ? v.created : undefined,
  });
  if (v.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`created workspace ${result.workspace}`);
    for (const file of result.files) console.log(`  ${file}`);
  }
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
