# Project format

A **project** is a build the learner completes without a walkthrough, specified as requirements, reusing earlier sections. Layout baked from The Odin Project's project template, September 2026; their text is never copied.

File: `projects/<ID>-<slug>.md`, for example `projects/P02-todo-api.md`. A **completion project** also has `projects/P02-todo-api/starter/`.

## Kinds

- `completion`: starts from a partial build the learner finishes. Given at beginner level before the section's independent project.
- `independent`: requirements only. The default at intermediate and advanced.
- `capstone`: the last project of the course, derived from the goal in `profile.md`.

## Frontmatter

```yaml
---
id: P02
title: Todo API
section: 2
hours: 4
kind: independent
reuses: [L01, L03, L04]
generated: 2026-09-25
---
```

## Headings, in this order

`# Project: <title>` then:

1. `## Introduction`: what the learner will build and which earlier lessons it reuses, named. The capstone's restates the goal from `profile.md` in one sentence.
2. `## Starter`: completion projects only. What `starter/` contains, how to run it, where the gaps are. Every gap is marked `TODO(dojo): <what to do>` in the code. The starter runs, or fails clearly at a gap.
3. `## Assignment`: an ordered list of requirements or user stories, each checkable, naming behaviour rather than implementation.
4. `## Extra credit`: optional bullets.
5. `## Rules`: this fixed block, verbatim:

   ```md
   - Reconstruct, never copy. If you paste a solution you found, you have skipped the part that changes you.
   - Do not look at other people's finished solutions until yours works. Compare afterwards.
   - Search engines and official docs are open book. AI is not: `/dojo-coach` will ask you questions and point you at resources, and will not write this for you.
   ```
6. `## Done when`: a task list (`- [ ]`) of behaviours the learner verifies by running the build.

## Rules

- Every API named in the requirements is verified against its docs during the quick research pass, and those docs are in the ledger.
- Every authored sentence follows STYLE.md.

Done when the project file exists, the starter exists and runs when the kind is completion, and `lint` passes.
