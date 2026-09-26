---
status: accepted
---
# Syllabus first, items on demand, research in budgeted subagents that draft the item

A whole course in one run would be one very large, unbounded research job; Matt Pocock's `research` skill records a single run consuming about 450k tokens through re-delegation. dojo generates the syllabus in `plan` and each lesson, project or checkpoint on demand in `next`. Every research pass runs in one subagent with a fixed budget of searches and fetches set by the depth preset, a line forbidding it to delegate further, and the job of drafting the item and its sidecar itself, returning only a summary. The main session lints the result and reports the tokens.

## Consequences

- Later items can adapt to what earlier ones covered, and the pause between items fits the rule that the learner closes the AI and goes to learn.
- Fetched pages never enter the main context.
- Projects get only a quick pass to verify named APIs and link their docs, because Odin-style projects deliberately have no walkthrough.
