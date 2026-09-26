import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { SCRIPTS_DIR, TESTS_DIR } from "./helpers.ts";

// The mentor plugin installs without dojo, so it carries copies of the dojo
// files it needs, and dojo carries mentor's review parser and the shared
// guard. Every pair must stay byte-identical: edit one, then copy it over.
const DOJO_SCRIPTS = resolve(TESTS_DIR, "..", "..", "dojo", "skills", "dojo", "scripts");
const VENDORED = ["guard.ts", "lib/cli.ts", "lib/findings.ts", "lib/frontmatter.ts", "lib/review.ts", "lib/sections.ts", "lib/style.ts"];

test("vendored files are identical in the mentor and dojo plugins", { skip: !existsSync(DOJO_SCRIPTS) && "the dojo plugin is not beside this one" }, () => {
  for (const file of VENDORED) {
    assert.equal(readFileSync(join(SCRIPTS_DIR, file), "utf8"), readFileSync(join(DOJO_SCRIPTS, file), "utf8"), `${file} differs between plugins/mentor and plugins/dojo`);
  }
});
