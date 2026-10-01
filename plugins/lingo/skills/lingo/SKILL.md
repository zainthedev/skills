---
name: lingo
description: Formats, rules and scripts of a lingo language-learning workspace. Use when the current directory or a parent holds a lingo profile.md, when a user asks for help with a lingo lesson, task or text outside the lingo commands, or when a lingo command needs the lingo root, a format, the research brief or the token table.
---

A **lingo workspace** is a directory holding one learner's course in one language, on The Odin Project's model adapted for languages: `profile.md`, `syllabus.md`, `ledger.md`, `00-how-this-works.md`, `lessons/`, `tasks/`, `checkpoints/`, `talk/`, `reviews/`, `quiz-log.md`, `talk-log.md`, `mistakes.md` and `deck.tsv`. The learner works through it mostly without AI, practises speaking and writing with `/lingo-talk`, and reviews words in Anki.

## The lingo root

The directory holding this file is the **lingo root**. Everything the `lingo-*` commands share lives in it: `scripts/`, `templates/`, `TOKENS.md` and the format files listed below. Commands run scripts from it by absolute path, `node <lingo root>/scripts/<name>.ts`, so establish the root first: it is the directory your harness loaded this skill from. On Claude Code it is also substituted here: `${CLAUDE_SKILL_DIR}`. If that reads as a literal variable name, your harness does not substitute it; use the directory it named instead. The scripts run on Node 24 or newer, or on Bun with `bun` in place of `node`, and have no dependencies. Done when you hold the root as an absolute path.

## If the learner asked you for help

Read [AI-RULES.md](AI-RULES.md) and follow it. You are not the tutor and not a translator: reply with the ladder's first rung and point at `/lingo-coach` when they are stuck, `/lingo-talk` to practise, `/lingo-review` for feedback on something they wrote, or `/lingo-quiz` for recall. Done when the learner has a next step that is not you.

## If you arrived from a lingo command

Read the format for the thing you are producing, and only that:

- Syllabus: [SYLLABUS-FORMAT.md](SYLLABUS-FORMAT.md)
- Lesson, its Words table and its sidecar: [LESSON-FORMAT.md](LESSON-FORMAT.md)
- Task: [TASK-FORMAT.md](TASK-FORMAT.md)
- Checkpoint: [CHECKPOINT-FORMAT.md](CHECKPOINT-FORMAT.md)
- Talk record: [TALK-FORMAT.md](TALK-FORMAT.md)
- Writing review: [REVIEW-FORMAT.md](REVIEW-FORMAT.md)
- Ledger: [LEDGER-FORMAT.md](LEDGER-FORMAT.md)
- Profile and placement: [PROFILE-FORMAT.md](PROFILE-FORMAT.md)
- Research passes, their budgets, the scout and fetch recording: [RESEARCH.md](RESEARCH.md); the brief a command fills in: [templates/brief.md](templates/brief.md)
- Scoring a resource: [RUBRIC.md](RUBRIC.md)
- How every sentence for the learner is written: [STYLE.md](STYLE.md)
- Token estimates per item type and level: [TOKENS.md](TOKENS.md)
- What the AI may do during learning, and how talk corrects: [AI-RULES.md](AI-RULES.md)

`scripts/context.ts <workspace> <ID>` prints the digest a pass works from instead of reading the workspace files; `scripts/context.ts <workspace> quiz` prints a capped quiz and `scripts/context.ts <workspace> talk` what a conversation practises. Every generated file is checked by `scripts/lint.ts`, style rules included. A file that fails lint is not done.
