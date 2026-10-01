# Syllabus format

The **syllabus** is the ordered plan for a workspace and the single record of progress. Humans edit it; scripts parse it. Keep the table shape exact.

File: `syllabus.md` at the workspace root.

## Frontmatter

```yaml
---
language: Spanish
slug: spanish
level: A2
target_level: B1
generated: 2026-10-01
lingo: 0.1.0
structure_sources:
  - https://www.coe.int/en/web/common-european-framework-reference-languages/table-2-cefr-3.3-common-reference-levels-self-assessment-grid
  - https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/
---
```

## Body

`# <language>`, one paragraph naming what the course covers, from which level to which, and what the capstone is, then one H2 per section:

```md
## Section 1: Talking about your day

One optional sentence on what this section is for.

| ID | Type | Title | Hours | Status | Done |
|----|------|-------|-------|--------|------|
| L01 | lesson | Daily routines with reflexive verbs | 3 | generated | |
| L02 | lesson | Telling the time and the days | 2 | planned | |
| T01 | guided-task | Describe your morning in a voice note | 2 | planned | |
| T02 | task | Plan a weekend with a friend by message | 3 | planned | |
| C01 | checkpoint | Checkpoint: Section 1 | 0.5 | planned | |
```

## Rules

- **Columns** are exactly `ID | Type | Title | Hours | Status | Done`, in every table.
- **ID** is `L`, `T` or `C` plus two digits, unique in the file, numbered in course order within its letter.
- **Type** is `lesson`, `guided-task`, `task`, `capstone` or `checkpoint`. Files live under `lessons/`, `tasks/` (all three task types) and `checkpoints/`, named `<ID>-<slug>.md`: the title with accents dropped and lowercased, every run of other characters one hyphen, cut at 60 characters, a leading "Checkpoint:" dropped. A title with no Latin letters gets the slug `item`, so give titles a Latin-script word or two.
- **Hours** is a number. **Status** is `planned`, `generated` or `done`. **Done** is `YYYY-MM-DD` or empty.
- Rows are in course order. Every section ends with exactly one checkpoint. The capstone is the last task and precedes the final checkpoint.
- Only the mark-done script and `lingo-next` change Status and Done; a hand edit is honoured as written.

## Shape

A section is a theme a learner can use, such as talking about your day, ordering and paying, or telling a story about last weekend, with the grammar and words that theme needs. It is never a bare grammar chapter. Order the themes and structures as the structure sources do (RESEARCH.md) and name the sources in the frontmatter.

- A lesson teaches one structure or function and eight to twenty words, and assigns input: listening and reading at or just above the learner's level.
- A task is a communicative job with an outcome (TASK-FORMAT.md). Each section has one or two, spread across the skills in the profile's Focus order. At A0 and A1 a section's first task is a `guided-task`.
- When the language uses a script the learner cannot read, the structure sources decide when and how it is taught; follow them and say which you followed.
- When the profile names an exam, its specification is the first structure source and the capstone is a timed mock.

## Sizing

Total hours fit `hours_per_week` times the weeks to `target_date`, with a fifth held back. Typical: three to eight sections; per section two to four lessons, one or two tasks, one checkpoint. Hours per item: lesson two to four, most of it listening and reading; task two to six; capstone six to fifteen; checkpoint one half. When the hours cannot reach `target_level`, plan for the level they reach and say so in the opening paragraph.

Done when `lint` passes on the syllabus.
