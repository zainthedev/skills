import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { answerMarkdown, parseSidecar, readSidecar } from "../skills/dojo/scripts/lib/sidecar.ts";
import { WORKSPACE_FIXTURE } from "./helpers.ts";

test("reads numbered answers for both sections", () => {
  const sidecar = readSidecar(join(WORKSPACE_FIXTURE, "lessons", "L02-the-event-loop.answers.md"))!;
  assert.equal(sidecar.id, "L02");
  assert.equal(sidecar.title, "Answers: The event loop");
  assert.equal(sidecar.prediction.length, 3);
  assert.equal(sidecar.retrieval.length, 4);
  assert.match(answerMarkdown(sidecar.retrieval, 2)!, /^Timers, pending callbacks/);
  assert.equal(answerMarkdown(sidecar.retrieval, 9), null);
});

test("missing sections yield empty lists and a missing file yields null", () => {
  const sidecar = parseSidecar("---\nid: L09\n---\n# Answers\n");
  assert.deepEqual([sidecar.prediction, sidecar.retrieval], [[], []]);
  assert.equal(readSidecar("/nonexistent/x.answers.md"), null);
});
