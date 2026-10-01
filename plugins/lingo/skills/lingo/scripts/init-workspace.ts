#!/usr/bin/env node
// Creates a lingo workspace from the intake answers: profile.md, lesson zero,
// the item and record directories, the logs and an empty ledger.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fail, isMain, parseCli, requireString, runCli, textOrFile, todayIso } from "./lib/cli.ts";
import {
  DATA_DIR,
  DATE_PATTERN,
  EVIDENCE_URL,
  LANGUAGE_SKILLS,
  LEVELS,
  LINGO_VERSION,
  MISTAKES_HEADER,
  QUIZ_LOG_HEADER,
  TALK_LOG_HEADER,
  TARGET_LEVELS,
} from "./lib/constants.ts";
import { withFrontmatter } from "./lib/frontmatter.ts";
import { slugify } from "./lib/workspace.ts";

const USAGE = `usage: init-workspace.ts --dir <path> --language <name> --code <BCP 47 tag>
                         --level <A0|A1|A2|B1|B2|C1> --target-level <A1|A2|B1|B2|C1|C2>
                         --hours <n> --target <YYYY-MM-DD>
                         --goal <text or @file> --experience <text or @file>
                         [--native <language>] [--listening <level>] [--reading <level>]
                         [--speaking <level>] [--writing <level>] [--exam <name>]
                         [--focus <text or @file>] [--notes <text or @file>]
                         [--slug <slug>] [--created <YYYY-MM-DD>] [--json]

Creates the workspace directory with profile.md, 00-how-this-works.md, lessons/,
tasks/, checkpoints/, talk/, reviews/, ${DATA_DIR}/, quiz-log.md, talk-log.md,
mistakes.md and an empty ledger.md. Each skill's level defaults to --level.
Refuses (exit 2) when profile.md already exists in --dir. Text options accept
@path to read the value from a file. --created overrides today's date (for
fixtures).`;

export interface InitOptions {
  dir: string;
  language: string;
  code: string;
  native?: string;
  slug?: string;
  level: string;
  skills?: Partial<Record<(typeof LANGUAGE_SKILLS)[number], string>>;
  targetLevel: string;
  exam?: string;
  hours: number;
  target: string;
  goal: string;
  experience: string;
  focus?: string;
  notes?: string;
  created?: string;
}

export interface InitResult {
  workspace: string;
  files: string[];
}

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE_PATH = resolve(SCRIPTS_DIR, "..", "templates", "00-how-this-works.md");

// A0 counts as the step below A1, so a target is above a placement when its
// index here is higher.
const SCALE = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];

// Fills every {{placeholder}} in the lesson-zero template. Throws on a
// placeholder the values do not cover.
export function fillTemplate(template: string, values: Record<string, string>): string {
  const filled = template.replace(/\{\{([a-z_]+)\}\}/g, (whole, key: string) => (key in values ? values[key] : whole));
  const left = /\{\{([a-z_]+)\}\}/.exec(filled);
  if (left) throw new Error(`template placeholder {{${left[1]}}} has no value`);
  return filled;
}

export function initWorkspace(opts: InitOptions): InitResult {
  const placement = LEVELS as readonly string[];
  if (!placement.includes(opts.level)) fail(`--level must be one of ${LEVELS.join(", ")}`, 2);
  const skills: Record<string, string> = {};
  for (const skill of LANGUAGE_SKILLS) {
    const value = opts.skills?.[skill]?.trim() || opts.level;
    if (!placement.includes(value)) fail(`--${skill} must be one of ${LEVELS.join(", ")}`, 2);
    skills[skill] = value;
  }
  if (!(TARGET_LEVELS as readonly string[]).includes(opts.targetLevel)) fail(`--target-level must be one of ${TARGET_LEVELS.join(", ")}`, 2);
  if (SCALE.indexOf(opts.targetLevel) <= SCALE.indexOf(opts.level)) fail(`--target-level ${opts.targetLevel} must be above the placement ${opts.level}`, 2);
  if (!Number.isFinite(opts.hours) || opts.hours <= 0) fail("--hours must be a positive number", 2);
  if (!DATE_PATTERN.test(opts.target)) fail("--target must be a YYYY-MM-DD date", 2);
  if (opts.language.trim() === "") fail("--language must not be empty", 2);
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(opts.code.trim())) fail("--code must be a BCP 47 language tag such as es, es-MX or ja", 2);
  if (opts.goal.trim() === "") fail("--goal must not be empty", 2);

  const workspace = resolve(opts.dir);
  const profilePath = join(workspace, "profile.md");
  if (existsSync(profilePath)) fail(`${profilePath} already exists; plan asks whether to extend or restart, it never overwrites`, 2);
  const created = opts.created ?? todayIso();
  const language = opts.language.trim();
  const native = (opts.native ?? "").trim() || "English";
  const exam = (opts.exam ?? "").trim();
  const slug = opts.slug && opts.slug.trim() !== "" ? slugify(opts.slug) : slugify(language);
  const files: string[] = [];
  const write = (relativePath: string, content: string) => {
    const path = join(workspace, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    files.push(path);
  };

  for (const dir of ["lessons", "tasks", "checkpoints", "talk", "reviews", DATA_DIR]) mkdirSync(join(workspace, dir), { recursive: true });

  const focus = (opts.focus ?? "").trim();
  const notes = (opts.notes ?? "").trim();
  write(
    "profile.md",
    withFrontmatter(
      {
        lingo: LINGO_VERSION,
        language,
        language_code: opts.code.trim(),
        native_language: native,
        slug,
        level: opts.level,
        listening: skills.listening,
        reading: skills.reading,
        speaking: skills.speaking,
        writing: skills.writing,
        target_level: opts.targetLevel,
        exam: exam || "none",
        research_model: "inherit",
        hours_per_week: opts.hours,
        target_date: opts.target,
        created,
      },
      `# Profile\n\n## Goal\n\n${opts.goal.trim()}\n\n## Prior experience\n\n${opts.experience.trim() || "Not given."}\n\n## Focus\n\n${focus || "All four skills equally."}\n\n## Notes\n\n${notes || "None."}\n`,
    ),
  );

  const template = readFileSync(TEMPLATE_PATH, "utf8");
  write(
    "00-how-this-works.md",
    fillTemplate(template, {
      language,
      native_language: native,
      goal: opts.goal.trim().replace(/\s*\n+\s*/g, " ").replace(/[.\s]+$/, ""),
      hours_per_week: String(opts.hours),
      target_date: opts.target,
      level: opts.level,
      target_level: opts.targetLevel,
      evidence_url: EVIDENCE_URL,
      lingo_version: LINGO_VERSION,
      created,
    }),
  );

  write("quiz-log.md", QUIZ_LOG_HEADER);
  write("talk-log.md", TALK_LOG_HEADER);
  write("mistakes.md", MISTAKES_HEADER);

  write(
    "ledger.md",
    withFrontmatter(
      { language, scouted: "pending", subreddits: [], thin_evidence: false },
      "# Ledger\n\n| Resource | Type | Score | Endorsements | Freshness | Level | Used in |\n|----------|------|-------|--------------|-----------|-------|---------|\n\n## Excluded\n\n## Notes\n\n- Structure sources: not yet researched.\n- Thin evidence: not yet scouted.\n",
    ),
  );

  write(`${DATA_DIR}/fetched.jsonl`, "");
  return { workspace, files };
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    dir: { type: "string" },
    language: { type: "string" },
    code: { type: "string" },
    native: { type: "string" },
    slug: { type: "string" },
    level: { type: "string" },
    listening: { type: "string" },
    reading: { type: "string" },
    speaking: { type: "string" },
    writing: { type: "string" },
    "target-level": { type: "string" },
    exam: { type: "string" },
    hours: { type: "string" },
    target: { type: "string" },
    goal: { type: "string" },
    experience: { type: "string" },
    focus: { type: "string" },
    notes: { type: "string" },
    created: { type: "string" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const v = args.values;
  const optional = (name: string): string | undefined => (typeof v[name] === "string" ? (v[name] as string) : undefined);
  const result = initWorkspace({
    dir: requireString(v, "dir"),
    language: textOrFile(requireString(v, "language")),
    code: requireString(v, "code"),
    native: optional("native"),
    slug: optional("slug"),
    level: requireString(v, "level").toUpperCase(),
    skills: Object.fromEntries(LANGUAGE_SKILLS.map((k) => [k, optional(k)?.toUpperCase()])),
    targetLevel: requireString(v, "target-level").toUpperCase(),
    exam: optional("exam"),
    hours: Number(requireString(v, "hours")),
    target: requireString(v, "target"),
    goal: textOrFile(requireString(v, "goal")),
    experience: textOrFile(requireString(v, "experience")),
    focus: optional("focus") !== undefined ? textOrFile(optional("focus")!) : undefined,
    notes: optional("notes") !== undefined ? textOrFile(optional("notes")!) : undefined,
    created: optional("created"),
  });
  if (v.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(`created workspace ${result.workspace}: ${result.files.map((f) => relative(result.workspace, f)).join(", ")}, lessons/, tasks/, checkpoints/, talk/, reviews/`);
  }
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
