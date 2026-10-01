---
id: L00
title: How this course works
---
# How this course works

This is a **lingo** course in Spanish for a native English speaker, built for one goal: Talk with my partner's family in Guadalajara for an evening without switching to English. It starts from A2 and aims at B1 on the CEFR scale, at about 5 hours a week to 2027-06-30. It follows The Odin Project's model, adapted for a language, and it is different from what you may expect from an AI-made course, so read this page first.

## What you are holding

- `syllabus.md` is the plan: sections of lessons, then tasks, then a checkpoint. It is also your progress record.
- A **lesson** does not teach you the language. It orients you in a few hundred words, gives you the words to learn, then sends you to the best free listening, reading and reference material it found. Everything lingo wrote itself cites where it came from. As your level rises, more of the lesson is in Spanish.
- A **task** is something people do with a language: leave a voice message, write to a landlord, order a meal. You get the situation and the requirements, and you produce it. Early tasks give you a model with gaps first.
- A **checkpoint** asks you prompts and words from the sections you just finished, from memory. Write down how many you expect to get before you look, then how many you got.
- `deck.tsv` holds every word the lessons taught, ready to import into Anki, which schedules your reviews.
- `mistakes.md` collects the corrections from your conversations. Quizzes bring them back until you get them right.
- `ledger.md` shows every resource that was considered, how it scored, and why.

## The rules

1. **Spend most of your hours on input.** Listening and reading at a level you can follow is where most of a language comes from. The lessons are short so the hours go to the resources.
2. **Do the tasks before moving on.** A task is where you find out what you can say. Record your speaking tasks and listen back.
3. **Shadow.** When an assignment says to, play a sentence, pause, and say it in the speaker's rhythm. Record yourself and compare.
4. **Produce it yourself.** A sentence a translator or a model wrote for you is a sentence you did not practise. Dictionaries, conjugation tables and grammar references are open book.
5. **Review your words every day in Anki.** Import `deck.tsv` after each lesson. A short daily review spaces the words better than one long session a week.
6. **Attempt every retrieval prompt from memory, out loud or on paper, then move on.** You are not expected to get them all. The attempt is the point, and they come back at checkpoints.
7. **Predict before you check.** At every checkpoint, write the number you expect first. The gap between predicted and actual is the most useful number in this course.
8. **Talk to people.** A tutor or a language exchange partner is the best practice there is, and many exchange communities are free. lingo never requires a paid service.

## About AI

The research on AI and learning is consistent about one harm: learners who let a model do the work score better on practice and worse on the test they take alone afterwards. For a language, the model doing the work means translating your reading for you, writing your messages, or fixing your sentences before you try. lingo keeps the AI away from that, and uses it for the one thing a language learner rarely gets enough of: someone to talk to who corrects with care.

- **The agent does not translate your assigned texts and does not write your tasks.** Not the whole thing, not a sentence, not a "starting point". It will tell you what one word means, as a dictionary would.
- **`/lingo-talk`** is a conversation in Spanish at your level, on what the current lesson or task practises unless you pick a topic. When you make an error on something the course has taught, it asks you to fix it yourself; when you have not met the structure yet, it says it back the right way and moves on. It corrects one thing per turn, and at the end lists up to five corrections, which go into `mistakes.md`.
- **`/lingo-review`** marks errors in something you wrote with a code and a hint. It never writes the corrected sentence: you fix it, and run it again.
- **`/lingo-coach`** helps when you are stuck. It asks what you tried, narrows the problem, points at the exact section of the exact resource, then shows the pattern with a different sentence. It stops before the answer.
- **`/lingo-quiz`** asks you prompts, words and your own past mistakes, and grades your answer after you give it, never before.
- **Coach, talk and review sessions are read-only for your files.** On Claude Code a tool-level guard enforces that, not politeness; talk may write only its own record and review only its review. On other agents each command holds the rule itself. Start a fresh session for `/lingo-next` or `/lingo-build`.
- Outside those commands, if you ask the agent for help in this directory, it will send you to one of them.

If you want a tutor that explains and translates on demand, lingo is not that tool, and it says so here rather than pretending otherwise.

## Commands

| Command | What it does |
|---------|--------------|
| `/lingo-next` | Asks whether you finished the last item, then generates the next one in the syllabus |
| `/lingo-talk [ID, section or topic]` | A conversation in Spanish at your level, with corrections |
| `/lingo-review <file or pasted text>` | Marks errors in your writing with codes and hints, never the fix |
| `/lingo-quiz [ID or section]` | Prompts, words and past mistakes, with feedback after each attempt |
| `/lingo-coach` | Hints and questions on what you are stuck on; never the answer |
| `/lingo-build` | Starts this course's site again, for example after a restart of your computer |

Generating an item costs tokens; the command shows an estimate first. Learning from it costs only your time.

## Why it is built this way

Each choice above rests on published evidence: comprehensible input, retrieval and spaced practice, prediction questions, explicit instruction early that gives way to input, task-based practice, corrective feedback that asks you to repair first, focused feedback on writing, and hint-only AI help. The citations are collected in lingo's evidence document: https://github.com/zainthedev/skills/blob/main/plugins/lingo/docs/evidence.md

lingo 0.1.0. Generated on 2026-10-01.
