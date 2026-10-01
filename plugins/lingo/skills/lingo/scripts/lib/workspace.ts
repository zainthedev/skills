// Locating a workspace and mapping syllabus items to files inside it.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { asString, parseFrontmatter, type Frontmatter } from "./frontmatter.ts";
import { CliError } from "./cli.ts";
import { LANGUAGE_SKILLS, type LanguageSkill } from "./constants.ts";

export type ItemDir = "lessons" | "tasks" | "checkpoints";

export interface ItemRef {
  id: string;
  type: string;
  title?: string;
}

export interface Profile {
  path: string;
  data: Frontmatter;
  body: string;
  // The language being learned, as the learner names it, e.g. "Spanish".
  language: string;
  // A BCP 47 tag for the variety, e.g. "es-MX"; the site's speak buttons use it.
  languageCode: string;
  nativeLanguage: string;
  slug: string;
  // The overall placement; lesson text is sized to it.
  level: string;
  // The placement per skill, each defaulting to the overall one.
  skills: Record<LanguageSkill, string>;
  targetLevel: string;
  // An exam the goal names, such as "DELE B1", or "".
  exam: string;
  // Model for research passes: "inherit" or a harness model name.
  researchModel: string;
  hoursPerWeek: number | null;
  targetDate: string;
  created: string;
  goal: string;
  experience: string;
  focus: string;
  notes: string;
}

export function isWorkspace(dir: string): boolean {
  const profile = join(dir, "profile.md");
  if (!existsSync(profile)) return false;
  try {
    const parsed = parseFrontmatter(readFileSync(profile, "utf8"));
    return parsed.hasFrontmatter && Object.prototype.hasOwnProperty.call(parsed.data, "lingo");
  } catch {
    return false;
  }
}

// Walks up from startDir looking for a profile.md whose frontmatter has a
// lingo key. Returns the absolute workspace path or null.
export function findWorkspace(startDir: string): string | null {
  let dir = resolve(startDir);
  if (existsSync(dir) && statSync(dir).isFile()) dir = dirname(dir);
  for (;;) {
    if (isWorkspace(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function requireWorkspace(startDir: string = process.cwd()): string {
  const found = findWorkspace(startDir);
  if (!found) {
    throw new CliError(`no lingo workspace found at or above ${resolve(startDir)} (looking for profile.md with a lingo key)`, 2);
  }
  return found;
}

export function itemDir(type: string): ItemDir {
  if (type === "lesson") return "lessons";
  if (type === "checkpoint") return "checkpoints";
  return "tasks";
}

export function idPrefix(type: string): "L" | "T" | "C" {
  if (type === "lesson") return "L";
  if (type === "checkpoint") return "C";
  return "T";
}

// lowercase, accents dropped, non-alphanumerics to hyphens, at most 60
// characters cut on a hyphen. A leading "Checkpoint:" is dropped so
// C02-section-2.md matches the format's example. A title in a script with no
// Latin letters slugs to "item".
export function slugify(title: string): string {
  let text = title.trim().replace(/^checkpoint:\s*/i, "");
  text = text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/ß/g, "ss")
    .replace(/[æÆ]/g, "ae")
    .replace(/[øØ]/g, "o")
    .replace(/[łŁ]/g, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (text.length > 60) {
    const cut = text.slice(0, 60);
    const at = cut.lastIndexOf("-");
    text = at > 20 ? cut.slice(0, at) : cut;
  }
  return text || "item";
}

// The existing file for an item, found by the pattern <ID>-*.md and never a
// sidecar. Null when none exists. Several matches resolve to the first in
// sorted order.
export function findItemFile(workspace: string, id: string, type: string): string | null {
  const dir = join(workspace, itemDir(type));
  if (!existsSync(dir)) return null;
  const matches = readdirSync(dir)
    .filter((name) => name.startsWith(`${id}-`) && name.endsWith(".md") && !name.endsWith(".answers.md"))
    .sort();
  return matches.length > 0 ? join(dir, matches[0]) : null;
}

// The path an item lives at, or should live at: the existing file when
// there is one, otherwise <dir>/<ID>-<slug>.md from the title.
export function itemPath(workspace: string, item: ItemRef): string {
  const existing = findItemFile(workspace, item.id, item.type);
  if (existing) return existing;
  const slug = slugify(item.title ?? item.id);
  return join(workspace, itemDir(item.type), `${item.id}-${slug}.md`);
}

export function sidecarPath(lessonPath: string): string {
  return lessonPath.replace(/\.md$/, ".answers.md");
}

// The ID a file name starts with, or null.
export function idFromPath(filePath: string): string | null {
  const match = /^([LTC]\d{2})-/.exec(basename(filePath));
  return match ? match[1] : null;
}

// The text under a `## <heading>` up to the next H2, trimmed. Empty when
// the heading is absent.
export function bodySection(body: string, heading: string): string {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return "";
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join("\n").trim();
}

export function readProfile(workspace: string): Profile {
  const path = join(workspace, "profile.md");
  const parsed = parseFrontmatter(readFileSync(path, "utf8"));
  const data = parsed.data;
  const hours = data.hours_per_week;
  return {
    path,
    data,
    body: parsed.body,
    language: asString(data.language),
    languageCode: asString(data.language_code),
    nativeLanguage: asString(data.native_language) || "English",
    slug: asString(data.slug),
    level: asString(data.level),
    skills: Object.fromEntries(LANGUAGE_SKILLS.map((k) => [k, asString(data[k]) || asString(data.level)])) as Record<LanguageSkill, string>,
    targetLevel: asString(data.target_level),
    exam: asString(data.exam) === "none" ? "" : asString(data.exam),
    researchModel: asString(data.research_model) || "inherit",
    hoursPerWeek: typeof hours === "number" ? hours : Number(hours) || null,
    targetDate: asString(data.target_date),
    created: asString(data.created),
    goal: bodySection(parsed.body, "Goal"),
    experience: bodySection(parsed.body, "Prior experience"),
    focus: bodySection(parsed.body, "Focus"),
    notes: bodySection(parsed.body, "Notes"),
  };
}

export function readWorkspaceFile(workspace: string, name: string): string | null {
  const path = join(workspace, name);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}
