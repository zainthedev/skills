---
status: accepted
---
# Placement is CEFR self-report, per skill

dojo places a learner as beginner, intermediate or advanced from what they have built. Languages have a shared scale, the CEFR, and learners' skills are often uneven: a heritage speaker may speak at B1 and write at A1, a reader of novels may barely speak. lingo places each of listening, reading, speaking and writing on the CEFR from short "I can" descriptors adapted from the Council of Europe's self-assessment grid, and derives an overall level from them. A0 marks no study yet.

The overall level sizes the lessons and chooses their language (ADR 0006). Each task is sized to the skills it exercises, and talk to the speaking or writing level.

## Considered options

- **One overall level.** Rejected: it mis-sizes every task for an uneven learner.
- **A placement test at intake.** Rejected: it costs tokens and a session before anything is generated, and an AI-graded test of speaking is not reliable. Self-report is stated as self-report.

## Consequences

- The learner edits `profile.md` when a skill climbs; the next item reads the new level.
- Intake warns when the target level does not fit the hours, using published hour estimates (evidence section 4).
