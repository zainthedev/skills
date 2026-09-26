import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathMatcher, skipped, splitPatch } from "../skills/mentor-review/scripts/review-scope.ts";
import { DOJO_WORKSPACE, FIXTURES, removeDir, runScript, tempDir } from "./helpers.ts";

function git(dir: string, ...args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=mentor", "-c", "user.email=mentor@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

function write(dir: string, path: string, text: string): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), text);
}

// A repository with one commit on main and a feature branch that adds a file.
function repo(): string {
  const dir = tempDir();
  git(dir, "init", "-q", "-b", "main");
  write(dir, "src/a.ts", "export const a = 1;\n");
  write(dir, "package-lock.json", "{}\n");
  git(dir, "add", ".");
  git(dir, "commit", "-qm", "init");
  git(dir, "checkout", "-qb", "feature/cart");
  write(dir, "src/cart.ts", "export function total(items) {\n  return items.reduce((s, i) => s + i.price);\n}\n");
  write(dir, "package-lock.json", '{"changed": true}\n');
  git(dir, "add", ".");
  git(dir, "commit", "-qm", "cart");
  return dir;
}

test("no scope is the branch against its merge-base, with uncommitted and untracked files", () => {
  const dir = repo();
  try {
    write(dir, "src/a.ts", "export const a = 2;\n");
    write(dir, "src/new.ts", "export const n = 1;\n");
    const r = runScript("review-scope.ts", [], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^scope: branch feature\/cart against main from [0-9a-f]+, with uncommitted changes$/m);
    assert.match(r.stdout, /review file: .*\.mentor\/reviews\/branch-feature-cart\.md \(new\)/);
    assert.match(r.stdout, /^answers: on explicit request$/m);
    assert.match(r.stdout, /^ {2}A {3}src\/cart\.ts {2}\+3 -0$/m);
    assert.match(r.stdout, /^ {2}M {3}src\/a\.ts/m);
    assert.match(r.stdout, /^ {2}\?\? {2}src\/new\.ts {2}new, 1 line, not in the diff/m);
    assert.doesNotMatch(r.stdout, /package-lock/);
    assert.match(r.stdout, /^\+ {2}return items\.reduce/m);
    assert.ok(existsSync(join(dir, ".mentor", "reviews")));
    assert.match(readFileSync(join(dir, ".git", "info", "exclude"), "utf8"), /^\/\.mentor\/$/m);
    assert.equal(git(dir, "status", "--porcelain").includes(".mentor"), false);
    // A second run does not list the directory twice.
    runScript("review-scope.ts", [], dir);
    assert.equal(readFileSync(join(dir, ".git", "info", "exclude"), "utf8").match(/\/\.mentor\//g)?.length, 1);
  } finally {
    removeDir(dir);
  }
});

test("paths are read whole, and limit a diff after branch or staged", () => {
  const dir = repo();
  try {
    const whole = runScript("review-scope.ts", ["src", "--label", "backend"], dir);
    assert.equal(whole.status, 0, whole.stderr);
    assert.match(whole.stdout, /^scope: backend: src$/m);
    assert.match(whole.stdout, /reviews\/backend\.md \(new\)/);
    assert.match(whole.stdout, /^files: 2, 4 lines, read them whole$/m);
    assert.doesNotMatch(whole.stdout, /^diff:/m);

    const limited = runScript("review-scope.ts", ["branch", "src/cart.ts"], dir);
    assert.match(limited.stdout, /^scope: branch feature\/cart .* in src\/cart\.ts$/m);
    assert.doesNotMatch(limited.stdout, /src\/a\.ts/);

    write(dir, "src/a.ts", "export const a = 3;\n");
    git(dir, "add", "src/a.ts");
    const staged = runScript("review-scope.ts", ["staged"], dir);
    assert.match(staged.stdout, /^scope: staged changes$/m);
    assert.match(staged.stdout, /^ {2}M {3}src\/a\.ts {2}\+1 -1$/m);
    assert.doesNotMatch(staged.stdout, /cart\.ts/);
  } finally {
    removeDir(dir);
  }
});

test("on the default branch it reviews uncommitted work, and says when there is nothing", () => {
  const dir = repo();
  try {
    git(dir, "checkout", "-q", "main");
    const empty = runScript("review-scope.ts", [], dir);
    assert.equal(empty.status, 3);
    assert.match(empty.stdout, /nothing to review/);
    write(dir, "src/a.ts", "export const a = 9;\n");
    const r = runScript("review-scope.ts", [], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^scope: uncommitted changes on main$/m);
    const other = runScript("review-scope.ts", ["branch", "feature/cart"], dir);
    assert.match(other.stdout, /^scope: branch feature\/cart against main/m);
    assert.match(other.stdout, /^note: feature\/cart is not checked out/m);
    assert.match(other.stdout, /src\/cart\.ts/);
    assert.equal(runScript("review-scope.ts", ["branch", "nope"], dir).status, 2);
  } finally {
    removeDir(dir);
  }
});

test("a scope over the cap prints a breakdown and exits 4 unless --large", () => {
  const dir = repo();
  try {
    for (let i = 0; i < 61; i++) write(dir, `src/gen/f${i}.ts`, `export const x${i} = ${i};\n`);
    const r = runScript("review-scope.ts", ["all"], dir);
    assert.equal(r.status, 4);
    assert.match(r.stdout, /too large for one review: 63 files/);
    assert.match(r.stdout, /^ {2}src\/gen\/ {2}61 files, 61 lines$/m);
    assert.equal(runScript("review-scope.ts", ["all", "--large"], dir).status, 0);
  } finally {
    removeDir(dir);
  }
});

test("open flags on files in scope are listed, and a workspace never gives answers", () => {
  const dir = repo();
  try {
    write(dir, ".mentor/reviews/earlier.md", readFileSync(join(FIXTURES, "review.md"), "utf8"));
    const r = runScript("review-scope.ts", ["all"], dir);
    // src/cart.ts is in scope, src/utils/date.ts is not.
    assert.match(r.stdout, /^open flags on these files: 1$/m);
    assert.match(r.stdout, /^ {2}earlier\.md flag 1: bug, high, src\/cart\.ts:42-48, Total of an empty cart$/m);

    cpSync(DOJO_WORKSPACE, join(dir, "course"), { recursive: true });
    write(dir, "course/app/server.ts", "export {};\n");
    const ws = runScript("review-scope.ts", ["."], join(dir, "course"));
    assert.equal(ws.status, 0, ws.stderr);
    assert.match(ws.stdout, /^answers: never, this is a dojo workspace$/m);
    assert.match(ws.stdout, /review file: .*course\/reviews\/files-course\.md/);
    assert.match(ws.stdout, /^ {2}course\/app\/server\.ts {2}1 line$/m);
    // The course's own files are not the learner's code.
    assert.doesNotMatch(ws.stdout, /syllabus\.md|lessons\/|projects\/P01-todo-api\.md/);
  } finally {
    removeDir(dir);
  }
});

test("outside a git repository it says to run git init", () => {
  const dir = tempDir();
  try {
    const r = runScript("review-scope.ts", [], dir);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /git init/);
  } finally {
    removeDir(dir);
  }
});

test("skip rules, path matching and patch splitting", () => {
  assert.equal(skipped("yarn.lock", null), true);
  assert.equal(skipped("web/node_modules/x/index.js", null), true);
  assert.equal(skipped("public/app.min.js", null), true);
  assert.equal(skipped("src/build.ts", null), false);
  assert.equal(skipped("course/syllabus.md", "course"), true);
  assert.equal(skipped("course/projects/P01-todo-api.md", "course"), true);
  assert.equal(skipped("course/projects/P01-todo-api/starter/app.js", "course"), false);
  assert.equal(skipped("syllabus.md", null), false);

  assert.equal(pathMatcher("src/api")("src/api/users.ts"), true);
  assert.equal(pathMatcher("src/api")("src/apis.ts"), false);
  assert.equal(pathMatcher("src/**/*.ts")("src/a/b/c.ts"), true);
  assert.equal(pathMatcher("src/*.ts")("src/a/c.ts"), false);
  assert.equal(pathMatcher(".")("anything"), true);

  const patch = [
    "diff --git a/src/a.ts b/src/a.ts",
    "index 1..2 100644",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -1 +1,2 @@",
    " a",
    "+b",
    "diff --git a/img.png b/img.png",
    "Binary files a/img.png and b/img.png differ",
    "diff --git a/src/new.ts b/src/new.ts",
    "new file mode 100644",
    "--- /dev/null",
    "+++ b/src/new.ts",
    "@@ -0,0 +1 @@",
    "+n",
  ].join("\n");
  assert.deepEqual(
    splitPatch(patch).map((p) => [p.path, p.status, p.added, p.deleted]),
    [
      ["src/a.ts", "M", 1, 0],
      ["src/new.ts", "A", 1, 0],
    ],
  );
});
