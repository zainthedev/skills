# Lingo

The context for the `lingo` plugin: it turns a language and a learner's goal into an Odin-Project-style course the learner works through mostly without AI, with an AI conversation partner held to fixed rules. This file is vocabulary only. Decisions live in `docs/adr/`, the design in `docs/spec.md`, the evidence in `docs/evidence.md`. Terms lingo shares with dojo (workspace, learner, syllabus, section, item, ledger, scout, rubric, sidecar, retrieval prompt, prediction question, checkpoint, coach, ladder, micro-action, digest, site) mean what `../dojo/CONTEXT.md` says, with the differences below.

## Language

### The learner

**Target language**:
The language the course teaches, with its variety, recorded as `language` and `language_code` in the profile.
_Avoid_: L2 in learner-facing text, foreign language

**Native language**:
The language the learner explains things in, and the language lessons start in.
_Avoid_: L1 in learner-facing text, mother tongue

**Placement**:
The CEFR level, A0 to C1, the learner reports for each of listening, reading, speaking and writing, with an overall level derived from them. Self-report, never a test.
_Avoid_: level test, assessment, proficiency (as a measurement)

**Target level**:
The CEFR level the course aims at, checked against the hours.
_Avoid_: fluency

### The course

**Lesson**:
As in dojo, plus a Words table, and authored text that moves from the native into the target language as the placement rises.

**Words**:
The table of eight to twenty words a lesson teaches: word, reading, meaning, example, with the ledger source they come from. Exported to the deck.
_Avoid_: vocab list, flashcards

**Reading**:
The pronunciation aid in a Words row: a reading in the learner's script, a romanisation or a stress mark, or `-`.
_Avoid_: transliteration (too narrow)

**Input**:
Listening and reading at or just above the learner's level, which the Assignment sends them to.
_Avoid_: content, media

**Shadowing**:
Repeating native audio sentence by sentence in the speaker's rhythm, and recording yourself to compare.

**Task**:
A communicative job with an outcome another person could check, specified as requirements. The language course's project.
_Avoid_: project, exercise, assignment (that is a lesson section)

**Guided task**:
A task that starts from a model text with gaps the learner fills. Given at A0 and A1 before the independent task.
_Avoid_: completion project, worksheet

**Capstone**:
The final task, derived from the goal; a timed mock when the goal names an exam.

**Deck**:
`deck.tsv`, every lesson's Words as Anki notes. Anki schedules the reviews.
_Avoid_: SRS (lingo has none of its own)

### Practice and records

**Talk**:
The `/lingo-talk` conversation in the target language at the learner's level, with one correction per turn: a prompt when the course taught the structure, a recast otherwise.
_Avoid_: tutor, chat, roleplay (a talk may hold one)

**Prompt (feedback)**:
A move that makes the learner repair an error: a clarification request, a repetition, a short clue. Distinct from a retrieval prompt.
_Avoid_: hint

**Recast**:
Saying back what the learner meant, with the error corrected, without comment.

**Talk record**:
The file a talk leaves in `talk/`: the scenario, up to five corrections, and what to practise next. No transcript.
_Avoid_: transcript, session log

**Mistakes**:
`mistakes.md`, every correction from talk records, recycled by the quiz until cleared.
_Avoid_: error log

**Writing review**:
The file `/lingo-review` leaves in `reviews/`: the learner's text with numbered marks, each a code and a hint, never the fix.
_Avoid_: correction, code review (that is mentor's)

**Error code**:
One of a fixed list (agreement, verb-form, tense, mood, word-order, word-choice, article, preposition, spelling, accent, missing-word, extra-word, register, punctuation) that names what a mark is about.

## Relationships

- A **Workspace** holds one **Syllabus**, one **Ledger**, one **Deck**, the **Mistakes** and the learner's profile with its **Placement**.
- A **Section** is **Lessons**, then **Tasks**, then a **Checkpoint**. A **Lesson** carries **Words**, which go to the **Deck**, the **Checkpoint** and the **Quiz**.
- A **Talk** leaves a **Talk record**; its corrections go to **Mistakes**; the **Quiz** recycles them.
- A **Writing review** marks a text the learner wrote for a **Task**; the learner fixes it and asks for the next round.
- The overall **Placement** decides which parts of a lesson are in the **Native language** and which in the **Target language**.

## Flagged ambiguities

- "prompt" meant a retrieval prompt and a feedback move. Resolved: **Retrieval prompt** in lessons; **Prompt (feedback)** in talk, and the skill text says "prompt the learner to repair" for the second.
- "level" meant dojo's beginner to advanced and the CEFR. Resolved: lingo uses only CEFR levels.
- "review" meant mentor's code review, dojo's retired term and lingo's writing feedback. Resolved: **Writing review** here; dojo still does not use the word.
