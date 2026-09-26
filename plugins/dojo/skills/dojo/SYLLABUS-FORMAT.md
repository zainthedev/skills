# Syllabus format

The **syllabus** is the ordered plan for a workspace and the single record of progress (ADR 0009). Humans edit it; scripts parse it. Keep the table shape exact.

File: `syllabus.md` at the workspace root.

## Frontmatter

```yaml
---
topic: Node and Express
slug: node-express
level: intermediate
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

- **Columns** are exactly `ID | Type | Title | Hours | Status | Done`, in every table.
- **ID** is `L`, `P` or `C` plus two digits, unique in the file, numbered in course order within its letter.
- **Type** is `lesson`, `project`, `completion-project`, `capstone` or `checkpoint`. Files live under `lessons/`, `projects/` (all three project types) and `checkpoints/`, named `<ID>-<slug>.md`: the title lowercased, every run of non-alphanumerics one hyphen, no leading or trailing hyphen, cut at 60 characters, a leading "Checkpoint:" dropped, so "Checkpoint: Section 1" is `C01-section-1.md`.
- **Hours** is a number. **Status** is `planned`, `generated` or `done`. **Done** is `YYYY-MM-DD` or empty.
- Rows are in course order. Every section ends with exactly one checkpoint. The capstone is the last project and precedes the final checkpoint.
- Only the mark-done script and `dojo-next` change Status and Done; a hand edit is honoured as written.

## Sizing

Total hours fit `hours_per_week` times the weeks to `target_date`, with a fifth held back. Typical: three to six sections; per section two to five lessons, one or two projects, one checkpoint. Hours per item: lesson one to three, project three to eight, capstone eight to twenty, checkpoint one half. At beginner level a section's first project is a `completion-project`. Order sections as the structure sources do (RESEARCH.md) and name them in the frontmatter.

Done when `lint` passes on the syllabus.
