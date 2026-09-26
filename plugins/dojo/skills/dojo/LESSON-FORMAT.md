# Lesson format

A **lesson** orients the learner on one narrow topic in a few hundred cited words and sends them to curated resources for the depth. Layout baked from The Odin Project's lesson template, September 2026 (ADR 0001); their text is never copied.

File: `lessons/<ID>-<slug>.md`, for example `lessons/L03-middleware.md`. Sidecar beside it: `lessons/L03-middleware.answers.md`.

## Frontmatter

```yaml
---
id: L03
title: Middleware
section: 2
hours: 2
generated: 2026-09-25
---
```

## Headings, in this order

`# <title>` then these H2 headings, each required unless marked optional.

1. `## Introduction`: authored. One to three short paragraphs: why this matters and what the learner will be able to do.
2. `## Lesson overview`: authored. Bullets, at most seven, each a thing the learner will *learn about*, sentence case, ending in a period, never a question.
3. `## Before you start`: the fixed line `Answer these from what you already know. Check them in the sidecar after the assignment.`, then an ordered list of two or three **prediction questions** on this lesson's exact concepts.
4. `## Core idea`: authored, optional, omitted at advanced level. The minimal mental model with at most one fenced example. When no resource covered the idea well, open with `> **Authored:** no resource covered this well. Written from [<title>](<url>).`
5. `## Assignment`: an ordered list of three to five items, each exactly:

   ```md
   1. **[Descriptive link text](https://example.com/guide/routing)**
      Why: one sentence on why it is here.
      How: one sentence on how to consume it (which sections, what to skip, watch at what speed).
      Do: one active task to perform with it (change a value and predict the result, write the one-line version, find the sentence that answers question 2).
   ```

   Link text names the thing; "this", "here", "video", "docs", "link" and the like are lint errors. Instructions such as "skip chapter 7" are sub-bullets. Videos are conceptual, never code-alongs, and the How line says how to watch.
6. `## Retrieval practice`: the fixed line `Attempt each from memory, then move on. These return at checkpoints.`, then an ordered list of four to eight **retrieval prompts**. Each prompt is one link whose target is a heading anchor in this lesson (`#core-idea`) or a ledger resource URL. At least one begins `Explain in plain English`. Prompts target concepts and why, never API signatures.
7. `## Additional resources`: optional bullets of ledger resources to explore. Omit the heading when empty.

## Rules

- **Authored budget.** Introduction, Lesson overview and Core idea together: at most 800 words at beginner, 400 at intermediate, 200 at advanced. Lint counts whitespace-separated tokens holding a letter or digit, ignoring fenced code and URLs; link text counts.
- **Citations.** Every URL in Introduction and Core idea is in `ledger.md` and was fetched in this run. Every Assignment and Additional resources URL is in the ledger.
- **Required reading lives in Assignment or Additional resources only.** Links in authored sections are citations, not reading.
- **Free only.**
- **Style.** Every authored sentence follows STYLE.md; lint enforces its word and phrase half.
- **Sidecar.** As many prediction answers as questions, as many retrieval answers as prompts, same numbering.

## Sidecar format

```md
---
id: L03
---
# Answers: Middleware

## Before you start
1. <answer in one to three sentences>. Source: [Express guide: Using middleware](https://expressjs.com/en/guide/using-middleware.html)

## Retrieval practice
1. <answer>. Source: [<title>](<url or #anchor>)
```

Done when the lesson and sidecar exist and `lint` passes on the lesson.
