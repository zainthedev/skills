import { test } from "node:test";
import assert from "node:assert/strict";
import { ADVERBS, PHRASES, VOCABULARY, checkStyle, proseOf } from "../skills/dojo/scripts/lib/style.ts";

function rules(lines: string[]): string[] {
  return checkStyle(lines, 1).map((f) => `${f.severity} ${f.rule}`);
}

test("clean prose produces no findings", () => {
  assert.deepEqual(
    rules([
      "Every Express application is a function that receives a request and must send one response.",
      "Read up to and including \"Route parameters\"; skip \"Route handlers\" for now.",
      "1. **[Express guide: Routing](https://expressjs.com/en/guide/routing.html)**",
    ]),
    [],
  );
});

test("banned phrases are errors with the phrase named", () => {
  const findings = checkStyle(["Here's the thing: routing is simple.", "By the end of this lesson you will know it."], 10);
  assert.deepEqual(
    findings.map((f) => [f.line, f.rule, f.severity]),
    [
      [10, "style/phrase", "error"],
      [11, "style/phrase", "error"],
    ],
  );
  assert.match(findings[0].message, /here's the thing/);
});

test("phrases match across curly apostrophes and bold markers", () => {
  assert.deepEqual(rules(["It’s worth noting that **in this lesson we** cover routes."]), ["error style/phrase", "error style/phrase"]);
});

test("AI vocabulary is an error, adverbs a warning", () => {
  assert.deepEqual(rules(["We delve into the intricate landscape of Node."]), ["error style/vocabulary", "error style/vocabulary", "error style/vocabulary"]);
  assert.deepEqual(rules(["This is really just a function."]), ["warning style/adverb", "warning style/adverb"]);
});

test("contrast scaffolding is an error", () => {
  assert.deepEqual(rules(["Middleware isn't about order, it's about control."]), ["error style/contrast"]);
  assert.deepEqual(rules(["Not only does it parse JSON, but it also validates it."]), ["error style/contrast"]);
  assert.deepEqual(rules(["It's not a bug. It's a feature of the router."]), ["error style/contrast"]);
  assert.deepEqual(rules(["Express matches routes in order; the first match wins."]), []);
});

test("dashes, emoji and bold overuse", () => {
  assert.deepEqual(rules(["Routes match top to bottom — the first wins."]), ["error style/dash"]);
  assert.deepEqual(rules(["Run the server \u{1F680} and check."]), ["error style/emoji"]);
  assert.deepEqual(rules(["**One** thing, **two** things, **three** things."]), ["warning style/bold"]);
});

test("code, link targets and URLs are ignored", () => {
  assert.deepEqual(rules(["Call `delve()` and see https://example.com/leverage-guide then [read the docs](https://x.test/journey)."]), []);
  assert.deepEqual(rules(["```", "const journey = delve(really);", "```"]), []);
  assert.equal(proseOf("See [the guide](https://x.test/y) and `just` this **bold** word."), "See [the guide] and   this bold word.");
});

test("the lists carry no duplicates", () => {
  for (const list of [PHRASES, VOCABULARY, ADVERBS]) {
    assert.equal(new Set(list).size, list.length);
  }
});
