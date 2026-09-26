---
id: L00
title: How this course works
---
# How this course works

This is a **dojo** course on {{topic}}, built for one goal: {{goal}}. It runs at about {{hours_per_week}} hours a week to {{target_date}}, at {{level}} level. It follows The Odin Project's model, and it is different from what you may expect from an AI-made course, so read this page first.

## What you are holding

- `syllabus.md` is the plan: sections of lessons, then projects, then a checkpoint. It is also your progress record.
- A **lesson** does not teach you. It orients you in a few hundred words, then sends you to the best free resources on the internet for the real material. Everything in a lesson that dojo wrote itself cites where it came from. Read all of it.
- A **project** gives you requirements and nothing else. You build it. There is no walkthrough on purpose.
- A **checkpoint** asks you questions from the sections you just finished, from memory. Write down how many you expect to get before you look, then how many you got.
- `ledger.md` shows every resource that was considered, how it scored, and why.

## The rules

1. **Read everything, in order.** Lessons are deliberately short and do not repeat themselves.
2. **Do the projects before moving on.** They are where the learning happens. A lesson you read is fluency; a project you shipped is knowledge you keep.
3. **Reconstruct, never copy.** If you paste a solution you found, you skipped the part that changes you. Compare with other people's solutions only after yours works.
4. **Search engines and official docs are open book.** Professionals look things up. Learn to.
5. **Attempt every retrieval prompt from memory, then move on.** You are not expected to get them all. The attempt is the point, and they come back at checkpoints.
6. **Predict before you check.** At every checkpoint, write the number you expect first. The gap between predicted and actual is the most useful number in this course.

## About AI

The Odin Project's position is that you should not use AI tools for your learning, and their reasons are good: if a model writes your code, you never discover how it works, you never learn to ask the right question, and you cannot yet tell good output from bad. The research agrees on the harm: learners with unrestricted AI did better on practice and worse on the unassisted test afterwards, and did not notice.

dojo departs from that stance in one narrow way, because the same research found that a tutor which gives hints and withholds answers removed the harm. So:

- **The agent does not write your code.** Not the solution, not part of it, not a "starting point". If you ask, it will decline and ask you a question instead.
- **`/dojo-coach`** is the only help. It asks what you tried, then narrows the problem with you, then points you at the exact section of the exact resource, then reframes the concept with a different example. Each message gives you one concrete thing to try. It stops before the answer. The moment of understanding has to be yours.
- **`/dojo-quiz`** asks you the retrieval prompts and grades your answer after you give it, never before.
- **A coach session is read-only for your files.** On Claude Code a tool-level guard enforces that, not politeness; on other agents the coach holds the rule itself. Start a fresh session for `/dojo-next` or `/dojo-build`.
- Outside those two commands, if you ask the agent for help in this directory, it will send you to the coach.

If you want a tutor that explains on demand, dojo is not that tool, and it says so here rather than pretending otherwise.

## Commands

| Command | What it does |
|---------|--------------|
| `/dojo-next` | Asks whether you finished the last item, then generates the next one in the syllabus |
| `/dojo-quiz [ID or section]` | Retrieval practice with feedback after each attempt |
| `/dojo-coach` | Hints and questions on the current item; never a solution |
| `/dojo-build` | Renders this workspace to a browsable site with a done button |

Generating an item costs tokens; the command shows an estimate first. Learning from it costs only your time.

## Why it is built this way

Each choice above rests on published evidence: retrieval practice, spacing through checkpoints, prediction questions, worked examples for beginners that fade as you advance, and hint-only AI help. The citations are collected in dojo's evidence document: {{evidence_url}}

dojo {{dojo_version}}. Generated on {{created}}.
