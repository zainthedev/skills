# lingo: spec

Synthesised from the design session of 1 October 2026, which started from dojo's spec (`../../dojo/docs/spec.md`) and answered what a language course needs that a technical one does not. Vocabulary is in `../CONTEXT.md`, decisions with trade-offs in `adr/`, the evidence in `evidence.md`.

## Problem Statement

A self-taught language learner has apps that gamify word drills, free input scattered across YouTube and podcasts with no order to it, and an AI that will happily translate their reading and write their messages, which removes the practice. What they rarely have is a course sized to their goal, level and hours, built from the free resources learners actually recommend, with someone to talk to who corrects with care and never does the work for them.

## Solution

`lingo` is dojo for languages: seven commands. `plan` interviews the learner once, placing each skill on the CEFR, researches how the language is taught and which free resources are recommended, and writes a syllabus of themed sections. `next` generates the next lesson, task or checkpoint. `talk` is a conversation partner in the target language. `review` marks errors in the learner's writing without fixing them. `quiz` runs retrieval with words and past mistakes. `coach` gives hints up a ladder. `build` serves the site. Lesson zero sets the rules.

## User Stories

1. As a learner, I want to say what I can do in each skill and have the course placed from it, so that an uneven profile gets the right tasks.
2. As a learner, I want to be told when my target level does not fit my hours, so that I set a goal I can reach.
3. As a learner, I want lessons that orient me briefly and send me to free listening and reading at my level, so that most of my hours go to input.
4. As a beginner, I want explanations in my own language, and as I climb I want more of the lesson in the target language.
5. As a learner, I want each lesson's words exported to Anki, so that the reviews schedule themselves.
6. As a learner, I want tasks that are things people do with a language, starting from a model with gaps at the beginning.
7. As a learner, I want to practise a conversation on what I just studied, corrected so that I find the fix myself when I can.
8. As a learner, I want the corrections from my conversations to come back in quizzes until I get them right.
9. As a learner, I want feedback on my writing that tells me where and what kind of error, and lets me fix it.
10. As a learner, I want the AI to refuse to translate my assigned texts or write my tasks, even when I ask.
11. As a learner preparing for an exam, I want the course ordered by the exam's specification and a mock as the capstone.
12. As a learner, I want shadowing and recording steps, since the agent cannot hear me.

Stories shared with dojo (token estimates, the site and done button, the ledger, checkpoints with predicted and actual scores, hand edits honoured, never overwriting a workspace) hold as written there.

## Implementation Decisions

### Commands

- Seven user-invoked skills, `lingo-plan`, `lingo-next`, `lingo-quiz`, `lingo-talk`, `lingo-coach`, `lingo-review` and `lingo-build`, and one model-invoked root, `lingo`, holding the formats, rules, scripts and templates (ADR 0001).
- `lingo-coach`, `lingo-talk` and `lingo-review` register the shared guard for the rest of the session (ADR 0003). Talk may write only a record in `talk/`, review only a review in `reviews/`.

### Workspace contract

- `profile.md`: the marker, with `lingo`, `language`, `language_code`, `native_language`, the overall `level`, a level per skill, `target_level`, `exam`, hours and dates; the body holds Goal, Prior experience, Focus and Notes.
- `syllabus.md`: IDs `L`, `T`, `C`; types `lesson`, `guided-task`, `task`, `capstone`, `checkpoint`.
- `lessons/`, `tasks/`, `checkpoints/`, `talk/`, `reviews/`; `ledger.md` with a Level column; `quiz-log.md`, `talk-log.md`, `mistakes.md`, `deck.tsv`; `.lingo/` for the scout, fetch log and server.

### Formats

- Lesson: dojo's headings plus `## Words`; prompts labelled Explain, Say or Recall, at least one Explain and one Say; one listening item with a shadowing step; authored budget 800 words at A0 down to 300 at C1; the authored language by placement (ADR 0006).
- Task: Introduction, Model (guided only, with `___` gaps and an Authored or From line), Assignment, Extra credit, Rules (fixed), Done when; `skills` in frontmatter.
- Checkpoint: script-written; prompts and up to ten words by meaning; N counts both.
- Talk record: date, scope, turns; up to five corrections; a focus line. Filed by `talk-log.ts`.
- Writing review: the text with `[n]` markers; at most eight marks with code, hint and status; never the fix.

### Talk

Prompt for a taught structure, recast otherwise or after one failed prompt; one correction per turn; more prompts at A0 to A2; an explicit closing summary filed as mistakes (ADR 0004).

### Research

Budgets as dojo's (lesson 8 and 12, task 4 and 6, syllabus 16 and 24). Structure sources: an exam's specification, a national institute's curriculum, the most endorsed free course's order, the CEFR descriptors. The scout reads subreddit wikis, Reddit and Hacker News. Target-language text the model writes is checked against fetched references and labelled.

## Testing Decisions

The seams are dojo's: script command lines tested with Node's runner against a fixture workspace (an A2 Mexican Spanish course), and plugin evals seeded from the same fixture. The evals cover talk prompting first, talk refusing a translation, the guard in a talk session, review withholding fixes, coach refusal and an expensive lesson generation.

## Out of Scope

- Hearing the learner: no speech recognition or pronunciation scoring.
- A scheduler of lingo's own; Anki does it.
- Paid resources, and requiring a tutor.
- A placement test.
- Lesson zero and fixed lines in languages other than English.
- Measured token runs; the table is carried from dojo until runs exist.
