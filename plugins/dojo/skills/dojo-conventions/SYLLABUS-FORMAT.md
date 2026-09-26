# Syllabus format

The **syllabus** is the ordered plan for a workspace and the single source of truth for progress (ADR 0009). Humans edit it; scripts parse it. Keep the table shape exact.

File: `syllabus.md` at the workspace root.

## Frontmatter

```yaml
---
topic: Node and Express
slug: node-express
level: intermediate
depth: standard
generated: 2026-09-25
dojo: 0.1.0
structure_sources:
  - https://expressjs.com/en/guide/routing.html
  - https://www.theodinproject.com/paths/full-stack-javascript/courses/nodejs
---
```

## Body

`# <topic>`, one paragraph naming what the course covers and what the capstone builds, then one H2 per section:

```md
## Section 1: Node fundamentals

One optional sentence on what this section is for.

| ID | Type | Title | Hours | Status | Done |
|----|------|-------|-------|--------|------|
| L01 | lesson | The event loop and modules | 2 | generated | |
| L02 | lesson | Streams and the file system | 2 | planned | |
| P01 | completion-project | Finish the log tailer | 3 | planned | |
| P02 | project | Build a CLI that watches a directory | 4 | planned | |
| C01 | checkpoint | Checkpoint: Section 1 | 0.5 | planned | |
```

## Rules

- **Columns** are exactly `ID | Type | Title | Hours | Status | Done`, in that order, in every table.
- **ID** is `L`, `P` or `C` followed by two digits, unique across the file, numbered in course order within its letter: lessons L01, L02, ..., projects P01, P02, ..., checkpoints C01, C02, ....
- **Type** is one of `lesson`, `project`, `completion-project`, `capstone`, `checkpoint`. Files live under `lessons/`, `projects/` (all three project types) and `checkpoints/`, named `<ID>-<slug>.md`, where the slug is the title lowercased with every run of non-alphanumeric characters replaced by one hyphen, no leading or trailing hyphen, cut at 60 characters, and with a leading "Checkpoint:" dropped: "Checkpoint: Section 1" becomes `C01-section-1.md`.
- **Hours** is a number. **Status** is `planned`, `generated` or `done`. **Done** is a date, `YYYY-MM-DD`, or empty.
- Row order is course order. Every section ends with exactly one checkpoint row. The capstone is the last project in the course and comes before the final checkpoint.
- Only the mark-done script and `next` change Status and Done. A hand edit is honoured as written.

## Sizing

Total hours fit `hours_per_week` times the weeks to `target_date` in `profile.md`, with a fifth held back for slippage. Typical: three to six sections; per section two to five lessons, one or two projects, one checkpoint. Hours per item: lesson one to three, project three to eight, capstone eight to twenty, checkpoint one half. At beginner level a section's first project is a `completion-project`. Order sections the way the structure sources do (see RESEARCH.md), and name the sources in the frontmatter.

Done when `lint` passes on the syllabus and every rule above holds.
