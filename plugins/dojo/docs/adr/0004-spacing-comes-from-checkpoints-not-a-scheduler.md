---
status: accepted
---
# Spacing comes from checkpoints, not a scheduler

Spaced retrieval beats massed retrieval with a large effect, but expanding versus uniform intervals is a wash (g about 0.03), and The Odin Project gets its spacing through projects that reuse earlier skills. So dojo has no review scheduler, no progress dates and no flashcard deck. Spacing is built into the structure: a checkpoint at every section boundary samples retrieval prompts from earlier sections and records the learner's predicted and actual score, and projects deliberately reuse earlier sections. `quiz` runs the same prompts on demand with feedback after each attempt and keeps no schedule.

## Considered options

- An expanding-interval scheduler with a progress file and Anki export. Rejected: the algorithm is not the evidence-based part, and engineers reasonably resist a daily drill habit for material they can look up.

## Consequences

- Retrieval prompts and checkpoints target concepts and mental models, never facts a search would answer. What should stick is what you reason with.
- Progress tracks completion only, which keeps the syllabus the single source of truth (ADR 0009).
- If a scheduler is ever wanted it is additive: the sidecars and quiz log already hold what it would need.
