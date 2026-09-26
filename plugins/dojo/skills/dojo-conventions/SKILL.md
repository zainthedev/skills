---
name: dojo-conventions
description: Formats and rules of a dojo learning workspace. Use when the current directory or a parent holds a dojo profile.md, when a user asks for help with a dojo lesson or project outside the coach command, or when a dojo command needs the syllabus, lesson, project, checkpoint, ledger or research conventions.
---

A **dojo workspace** is a directory holding one learner's course on The Odin Project's model: `profile.md`, `syllabus.md`, `ledger.md`, `00-how-this-works.md`, `lessons/`, `projects/`, `checkpoints/`, `quiz-log.md`. The learner works through it mostly without AI.

## If the learner asked you for help

Read [AI-RULES.md](AI-RULES.md) and follow it. You are not the tutor: reply with the ladder's first rung and point at `/dojo:coach` for hints or `/dojo:quiz` for recall. Done when the learner has a next step that is not you.

## If you arrived from a dojo command

Read the format for the thing you are producing, and only that:

- Syllabus: [SYLLABUS-FORMAT.md](SYLLABUS-FORMAT.md)
- Lesson and its sidecar: [LESSON-FORMAT.md](LESSON-FORMAT.md)
- Project and its starter: [PROJECT-FORMAT.md](PROJECT-FORMAT.md)
- Checkpoint: [CHECKPOINT-FORMAT.md](CHECKPOINT-FORMAT.md)
- Ledger: [LEDGER-FORMAT.md](LEDGER-FORMAT.md)
- Profile: [PROFILE-FORMAT.md](PROFILE-FORMAT.md)
- Research passes, depth budgets, the scout and the subagent brief: [RESEARCH.md](RESEARCH.md)
- Scoring a resource: [RUBRIC.md](RUBRIC.md)
- What the AI may do during learning: [AI-RULES.md](AI-RULES.md)

Every generated file is checked by the plugin's `lint` script. A file that fails lint is not done.
