# Profile format

The **profile** is the marker file that makes a directory a workspace, and the record of intake. Commands find the workspace by looking for `profile.md` with a `dojo` frontmatter key in the current directory or its parents.

File: `profile.md` at the workspace root. Written by the init-workspace script from the intake answers; edited by the learner whenever the goal moves.

```md
---
dojo: 0.1.0
topic: Node and Express
slug: node-express
level: intermediate
depth: standard
research_model: inherit
hours_per_week: 6
target_date: 2026-12-15
created: 2026-09-25
---
# Profile

## Goal

Build and deploy a small REST API for my team's internal tooling, with auth and tests, without leaning on a framework I do not understand.

## Prior experience

Three years of TypeScript in React front ends. Wrote one Express route once. No production Node.

## Notes

Prefers text over video. Wants TypeScript throughout.
```

## Rules

- `level` is `beginner`, `intermediate` or `advanced`, judged from Prior experience: beginner has not built anything adjacent; intermediate has built adjacent things in another stack; advanced has shipped the adjacent thing and is filling a gap.
- `depth` is `quick`, `standard` or `deep`.
- `research_model` is `inherit` or a model name the harness accepts for a subagent; research passes run on it where the harness allows a choice. The learner edits it to trade quality for cost.
- The Goal is in the learner's words and concrete enough to become the capstone. "Learn Node" is not a goal; "ship a Node API for X" is.
- Notes holds the answer to any topic-specific fork asked at intake.
