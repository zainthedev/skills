# Checkpoint format

A **checkpoint** sits at a section boundary and spaces retrieval across sections without a scheduler (ADR 0004): prompts sampled verbatim from earlier lessons, with the learner's predicted and actual score.

File: `checkpoints/<ID>-<slug>.md`, for example `checkpoints/C02-section-2.md`. Written by `scripts/checkpoint.ts`, which `dojo-next` runs; no model writes it (ADR 0016). This file is the reference for that script and for lint, which still checks a checkpoint a learner edits by hand.

## Frontmatter

```yaml
---
id: C02
title: "Checkpoint: Section 2"
section: 2
samples: [L03, L04, L05, L01]
generated: 2026-09-25
---
```

## Body

```md
# Checkpoint: Section 2

Before you look at the prompts, write how many of the N you expect to answer from memory. Then attempt each without opening anything. Record the actual count. The gap between the two numbers is the point.

Predicted: ___ / N

## Prompts

1. [<prompt text copied verbatim>](../lessons/L03-middleware.md#retrieval-practice) (L03)
2. ...

Actual: ___ / N

## If you scored below M

- L03: re-read [Core idea](../lessons/L03-middleware.md#core-idea) and redo assignment item 2.
- ...
```

## Rules

- Six to ten prompts, ten when the lessons hold that many: two thirds from the section just finished, one third from the section before, interleaved so neighbours come from different lessons. The first checkpoint samples only its own section; a thin previous section gives way to the own section.
- Prompts are verbatim from the lessons' Retrieval practice sections and link to that section.
- M is three quarters of N, rounded down.
- The re-read list names one place per sampled lesson: its Core idea, or its Assignment when it has none, and the assignment item its sampled answers cite most.

Done when every sampled prompt appears verbatim in its source lesson and `lint` passes.
