# lingo

Odin-Project-style courses for learning a language, generated into a directory you work through mostly without AI, with one exception: a conversation partner that corrects you by making you fix your own errors.

`lingo` is [dojo](../dojo) for languages. It asks what you can already do in listening, reading, speaking and writing, places each on the CEFR, researches how the language is taught and which free resources learners actually recommend, and writes a syllabus of themed sections. Each lesson orients you briefly, gives you eight to twenty high-frequency words, and sends you to free listening and reading at your level. Tasks are things people do with a language: leave a voice message, write to a landlord, order dinner. Checkpoints ask you prompts and words from memory. The words go to Anki. `/lingo-talk` gives you someone to talk to who will not translate for you or write your messages, and `/lingo-review` marks the errors in your writing without fixing them.

## Quick start

1. Install the skills for your agent (below). You need Node 24 or newer, or Bun, on your PATH, and [Anki](https://apps.ankiweb.net/) for the word reviews.
2. Open your agent in a directory for your courses:

   ```bash
   mkdir -p ~/courses && cd ~/courses && claude
   ```

3. Run `/lingo-plan <language>`, such as `/lingo-plan Mexican Spanish` or `/lingo-plan Japanese`. It asks one round of questions: your variety, native language, goal, what you can do now in each skill, which skills matter most, hours per week and a target date. It states what each item costs in tokens, warns if the target does not fit your hours, researches for a few minutes and writes the course.
4. It starts the course's site and prints its address. Read "How this course works" first.
5. `/lingo-next` generates the first lesson. Import `deck.tsv` into Anki, do the assignment, mark the lesson done on the site. Then `/lingo-talk` to practise, `/lingo-review` on what you write for a task, `/lingo-quiz` to test recall, `/lingo-coach` when stuck, and `/lingo-next` for the next item. After a restart, `/lingo-build` starts the site again.

## Install

Like dojo: on Claude Code use the plugin, which carries the hooks; on every other agent use skills.sh.

```bash
claude plugin marketplace add zainthedev/skills
claude plugin install lingo@zainhill
```

```bash
npx skills@latest add zainthedev/skills --skill lingo --skill lingo-plan --skill lingo-next --skill lingo-talk --skill lingo-review --skill lingo-quiz --skill lingo-coach --skill lingo-build
```

Take all eight: `lingo` holds the scripts and formats the other seven run on. lingo installs without dojo.

## Commands

| Command | What it does |
|---------|--------------|
| `/lingo-plan <language> [dir]` | One round of questions with per-skill placement, research, then a syllabus and the course's site, running |
| `/lingo-next [ID]` | Asks which earlier items you finished, then generates the next lesson, task or checkpoint, and refreshes the Anki deck |
| `/lingo-talk [ID, section or topic]` | A conversation in the language at your level, on what you are studying; one correction per turn; a summary at the end that feeds your quizzes |
| `/lingo-review <file or text> [task ID]` | Marks up to eight errors in your writing with a code and a hint, never the fix; run it again after you fix them |
| `/lingo-quiz [ID or section]` | Prompts, words and your own past mistakes, graded after each attempt |
| `/lingo-coach [what you're stuck on]` | Hints and questions up a four-rung ladder; never the answer |
| `/lingo-build [dir]` | Starts the course's site again |

On Claude Code the namespaced form is `/lingo:lingo-plan`; Codex uses `$lingo-plan`.

## How talk corrects you

The research on corrective feedback points to a mix rather than one style (see [docs/evidence.md](docs/evidence.md)). Prompts that make you repair an error yourself, such as a "¿Perdón?", a repetition of what you said with a questioning tone, or a short clue, gave larger effects than recasts, where the partner says it back correctly. Beginners gain more from prompts, and recasts do more as you climb. Explicit correction helps in the short term, implicit correction lasts. So talk:

- corrects at most one thing per turn, the current lesson's structures first;
- prompts you to fix an error on something the course has taught, with a clue at A0 to A2;
- recasts an error on something you have not met yet, or after one prompt you could not answer;
- ends with up to five corrections, which go into `mistakes.md` and come back in `/lingo-quiz` until you get them right.

It never translates your assigned reading or listening, never writes a task's text for you, and tells you one word's meaning when you ask, as a dictionary would.

## What it refuses to do, and why

Learners who let a model do the work score better on practice and worse alone afterwards (dojo's evidence). For a language that work is translating, writing and correcting before you try. So the AI plans, curates and writes orientation text with citations; during learning it talks, coaches, reviews and quizzes under the rules above. Coach, talk and review sessions are read-only for your files on Claude Code, enforced by the same tool-level guard dojo's coach uses; talk may write only its record and review only its review. On other agents each command holds the rule by instruction.

lingo cannot hear you. Speaking practice is shadowing and recording yourself against native audio, talk in writing, and a person when you can find one: a tutor or a free language exchange.

## What a workspace holds

| File | Purpose |
|------|---------|
| `profile.md` | Your language, variety, per-skill placement, target level, goal and time; the marker that makes a directory a workspace |
| `syllabus.md` | Sections of lessons, tasks and checkpoints, with status. The single record of progress |
| `00-how-this-works.md` | The rules of the course, including the AI rules |
| `ledger.md` | Every resource considered, its score, its evidence, its CEFR level and where it is used |
| `lessons/`, `tasks/`, `checkpoints/` | One Markdown file per item; lessons have a sidecar `.answers.md` |
| `deck.tsv` | Every lesson's words, ready for Anki's File, Import |
| `talk/`, `talk-log.md`, `mistakes.md` | Talk records, one row per talk, and the corrections the quiz recycles |
| `reviews/` | Writing reviews, one file per round |
| `quiz-log.md` | One row per quiz session |
| `site/` | The rendered site; safe to delete and rebuild |

## Lesson language

Lessons start in your native language and move into the language you are learning: everything authored is native at A0 to A2; at B1 the overview, assignment lines, prompts and answers are in the target language while the introduction and core idea stay native; from B2 it is all target language. Lesson zero and the fixed labels stay in English.

## Tokens

Generation costs tokens; learning does not, apart from talk, review and quiz sessions, which cost what the conversation costs. The estimates in [skills/lingo/TOKENS.md](skills/lingo/TOKENS.md) are carried from dojo's measured runs until lingo's own exist: about 250k weighted tokens a lesson, 200k a task, 40k a checkpoint.

## Layout

```
skills/lingo/        formats, STYLE.md, TOKENS.md, scripts/, templates/  (the shared root)
skills/lingo-plan/   one folder per command, each with agents/openai.yaml for Codex
skills/lingo-next/
skills/lingo-talk/
skills/lingo-review/
skills/lingo-quiz/
skills/lingo-coach/
skills/lingo-build/
hooks/               hooks.json: the WebFetch hook that records fetches
tests/               node --test suite and the Spanish fixture course
evals/               claude plugin eval cases
docs/                spec, ADRs, evidence
```

Several scripts are byte-identical copies of dojo's, and the guard is shared with dojo and mentor; `tests/vendored.test.ts` fails when a copy drifts ([ADR 0001](docs/adr/0001-lingo-is-its-own-plugin-and-vendors-dojos-generic-scripts.md)).

## Design

- [CONTEXT.md](CONTEXT.md): the vocabulary.
- [docs/spec.md](docs/spec.md): the design.
- [docs/adr](docs/adr): every decision with a trade-off.
- [docs/evidence.md](docs/evidence.md): the language-learning research behind it, with citations; the general learning science is dojo's.

## License

MIT. The style rules and word lists come from dojo, which adapts Hardik Pandya's MIT-licensed stop-slop. The CEFR descriptors in the placement table are adapted from the Council of Europe's self-assessment grid.
