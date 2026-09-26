# Review format

A **review** is the written review `/mentor-review` leaves on the learner's code, as a senior leaves one on a junior's pull request: every flag says where to look, what kind of problem it is, why it matters and what to ask yourself, and none says what the fix is.

File: the path `review-scope.ts` prints, one file per scope: `.mentor/reviews/<scope>.md` at the repository root, or `reviews/<scope>.md` in a dojo workspace. A second review of the same scope updates the same file.

## Frontmatter

```yaml
---
scope: branch feature/cart against origin/main from 1a2b3c4, with uncommitted changes
reviewed: 2026-09-26
---
```

`scope` is the line `review-scope.ts` printed after `scope:`; `reviewed` is the date of the latest review.

## Body

```md
# Review: branch feature/cart

## Summary

What the change does as you read it, where the risk sits, and what holds up, in two to four sentences.

## Flags

| # | Category | Severity | Location | Title | Status | Answer given |
|---|----------|----------|----------|-------|--------|--------------|
| 1 | bug | high | src/cart.ts:42-48 | Total of an empty cart | open | no |
| 2 | hand-rolled | medium | src/utils/date.ts | Date arithmetic | open | no |

### 1. Total of an empty cart

- **Why it matters:** a customer who removes their last item still reaches checkout, and the charge sent to the payment API is whatever `total()` returns for that cart.
- **Look:** log `total()` for an empty cart before `checkout.ts:17` uses it, and compare the value with what the payment API accepts.
- **Read:** [MDN, Array.prototype.reduce, the initialValue parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce#initialvalue)
- **Question:** What does the payment API receive when `items` is empty, and where would you want that case caught?

### 2. Date arithmetic

- **Why it matters:** 60 lines of calendar maths is 60 lines to test and to keep right across month ends and time zones.
- **Look:** open `package.json` and list which dependency already works with dates.
- **Question:** What does that dependency's documentation index offer that overlaps with this file?

## Held back

Three lower-severity flags: two readability, one tests. They come back on the next review once the flags above are resolved.
```

## Rules

- Headings, in order: `## Summary`, `## Flags`, then `## Held back` only when flags were held back.
- The flags table has exactly the columns above. `#` counts 1, 2, 3 in table order; a re-review adds rows from the next number.
- Category is one of `bug`, `security`, `requirement` (a dojo project requirement the code does not meet, in a workspace only), `hand-rolled`, `antipattern`, `design`, `error-handling`, `performance`, `tests`, `readability`. Severity is `high` (wrong or unsafe behaviour a user or attacker can reach), `medium` (a real cost later: a maintenance trap, a missing case, a reinvented dependency) or `low` (worth a senior's comment, not a blocker).
- Location is `path`, `path:line` or `path:start-end`, relative to the repository root.
- Status is `open` or `resolved`, and Answer given is `no` or `yes`. `review-mark.ts` changes both; never edit them by hand.
- At most seven flags are open at once, ranked by severity, then by how much the learner learns from fixing each one. Count the rest by category under `## Held back`, one sentence.
- Every flag has a `### <#>. <Title>` section whose title matches the table, with `Why it matters`, `Look` and `Question` lines, and `Read` when a resource section answers it. The Question ends with a question mark.
- **What a flag gives away:** the location, the category and severity, the consequence if it ships (who is hurt, and when), a micro-action that exposes the problem, where to read, and one question.
- **What it never gives away:** the corrected code, the change to make, the name of the replacement function or API, or a sentence that states the cause in full. The title names the area or the symptom, never the fix: "Total of an empty cart", not "Missing reduce initial value". For hand-rolled code, name the dependency or the standard library module the project already has, never the function in it.
- No fenced code anywhere under `## Flags`, and inline code only to name what is already in the learner's code.
- Nothing a formatter or the project's linter would catch. If the project has no linter, say so once in the Summary.
- Every sentence follows the writing rules in RULES.md: the Summary states what holds up as a fact, never as praise.

Done when `review-lint.ts <file>` passes.
