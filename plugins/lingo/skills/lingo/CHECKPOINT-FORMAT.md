# Checkpoint format

A **checkpoint** sits at a section boundary and spaces retrieval across sections without a scheduler: prompts and words sampled verbatim from earlier lessons, with the learner's predicted and actual score.

File: `checkpoints/<ID>-<slug>.md`, for example `checkpoints/C02-section-2.md`. Written by `scripts/checkpoint.ts`, which `lingo-next` runs; no model writes it. This file is the reference for that script and for lint, which still checks a checkpoint a learner edits by hand.

## Frontmatter

```yaml
---
id: C02
title: "Checkpoint: Section 2"
section: 2
samples: [L03, L04, L05, L01]
generated: 2026-10-01
---
```

## Body

```md
# Checkpoint: Section 2

Before you look at the prompts and words, write how many of the N you expect to answer from memory. Then attempt each without opening anything. Record the actual count. The gap between the two numbers is the point.

Predicted: ___ / N

## Prompts

1. Say: [<prompt text copied verbatim>](../lessons/L03-the-preterite-for-finished-actions.md#retrieval-practice) (L03)
2. ...

## Words

Write the Spanish word for each meaning, out loud or on paper.

1. [yesterday](../lessons/L03-the-preterite-for-finished-actions.md#words) (L03)
2. ...

Actual: ___ / N

## If you scored below M

- L03: re-read [Core idea](../lessons/L03-the-preterite-for-finished-actions.md#core-idea) and redo assignment item 2; drill its [Words](../lessons/L03-the-preterite-for-finished-actions.md#words).
- ...
```

## Rules

- Six to ten prompts, ten when the lessons hold that many: two thirds from the section just finished, one third from the section before, interleaved so neighbours come from different lessons. The first checkpoint samples only its own section; a thin previous section gives way to the own section.
- Prompts are verbatim from the lessons' Retrieval practice sections, with their labels, and link to that section.
- Up to ten words, sampled the same way and spread through each lesson's table, shown by their Meaning, linked to the lesson's Words. Words is omitted when no sampled lesson has any.
- N counts prompts and words. M is three quarters of N, rounded down.
- The re-read list names one place per sampled lesson: its Core idea, or its Assignment when it has none, the assignment item its sampled answers cite most, and its Words when a word was sampled.

Done when every sampled prompt and meaning appears verbatim in its source lesson and `lint` passes.
