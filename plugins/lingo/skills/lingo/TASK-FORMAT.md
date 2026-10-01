# Task format

A **task** is a communicative job the learner completes without a walkthrough: something people do with a language, with an outcome a listener or reader could check. It reuses earlier lessons. Layout adapted from The Odin Project's project template; their text is never copied.

File: `tasks/<ID>-<slug>.md`, for example `tasks/T02-plan-a-weekend-with-a-friend-by-message.md`.

## Kinds

- `guided`: starts from a model text or dialogue with gaps the learner fills, then asks for their own version. Given at A0 and A1 before the section's independent task.
- `independent`: requirements only. The default from A2.
- `capstone`: the last task of the course, derived from the goal in `profile.md`. When the profile names an exam, a timed mock built from a free official sample paper.

## Frontmatter

```yaml
---
id: T02
title: Plan a weekend with a friend by message
section: 1
hours: 3
kind: independent
skills: [writing, reading]
reuses: [L01, L02]
generated: 2026-10-01
---
```

`skills` lists what the task exercises, from listening, reading, speaking and writing. Size the task to the profile's level for those skills, not the overall one.

## Headings, in this order

`# Task: <title>` then:

1. `## Introduction`: the situation, who the learner is talking or writing to and why, and which earlier lessons it reuses, named. The capstone's restates the goal from `profile.md` in one sentence.
2. `## Model`: guided tasks only. Opens with the fixed line `> **Authored model text.** Written for this task, not quoted from a resource.`, or `> **From [<title>](<url>).**` when it quotes a ledger resource. Then the model text or dialogue, with every gap the learner fills marked `___`.
3. `## Assignment`: an ordered list of requirements, each checkable, naming the outcome and the language it needs ("ask two questions about the time and place", "use the preterite for at least three finished actions"), never the sentences themselves. A speaking task asks for a recording of at most a few minutes the learner keeps; a writing task gives a length in words or sentences.
4. `## Extra credit`: optional bullets.
5. `## Rules`: this fixed block, verbatim:

   ```md
   - Produce it yourself. A sentence a translator or a model wrote for you is a sentence you did not practise.
   - Dictionaries, conjugation tables and grammar references are open book. Machine translation and AI writing are not: `/lingo-coach` asks you questions and points at resources, `/lingo-talk` practises with you, and neither writes this for you.
   - Show the result to a person when you can, such as a tutor or an exchange partner, and note what they corrected.
   ```
6. `## Done when`: a task list (`- [ ]`) of outcomes the learner checks. A speaking task includes listening back to the recording against a native model from the lessons; a writing task includes running `/lingo-review` on it and fixing every open mark.

## Rules

- The Introduction and requirements are in the language LESSON-FORMAT.md gives the `task` part at the learner's level.
- Every resource a task names is in the ledger. A task uses the task research budget.
- Every authored sentence follows STYLE.md.

Done when the task file exists and `lint` passes.
