---
status: accepted
---
# Research budgets are fixed by item type; there is no depth question

Intake no longer asks how deep the research should go, and the profile has no `depth` field. Each pass has one budget set by what it produces: a lesson 8 searches and 12 fetches, a project 4 and 6, a syllabus 16 and 24, the figures the old standard depth used. The measured runs of 2026-09-26 put a quick, standard and deep lesson at 212k, 221k and 270k weighted tokens, inside the noise of a single run, because the caps are rarely reached: what a pass costs is the context it carries, not the fetches it makes. A question whose answer barely changes the cost, and never the lesson, is machinery to cut (the tiebreaker in CONTEXT.md). The token table shrinks from depth by level to item type by level, and the estimate the commands quote needs one lookup.

## Considered options

- **Keep depth as a profile field with a default and stop asking.** Rejected: a field nobody sets is a field that rots, and the budgets table already carries the numbers.
- **Keep the question and fix the measurement.** Rejected: the spread was noise once the unclearable lint warning that inflated one run was found, and the question's cost is paid by every learner at intake.

## Consequences

- Intake is four questions plus at most one fork; the token cost is stated once, per item at the assigned level.
- A profile written before this decision still carries `depth`; every script ignores it.
- The quality lever that remains is `research_model`, which trades model for cost without touching the budget.
