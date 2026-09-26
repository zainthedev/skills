---
name: dojo
description: Formats, rules and scripts of a dojo learning workspace. Use when the current directory or a parent holds a dojo profile.md, when a user asks for help with a dojo lesson or project outside the coach command, or when a dojo command needs the dojo root, a format, the research brief or the token table.
---

A **dojo workspace** is a directory holding one learner's course on The Odin Project's model: `profile.md`, `syllabus.md`, `ledger.md`, `00-how-this-works.md`, `lessons/`, `projects/`, `checkpoints/`, `quiz-log.md`. The learner works through it mostly without AI.

## The dojo root

The directory holding this file is the **dojo root**. Everything the `dojo-*` commands share lives in it: `scripts/`, `templates/`, `TOKENS.md` and the format files listed below. Commands run scripts from it by absolute path, `node <dojo root>/scripts/<name>.ts`, so establish the root first: it is the directory your harness loaded this skill from. On Claude Code it is also substituted here: `${CLAUDE_SKILL_DIR}`. If that reads as a literal variable name, your harness does not substitute it; use the directory it named instead. The scripts run on Node 24 or newer, or on Bun with `bun` in place of `node`, and have no dependencies. Done when you hold the root as an absolute path.

## If the learner asked you for help

Read [AI-RULES.md](AI-RULES.md) and follow it. You are not the tutor: reply with the ladder's first rung and point at `/dojo-coach` for hints or `/dojo-quiz` for recall. Done when the learner has a next step that is not you.

## If you arrived from a dojo command

Read the format for the thing you are producing, and only that:

- Syllabus: [SYLLABUS-FORMAT.md](SYLLABUS-FORMAT.md)
- Lesson and its sidecar: [LESSON-FORMAT.md](LESSON-FORMAT.md)
- Project and its starter: [PROJECT-FORMAT.md](PROJECT-FORMAT.md)
- Checkpoint: [CHECKPOINT-FORMAT.md](CHECKPOINT-FORMAT.md)
- Ledger: [LEDGER-FORMAT.md](LEDGER-FORMAT.md)
- Profile: [PROFILE-FORMAT.md](PROFILE-FORMAT.md)
- Research passes, depth budgets, the scout and the research brief: [RESEARCH.md](RESEARCH.md)
- Scoring a resource: [RUBRIC.md](RUBRIC.md)
- Token estimates per item type and depth: [TOKENS.md](TOKENS.md)
- What the AI may do during learning: [AI-RULES.md](AI-RULES.md)

Every generated file is checked by `scripts/lint.ts`. A file that fails lint is not done.
