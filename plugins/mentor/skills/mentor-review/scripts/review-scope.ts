#!/usr/bin/env node
// Resolves what /mentor-review reviews and prints it: the scope, the review
// file to write, the files with their size, the open flags earlier reviews
// left on those files, and the diff. It runs git and gh itself, so a guarded
// session needs no shell access beyond this script (ADR 0001).

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { formatNumber, isMain, parseCli, runCli, CliError } from "./lib/cli.ts";
import { findDojoWorkspace, locationFile, readReviews, scopeSlug as slugify, type Flag } from "./lib/review.ts";

const USAGE = `usage: review-scope.ts [scope ...] [--repo <dir>] [--label <text>] [--large]

Scopes, run from inside the repository or with --repo:
  (none)            this branch against its merge-base with the default branch,
                    plus uncommitted and untracked changes; on the default
                    branch, what is not pushed yet, plus the same
  branch [<name>]   that branch (default: the current one) against the default branch
  staged            the staged changes
  pr <number|url>   a GitHub pull request's diff, through gh
  all               every tracked file, read whole
  <path or glob>... every file under those paths, read whole; after branch,
                    staged or pr, limits that diff to them instead
--label names the scope in the review, for example "backend" for the paths it
was mapped to, and so names the review file.

Skips lockfiles, build output, vendored, minified and binary files, and a dojo
workspace's own course files. Creates the reviews directory: reviews/ in a dojo
workspace, else .mentor/reviews/ at the repository root, listed in
.git/info/exclude so git never sees it. Over 60 files or 3,000 lines it prints
a breakdown by directory instead and exits 4, unless --large. Exit 3 when there
is nothing to review.`;

const MAX_FILES = 60;
const MAX_LINES = 3000;
const SKIP_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "poetry.lock",
  "uv.lock",
  "Pipfile.lock",
  "Gemfile.lock",
  "composer.lock",
  "go.sum",
  "flake.lock",
]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "out", "vendor", ".next", ".nuxt", ".svelte-kit", "coverage", "__generated__", ".dojo", ".mentor"]);
const SKIP_SUFFIXES = [".min.js", ".min.css", ".map", ".snap"];
// What dojo writes in a workspace, as opposed to what the learner builds there.
const WORKSPACE_DIRS = new Set(["lessons", "checkpoints", "reviews", "site", ".dojo"]);
const WORKSPACE_FILES = new Set(["profile.md", "syllabus.md", "ledger.md", "quiz-log.md", "00-how-this-works.md"]);

export interface FileEntry {
  path: string;
  // A, M, D from git, or ?? for untracked, or "" for a whole-file scope.
  status: string;
  added: number;
  deleted: number;
  // Whole-file scopes and untracked files: the file's line count.
  lines: number | null;
}

export interface Resolved {
  label: string;
  slug: string;
  kind: "diff" | "pr" | "whole";
  files: FileEntry[];
  // git diff arguments before the "--", for kind "diff".
  diffArgs: string[];
  // The pull request's patch, for kind "pr".
  patch: string;
  notes: string[];
}

function run(cmd: string, args: string[], cwd: string): { ok: boolean; out: string; err: string } {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error) return { ok: false, out: "", err: r.error.message };
  return { ok: r.status === 0, out: r.stdout, err: r.stderr };
}

function git(root: string, args: string[]): string {
  const r = run("git", args, root);
  if (!r.ok) throw new CliError(`git ${args[0]} failed: ${r.err.trim().split("\n")[0] || "no output"}`);
  return r.out;
}

function tryGit(root: string, args: string[]): string | null {
  const r = run("git", args, root);
  return r.ok ? r.out.trim() : null;
}

export function skipped(path: string, workspaceRel: string | null): boolean {
  const parts = path.split("/");
  const name = parts[parts.length - 1];
  if (SKIP_NAMES.has(name) || SKIP_SUFFIXES.some((s) => name.endsWith(s))) return true;
  if (parts.slice(0, -1).some((p) => SKIP_DIRS.has(p))) return true;
  if (workspaceRel !== null) {
    // The path relative to the workspace, when the file is inside it.
    const inside = workspaceRel === "" ? path : path.startsWith(`${workspaceRel}/`) ? path.slice(workspaceRel.length + 1) : null;
    if (inside !== null) {
      const segs = inside.split("/");
      if (segs.length === 1 && WORKSPACE_FILES.has(segs[0])) return true;
      if (segs.length > 1 && WORKSPACE_DIRS.has(segs[0])) return true;
      if (segs.length === 2 && segs[0] === "projects" && segs[1].endsWith(".md")) return true;
    }
  }
  return false;
}

function countLines(text: string): number {
  if (text === "") return 0;
  return text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

function wholeFile(root: string, path: string, status = ""): FileEntry | null {
  const abs = join(root, path);
  if (!existsSync(abs)) return null;
  const buf = readFileSync(abs);
  if (buf.subarray(0, 8000).includes(0)) return null;
  return { path, status, added: 0, deleted: 0, lines: countLines(buf.toString("utf8")) };
}

function untracked(root: string, pathspecs: string[]): FileEntry[] {
  const out = git(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", ...pathspecs]);
  return out
    .split("\0")
    .filter(Boolean)
    .map((p) => wholeFile(root, p, "??"))
    .filter((f): f is FileEntry => f !== null);
}

// Files changed by a git diff, with their added and deleted line counts.
function diffFiles(root: string, diffArgs: string[], pathspecs: string[]): FileEntry[] {
  const statuses = new Map<string, string>();
  for (const line of git(root, ["diff", "--name-status", "--no-renames", ...diffArgs, "--", ...pathspecs]).split("\n")) {
    const [status, path] = line.split("\t");
    if (path) statuses.set(path, status);
  }
  const files: FileEntry[] = [];
  for (const line of git(root, ["diff", "--numstat", "--no-renames", ...diffArgs, "--", ...pathspecs]).split("\n")) {
    const [added, deleted, path] = line.split("\t");
    // Binary files show "-" for both counts.
    if (!path || added === "-") continue;
    files.push({ path, status: statuses.get(path) ?? "M", added: Number(added), deleted: Number(deleted), lines: null });
  }
  return files;
}

// A pathspec or glob as a matcher, for the pull request's file list, which
// git does not filter.
export function pathMatcher(spec: string): (path: string) => boolean {
  const clean = spec.replace(/^\.\//, "").replace(/\/$/, "");
  if (clean === "" || clean === ".") return () => true;
  if (!/[*?[]/.test(clean)) return (p) => p === clean || p.startsWith(`${clean}/`);
  const pattern = clean
    .replace(/[.+^${}()|\\]/g, "\\$&")
    .replace(/\*\*\/?/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\u0000/g, "(?:.*/)?");
  const re = new RegExp(`^${pattern}(?:/.*)?$`);
  return (p) => re.test(p);
}

// Splits a unified diff into one patch per file with its counts.
export function splitPatch(patch: string): { path: string; status: string; added: number; deleted: number; text: string }[] {
  const out: { path: string; status: string; added: number; deleted: number; text: string }[] = [];
  const chunks = patch.split(/^(?=diff --git )/m).filter((c) => c.startsWith("diff --git "));
  for (const text of chunks) {
    const header = /^diff --git a\/(.+?) b\/(.+)$/m.exec(text);
    if (!header || /^Binary files /m.test(text)) continue;
    let added = 0;
    let deleted = 0;
    for (const line of text.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) added++;
      else if (line.startsWith("-") && !line.startsWith("---")) deleted++;
    }
    const status = /^new file mode/m.test(text) ? "A" : /^deleted file mode/m.test(text) ? "D" : "M";
    out.push({ path: header[2], status, added, deleted, text: text.endsWith("\n") ? text : `${text}\n` });
  }
  return out;
}

function defaultBranch(root: string): { name: string; ref: string } {
  const remote = tryGit(root, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);
  if (remote) return { name: remote.replace(/^origin\//, ""), ref: remote };
  for (const name of ["main", "master", "trunk", "develop"]) {
    if (tryGit(root, ["rev-parse", "--verify", "--quiet", `refs/heads/${name}`]) !== null) {
      const tracked = tryGit(root, ["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${name}`]) !== null;
      return { name, ref: tracked ? `origin/${name}` : name };
    }
  }
  throw new CliError("found no default branch (origin/HEAD, main, master, trunk or develop); name one with branch <name>, or review paths", 2);
}

function short(root: string, rev: string): string {
  return tryGit(root, ["rev-parse", "--short", rev]) ?? rev;
}

function resolveBranch(root: string, name: string | null, pathspecs: string[], within: string): Resolved {
  const base = defaultBranch(root);
  const current = tryGit(root, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? "HEAD";
  const target = name ?? current;
  const onCurrent = target === current;
  if (target === base.name && !onCurrent) throw new CliError(`${target} is the default branch; name another branch, or review paths or all`, 2);
  const headRev = onCurrent ? "HEAD" : target;
  if (tryGit(root, ["rev-parse", "--verify", "--quiet", `${headRev}^{commit}`]) === null) {
    throw new CliError(onCurrent ? "this repository has no commits yet; review paths or all" : `no branch or commit named ${target}`, 2);
  }
  const notes: string[] = [];
  if (onCurrent && target === base.name) {
    // On the default branch: what is not on the remote yet, plus the working tree.
    const hasRemote = base.ref !== base.name;
    const mergeBase = hasRemote ? tryGit(root, ["merge-base", "HEAD", base.ref]) : null;
    const from = mergeBase ?? "HEAD";
    const files = [...diffFiles(root, [from], pathspecs), ...untracked(root, pathspecs)];
    const label = `${mergeBase ? "unpushed and uncommitted" : "uncommitted"} changes on ${base.name}${within}`;
    return { label, slug: slugify(`changes on ${base.name}${within}`), kind: "diff", files, diffArgs: [from], patch: "", notes };
  }
  const mergeBase = tryGit(root, ["merge-base", headRev, base.ref]);
  if (!mergeBase) throw new CliError(`${target} shares no history with ${base.ref}`, 2);
  if (onCurrent) {
    const files = [...diffFiles(root, [mergeBase], pathspecs), ...untracked(root, pathspecs)];
    const branch = target === "HEAD" ? `detached HEAD ${short(root, "HEAD")}` : `branch ${target}`;
    const label = `${branch} against ${base.ref} from ${short(root, mergeBase)}, with uncommitted changes${within}`;
    return { label, slug: slugify(`${branch}${within}`), kind: "diff", files, diffArgs: [mergeBase], patch: "", notes };
  }
  notes.push(`${target} is not checked out: read its code in the diff, since the files on disk are ${current}'s.`);
  const files = diffFiles(root, [mergeBase, target], pathspecs);
  const label = `branch ${target} against ${base.ref} from ${short(root, mergeBase)}${within}`;
  return { label, slug: slugify(`branch ${target}${within}`), kind: "diff", files, diffArgs: [mergeBase, target], patch: "", notes };
}

function resolvePr(root: string, ref: string, pathspecs: string[], within: string): Resolved {
  const number = /\/pull\/(\d+)/.exec(ref)?.[1] ?? (/^#?(\d+)$/.exec(ref)?.[1] ?? null);
  if (!number) throw new CliError(`pr takes a number or a pull request URL, got ${JSON.stringify(ref)}`, 2);
  const target = /^https?:/.test(ref) ? ref : number;
  const view = run("gh", ["pr", "view", target, "--json", "number,title,baseRefName,headRefName,headRefOid"], root);
  if (!view.ok) {
    const reason = view.err.trim().split("\n")[0] || "no output";
    throw new CliError(`gh pr view failed: ${reason}. pr needs the GitHub CLI, gh, installed and signed in`);
  }
  const pr = JSON.parse(view.out) as { number: number; title: string; baseRefName: string; headRefName: string; headRefOid: string };
  const diff = run("gh", ["pr", "diff", target], root);
  if (!diff.ok) throw new CliError(`gh pr diff failed: ${diff.err.trim().split("\n")[0] || "no output"}`);
  const matchers = pathspecs.map(pathMatcher);
  const patches = splitPatch(diff.out).filter((p) => matchers.length === 0 || matchers.some((m) => m(p.path)));
  const notes: string[] = [];
  const head = tryGit(root, ["rev-parse", "HEAD"]);
  if (head !== pr.headRefOid) {
    notes.push(`The checkout is not the pull request's head (${pr.headRefOid.slice(0, 7)}): read its code in the diff, or the learner runs gh pr checkout ${pr.number} first.`);
  }
  return {
    label: `pull request ${pr.number}, ${pr.title}, ${pr.headRefName} into ${pr.baseRefName}${within}`,
    slug: slugify(`pr ${pr.number}${within}`),
    kind: "pr",
    files: patches.map((p) => ({ path: p.path, status: p.status, added: p.added, deleted: p.deleted, lines: null })),
    diffArgs: [],
    patch: patches.map((p) => p.text).join(""),
    notes,
  };
}

function resolveWhole(root: string, pathspecs: string[]): Resolved {
  const tracked = git(root, ["ls-files", "-z", "--", ...pathspecs])
    .split("\0")
    .filter(Boolean)
    .map((p) => wholeFile(root, p))
    .filter((f): f is FileEntry => f !== null);
  // Read whole like the rest, so they carry no untracked marker.
  const files = [...tracked, ...untracked(root, pathspecs).map((f) => ({ ...f, status: "" }))];
  const label = pathspecs.length === 0 ? "the whole repository" : pathspecs.join(", ");
  return { label, slug: pathspecs.length === 0 ? "all" : slugify(`files ${pathspecs.join(" ")}`), kind: "whole", files, diffArgs: [], patch: "", notes: [] };
}

// Maps the scope words to a resolution. Paths are relative to cwd and are
// turned into pathspecs relative to the repository root.
export function resolveScope(root: string, cwd: string, words: string[]): Resolved {
  const [first, ...rest] = words;
  const toSpec = (p: string) => {
    const rel = relative(root, resolve(cwd, p)).split(sep).join("/");
    if (rel.startsWith("..")) throw new CliError(`${p} is outside the repository at ${root}`, 2);
    return rel === "" ? "." : rel;
  };
  const within = (specs: string[]) => (specs.length > 0 ? ` in ${specs.join(", ")}` : "");
  if (first === undefined) return resolveBranch(root, null, [], "");
  if (first === "all") {
    if (rest.length > 0) throw new CliError("all takes no paths; name the paths alone to review them whole", 2);
    return resolveWhole(root, []);
  }
  if (first === "staged") {
    const specs = rest.map(toSpec);
    const files = diffFiles(root, ["--cached"], specs);
    return { label: `staged changes${within(specs)}`, slug: slugify(`staged${within(specs)}`), kind: "diff", files, diffArgs: ["--cached"], patch: "", notes: [] };
  }
  if (first === "branch") {
    const [name, ...paths] = rest;
    // "branch src/api" limits the current branch to a path that exists.
    const isPath = name !== undefined && (existsSync(resolve(cwd, name)) || /[*?[]/.test(name));
    const specs = (isPath ? rest : paths).map(toSpec);
    return resolveBranch(root, isPath ? null : name ?? null, specs, within(specs));
  }
  if (first === "pr") {
    const [ref, ...paths] = rest;
    if (!ref) throw new CliError("pr needs a number or a pull request URL", 2);
    const specs = paths.map(toSpec);
    return resolvePr(root, ref, specs, within(specs));
  }
  return resolveWhole(root, words.map(toSpec));
}

function lineCount(f: FileEntry): number {
  return f.lines ?? f.added + f.deleted;
}

// Directories two levels deep with their file and line counts, largest first.
export function breakdown(files: FileEntry[]): string[] {
  const groups = new Map<string, { files: number; lines: number }>();
  for (const f of files) {
    const parts = f.path.split("/");
    const key = parts.length > 2 ? parts.slice(0, 2).join("/") + "/" : parts.length === 2 ? `${parts[0]}/` : "(root)";
    const g = groups.get(key) ?? { files: 0, lines: 0 };
    g.files++;
    g.lines += lineCount(f);
    groups.set(key, g);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].lines - a[1].lines)
    .map(([dir, g]) => `  ${dir}  ${g.files} files, ${formatNumber(g.lines)} lines`);
}

function excludeReviewsDir(root: string): void {
  const path = tryGit(root, ["rev-parse", "--git-path", "info/exclude"]);
  if (!path) return;
  const abs = resolve(root, path);
  const text = existsSync(abs) ? readFileSync(abs, "utf8") : "";
  if (text.split("\n").some((l) => l.trim() === ".mentor/" || l.trim() === "/.mentor/")) return;
  mkdirSync(resolve(abs, ".."), { recursive: true });
  appendFileSync(abs, `${text === "" || text.endsWith("\n") ? "" : "\n"}# mentor-review keeps its reviews here\n/.mentor/\n`);
}

function lines(n: number): string {
  return `${formatNumber(n)} line${n === 1 ? "" : "s"}`;
}

function describe(f: FileEntry): string {
  if (f.status === "??") return `  ??  ${f.path}  new, ${lines(f.lines ?? 0)}, not in the diff: read it whole`;
  if (f.lines !== null) return `  ${f.path}  ${lines(f.lines)}`;
  return `  ${f.status.padEnd(2)}  ${f.path}  +${f.added} -${f.deleted}`;
}

function flagLine(name: string, flag: Flag): string {
  return `  ${name} flag ${flag.number}: ${flag.category}, ${flag.severity}, ${flag.location}, ${flag.title}`;
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    repo: { type: "string" },
    label: { type: "string" },
    large: { type: "boolean" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  const cwd = resolve(typeof args.values.repo === "string" ? args.values.repo : process.cwd());
  const top = run("git", ["rev-parse", "--show-toplevel"], cwd);
  if (!top.ok) throw new CliError(`${cwd} is not inside a git repository; mentor-review needs git to find the code. Run git init there first`, 2);
  const root = top.out.trim();
  const workspace = findDojoWorkspace(cwd);
  const workspaceRel = workspace === null ? null : relative(root, workspace).split(sep).join("/");
  const resolved = resolveScope(root, cwd, args.positionals);
  const inWorkspace = (rel: string | null) => rel !== null && !rel.startsWith("..");
  const files = resolved.files.filter((f) => !skipped(f.path, inWorkspace(workspaceRel) ? workspaceRel : null));
  const label = typeof args.values.label === "string" && args.values.label.trim() !== "" ? `${args.values.label.trim()}: ${resolved.label}` : resolved.label;
  const slug = typeof args.values.label === "string" && args.values.label.trim() !== "" ? slugify(args.values.label) : resolved.slug;

  if (files.length === 0) {
    console.log(`scope: ${label}\nnothing to review: no changed or matching files once lockfiles, build output and binaries are left out.`);
    return 3;
  }
  const total = files.reduce((n, f) => n + lineCount(f), 0);
  if (!args.values.large && (files.length > MAX_FILES || total > MAX_LINES)) {
    console.log(`scope: ${label}`);
    console.log(`too large for one review: ${files.length} files, ${formatNumber(total)} lines (a review covers at most ${MAX_FILES} files and ${formatNumber(MAX_LINES)} lines).`);
    console.log("by directory:");
    for (const line of breakdown(files)) console.log(line);
    console.log("Narrow the scope to one of these directories, or pass --large when the learner wants the whole of it.");
    return 4;
  }

  const reviewsDir = workspace !== null ? join(workspace, "reviews") : join(root, ".mentor", "reviews");
  mkdirSync(reviewsDir, { recursive: true });
  if (workspace === null) excludeReviewsDir(root);
  const reviewFile = join(reviewsDir, `${slug}.md`);
  const reviews = readReviews(reviewsDir);
  const existing = reviews.find((r) => r.path === reviewFile);
  const inScope = new Set(files.map((f) => f.path));
  const open = reviews.flatMap((r) => r.review.flags.filter((f) => f.status === "open" && inScope.has(locationFile(f.location))).map((f) => flagLine(r.name, f)));

  console.log(`scope: ${label}`);
  console.log(`repository: ${root}`);
  if (existing) {
    const openCount = existing.review.flags.filter((f) => f.status === "open").length;
    const last = Math.max(0, ...existing.review.flags.map((f) => f.number));
    console.log(`review file: ${reviewFile} (exists, ${openCount} open of ${existing.review.flags.length}: add new flags to its table from ${last + 1})`);
  } else {
    console.log(`review file: ${reviewFile} (new)`);
  }
  console.log(workspace !== null ? "answers: never, this is a dojo workspace" : "answers: on explicit request");
  console.log(`files: ${files.length}, ${lines(total)}${resolved.kind === "whole" ? ", read them whole" : " changed"}`);
  for (const f of files) console.log(describe(f));
  console.log(open.length > 0 ? `open flags on these files: ${open.length}` : "open flags on these files: none");
  for (const line of open) console.log(line);
  for (const note of resolved.notes) console.log(`note: ${note}`);
  if (resolved.kind === "diff") {
    const tracked = files.filter((f) => f.status !== "??").map((f) => f.path);
    if (tracked.length > 0) {
      console.log("diff:");
      process.stdout.write(git(root, ["diff", "--no-color", "--no-ext-diff", "--no-renames", "-U3", ...resolved.diffArgs, "--", ...tracked]));
    }
  } else if (resolved.kind === "pr") {
    const keep = new Set(files.map((f) => f.path));
    console.log("diff:");
    process.stdout.write(
      splitPatch(resolved.patch)
        .filter((p) => keep.has(p.path))
        .map((p) => p.text)
        .join(""),
    );
  }
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
