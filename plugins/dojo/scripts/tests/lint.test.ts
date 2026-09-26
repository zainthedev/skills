import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lintWorkspace } from "../lint.ts";
import { INVALID_FIXTURES, WORKSPACE_FIXTURE, removeDir, runScript, tempWorkspace } from "./helpers.ts";

function rules(ws: string, ids: string[] = []): string[] {
  return lintWorkspace(ws, ids).findings.map((f) => `${f.severity} ${f.rule}`);
}

function withInvalid(name: string, target: string, check: (ws: string) => void): void {
  const ws = tempWorkspace();
  try {
    copyFileSync(join(INVALID_FIXTURES, name), join(ws, target));
    check(ws);
  } finally {
    removeDir(ws);
  }
}

test("the valid fixture passes with no findings", () => {
  const result = lintWorkspace(WORKSPACE_FIXTURE);
  assert.deepEqual(result.findings, []);
  assert.equal(result.errors, 0);
});

test("a lesson missing a required heading", () => {
  withInvalid("L02-missing-heading.md", "lessons/L02-the-event-loop.md", (ws) => {
    assert.deepEqual(rules(ws), ["error lesson/headings"]);
    const [f] = lintWorkspace(ws).findings;
    assert.match(f.message, /Lesson overview/);
    assert.equal(f.file, join(ws, "lessons", "L02-the-event-loop.md"));
  });
});

test("too many overview bullets", () => {
  withInvalid("L02-too-many-bullets.md", "lessons/L02-the-event-loop.md", (ws) => {
    assert.deepEqual(rules(ws), ["error lesson/overview"]);
  });
});

test("a URL cited in authored text but absent from the ledger and the fetched log", () => {
  withInvalid("L02-uncited-url.md", "lessons/L02-the-event-loop.md", (ws) => {
    assert.deepEqual(rules(ws).sort(), ["error lesson/citation", "error lesson/citation-fetched"]);
  });
});

test("a missing fetched.jsonl is a warning, not an error", () => {
  const ws = tempWorkspace();
  try {
    rmSync(join(ws, ".dojo", "fetched.jsonl"));
    const result = lintWorkspace(ws);
    assert.equal(result.errors, 0);
    assert.deepEqual(result.findings.map((f) => f.rule), ["lesson/citation-fetched", "lesson/citation-fetched"]);
    assert.equal(result.findings[0].severity, "warning");
  } finally {
    removeDir(ws);
  }
});

test("a sidecar whose answer count does not match", () => {
  withInvalid("L02-sidecar-mismatch.answers.md", "lessons/L02-the-event-loop.answers.md", (ws) => {
    assert.deepEqual(rules(ws), ["error lesson/sidecar"]);
    assert.match(lintWorkspace(ws).findings[0].message, /3 retrieval answers but the lesson has 4 prompts/);
  });
});

test("a checkpoint prompt that is not verbatim", () => {
  withInvalid("C01-not-verbatim.md", "checkpoints/C01-section-1.md", (ws) => {
    assert.deepEqual(rules(ws), ["error checkpoint/verbatim"]);
    assert.deepEqual(rules(ws, ["C01"]), ["error checkpoint/verbatim"]);
    assert.deepEqual(rules(ws, ["L01"]), []);
  });
});

test("more lesson rules: fixed lines, assignment shape, retrieval prompts, budget and advanced level", () => {
  const ws = tempWorkspace();
  try {
    const path = join(ws, "lessons", "L01-what-node-is.md");
    let text = readFileSync(path, "utf8");
    text = text
      .replace("Answer these from what you already know. Check them in the sidecar after the assignment.", "Answer these.")
      .replace("Attempt each from memory, then move on. These return at checkpoints.", "Try these.")
      .replace("   Do: write the one-line version of what Node is in your own words.\n", "")
      .replace("1. [Explain in plain English what Node adds to JavaScript](#core-idea)", "1. [What does Node add to JavaScript?](#nowhere)")
      .replace("- What Node is and what it is not.", "- what is Node?");
    writeFileSync(path, text);
    const found = rules(ws, ["L01"]);
    for (const expected of ["error lesson/before-you-start", "error lesson/retrieval", "error lesson/assignment", "error lesson/retrieval-anchor", "error lesson/retrieval-plain-english", "error lesson/overview", "warning lesson/overview"]) {
      assert.equal(found.includes(expected), true, `expected ${expected} in ${found.join(", ")}`);
    }

    const profile = join(ws, "profile.md");
    writeFileSync(profile, readFileSync(profile, "utf8").replace("level: beginner", "level: advanced"));
    const l02 = join(ws, "lessons", "L02-the-event-loop.md");
    writeFileSync(l02, readFileSync(l02, "utf8").replace("## Introduction\n", `## Introduction\n\n${"Filler words for the budget. ".repeat(40)}\n`));
    const advanced = rules(ws, ["L02"]);
    assert.equal(advanced.includes("error lesson/core-idea"), true, advanced.join(", "));
    assert.equal(advanced.includes("error lesson/budget"), true, advanced.join(", "));
  } finally {
    removeDir(ws);
  }
});

test("project rules: verbatim Rules block, task list, kind and starter", () => {
  const ws = tempWorkspace();
  try {
    const path = join(ws, "projects", "P01-finish-the-file-counter.md");
    let text = readFileSync(path, "utf8");
    text = text
      .replace("- Reconstruct, never copy.", "- Reconstruct, do not copy.")
      .replace("- [ ] The last line is the total and it matches `wc -l`.", "- The last line is the total.")
      .replace("kind: completion", "kind: independent");
    writeFileSync(path, text);
    rmSync(join(ws, "projects", "P01-finish-the-file-counter"), { recursive: true });
    const found = rules(ws, ["P01"]);
    for (const expected of ["error project/rules", "error project/done-when", "error project/kind", "error project/starter"]) {
      assert.equal(found.includes(expected), true, `expected ${expected} in ${found.join(", ")}`);
    }
  } finally {
    removeDir(ws);
  }
});

test("checkpoint rules: counts, M, samples and sampling sections", () => {
  const ws = tempWorkspace();
  try {
    const path = join(ws, "checkpoints", "C01-section-1.md");
    let text = readFileSync(path, "utf8");
    text = text.replace("Predicted: ___ / 6", "Predicted: ___ / 7").replace("## If you scored below 4", "## If you scored below 5").replace("samples: [L01, L02]", "samples: [L01]");
    writeFileSync(path, text);
    const found = rules(ws, ["C01"]);
    for (const expected of ["error checkpoint/count", "error checkpoint/below", "error checkpoint/samples"]) {
      assert.equal(found.includes(expected), true, `expected ${expected} in ${found.join(", ")}`);
    }
  } finally {
    removeDir(ws);
  }
});

test("syllabus-level rules and missing files are reported in the full run", () => {
  const ws = tempWorkspace();
  try {
    const path = join(ws, "syllabus.md");
    writeFileSync(path, readFileSync(path, "utf8").replace("| P02 | capstone | Build a directory watcher | 10 | planned | |", "| P02 | capstone | Build a directory watcher | 10 | generated | |").replace("| C01 | checkpoint | Checkpoint: Section 1 | 0.5 | generated | |\n", ""));
    const found = rules(ws);
    assert.equal(found.includes("error syllabus/file-exists"), true, found.join(", "));
    assert.equal(found.includes("error syllabus/section-checkpoint"), true, found.join(", "));
    assert.equal(found.includes("error item/missing-file"), true, found.join(", "));
  } finally {
    removeDir(ws);
  }
});

test("command line output format, JSON and exit codes", () => {
  const ok = runScript("lint.ts", [WORKSPACE_FIXTURE]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout.trim(), "0 error(s), 0 warning(s)");
  withInvalid("C01-not-verbatim.md", "checkpoints/C01-section-1.md", (ws) => {
    const failed = runScript("lint.ts", [ws]);
    assert.equal(failed.status, 1);
    assert.match(failed.stdout, /^error checkpoints\/C01-section-1\.md:20 checkpoint\/verbatim: prompt 5 is not verbatim/m);
    const json = runScript("lint.ts", [ws, "C01", "--json"]);
    assert.equal(json.status, 1);
    const parsed = JSON.parse(json.stdout);
    assert.equal(parsed.errors, 1);
    assert.equal(parsed.findings[0].rule, "checkpoint/verbatim");
  });
  const unknown = runScript("lint.ts", [WORKSPACE_FIXTURE, "L99"]);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stdout, /item\/unknown/);
  assert.equal(runScript("lint.ts", ["--help"]).status, 0);
});
