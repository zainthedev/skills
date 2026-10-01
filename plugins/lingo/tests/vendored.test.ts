import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { SCRIPTS_DIR, TESTS_DIR } from "./helpers.ts";

// lingo installs without dojo, so it carries byte-identical copies of the dojo
// scripts that know nothing of either course's formats. Edit dojo's copy, then
// copy it here; this test fails until the pair matches. The guard is shared
// with the mentor plugin too, whose tests check its copies against dojo's.
const DOJO_SCRIPTS = resolve(TESTS_DIR, "..", "..", "dojo", "skills", "dojo", "scripts");
const SCOUT = readdirSync(join(SCRIPTS_DIR, "lib", "scout")).map((name) => `lib/scout/${name}`);
const VENDORED: [string, string][] = [
  ...[
    "guard.ts",
    "measure.ts",
    "mark-done.ts",
    "lib/cli.ts",
    "lib/findings.ts",
    "lib/frontmatter.ts",
    "lib/http.ts",
    "lib/markdown.ts",
    "lib/review.ts",
    "lib/sections.ts",
    "lib/sidecar.ts",
    "lib/style.ts",
    ...SCOUT,
  ].map((f): [string, string] => [f, f]),
  ["site/lingo.css", "site/dojo.css"],
];

test("vendored files are identical in the lingo and dojo plugins", { skip: !existsSync(DOJO_SCRIPTS) && "the dojo plugin is not beside this one" }, () => {
  assert.ok(SCOUT.length >= 10, "the scout modules are listed");
  for (const [mine, theirs] of VENDORED) {
    assert.equal(readFileSync(join(SCRIPTS_DIR, mine), "utf8"), readFileSync(join(DOJO_SCRIPTS, theirs), "utf8"), `${mine} differs between plugins/lingo and plugins/dojo`);
  }
});
