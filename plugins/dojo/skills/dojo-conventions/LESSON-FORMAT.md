# Lesson format

A **lesson** orients the learner on one narrow topic and sends them to curated resources. Depth lives in the resources, never in the lesson. The layout is baked from The Odin Project's lesson template as of September 2026 (ADR 0001); their text is never copied.

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

`# <title>` then these H2 headings. Each is required unless marked optional.

1. `## Introduction`: authored. One to three short paragraphs: why this matters and what the learner will be able to do.
2. `## Lesson overview`: authored. A bullet list of at most seven things the learner will *learn about*, sentence case, each ending in a period, never phrased as a question.
3. `## Before you start`: a fixed line, `Answer these from what you already know. Check them in the sidecar after the assignment.`, then an ordered list of two or three **prediction questions** about the exact concepts this lesson covers.
4. `## Core idea`: authored, optional. Omit at advanced level. The minimal mental model with at most one fenced example. When no resource covered the idea well, open the section with `> **Authored:** no resource covered this well. Written from [<title>](<url>).`
5. `## Assignment`: an ordered list of three to five items. Each item is exactly:

   ```md
   1. **[Descriptive link text](https://example.com/guide/routing)**
      Why: one sentence on why it is here.
      How: one sentence on how to consume it (which sections, what to skip, watch at what speed).
      Do: one active task to perform with it (change a value and predict the result, write the one-line version, find the sentence that answers question 2).
   ```

   Link text names the thing; "this", "here", "video", "docs", "link", "this video" and the like are lint errors. Instructions such as "skip chapter 7" are sub-bullets. Videos are conceptual, not code-alongs, and the How line says how to watch.
6. `## Retrieval practice`: a fixed first line, `Attempt each from memory, then move on. These return at checkpoints.`, then an ordered list of four to eight **retrieval prompts**. Each prompt is a link whose target is either a heading anchor in this lesson (`#core-idea`) or a ledger resource URL. At least one prompt begins `Explain in plain English`. Prompts target concepts and why, never API signatures.
7. `## Additional resources`: optional bullet list of ledger resources the learner may explore. Omit the heading entirely when empty.

## Rules

- **Authored budget.** Words in Introduction, Lesson overview and Core idea together: at most 800 at beginner level, 400 at intermediate, 200 at advanced. Lint counts whitespace-separated words containing a letter or digit, ignoring fenced code and URLs; link text counts. A Core idea at advanced level is an error.
- **Citations.** Every URL in Introduction and Core idea appears in `ledger.md` and was fetched in this run. Every Assignment and Additional resources URL appears in the ledger.
- **Required reading lives in Assignment or Additional resources only.** Links in authored sections are citations, not reading.
- **Free only.** No paid resource anywhere.
- **Sidecar.** Numbering in the sidecar matches the lesson exactly: as many prediction answers as prediction questions, as many retrieval answers as retrieval prompts.

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

Done when the lesson and sidecar exist, `lint` passes on the lesson, and every rule above holds.
