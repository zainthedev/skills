import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isLevelCell, ledgerHas, parseLedger, validateLedger } from "../skills/lingo/scripts/lib/ledger.ts";
import { WORKSPACE_FIXTURE } from "./helpers.ts";

const text = readFileSync(join(WORKSPACE_FIXTURE, "ledger.md"), "utf8");

test("the fixture ledger parses with a Level column", () => {
  const ledger = parseLedger(text);
  assert.equal(ledger.rows.length, 7);
  assert.equal(ledger.rows[0].level, "A1-B1");
  assert.equal(ledger.rows[3].level, "-");
  assert.ok(ledgerHas(ledger, "https://www.spanishdict.com/guide/reflexive-verbs#placement"));
  assert.deepEqual(validateLedger(ledger, "ledger.md"), []);
});

test("Level takes a CEFR band, an ascending range or -", () => {
  for (const ok of ["A1", "C2", "A2-B1", "B1-B1", "-"]) assert.equal(isLevelCell(ok), true, ok);
  for (const bad of ["", "A0", "B3", "B2-A1", "beginner", "A1 - B1"]) assert.equal(isLevelCell(bad), false, bad);
});

test("types are the language-learning ones", () => {
  const rules = (t: string) => validateLedger(parseLedger(t), "ledger.md").map((f) => f.rule);
  assert.deepEqual(rules(text.replace("| channel | 86 |", "| docs | 86 |")), ["ledger/type"]);
  assert.deepEqual(rules(text.replace("| channel | 86 |", "| reader | 86 |")), []);
});
