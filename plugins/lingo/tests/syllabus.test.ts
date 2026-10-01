import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSyllabus, validateSyllabus } from "../skills/lingo/scripts/lib/syllabus.ts";
import { WORKSPACE_FIXTURE } from "./helpers.ts";

const text = readFileSync(join(WORKSPACE_FIXTURE, "syllabus.md"), "utf8");

function rules(source: string, level = "A2"): string[] {
  return validateSyllabus(parseSyllabus(source), "syllabus.md", undefined, { level }).map((f) => `${f.severity} ${f.rule}`);
}

test("the fixture syllabus parses into two sections of lessons, tasks and checkpoints", () => {
  const s = parseSyllabus(text);
  assert.equal(s.title, "Spanish");
  assert.deepEqual(s.items.map((it) => it.id), ["L01", "L02", "T01", "C01", "L03", "L04", "T02", "C02"]);
  assert.deepEqual(rules(text), []);
});

test("IDs use L, T and C, and a task row must take a T", () => {
  assert.ok(rules(text.replace("| T01 | guided-task |", "| P01 | guided-task |")).includes("error syllabus/id"));
  assert.ok(rules(text.replace("| T01 | guided-task |", "| L09 | guided-task |")).includes("error syllabus/id"));
  assert.deepEqual(rules(text.replace("| T01 | guided-task |", "| T01 | project |")), ["error syllabus/type"]);
});

test("the capstone is the last task, and A0 and A1 sections open with a guided task", () => {
  assert.deepEqual(rules(text.replace("| T02 | capstone |", "| T02 | task |")), ["warning syllabus/capstone"]);
  const independent = text.replace("| T01 | guided-task |", "| T01 | task |");
  assert.deepEqual(rules(independent), []);
  assert.deepEqual(rules(independent, "A1"), ["warning syllabus/guided-first"]);
  assert.deepEqual(rules(independent, "A0"), ["warning syllabus/guided-first"]);
});

test("the frontmatter names the language", () => {
  assert.deepEqual(rules(text.replace("language: Spanish\n", "")), ["error syllabus/frontmatter"]);
});
