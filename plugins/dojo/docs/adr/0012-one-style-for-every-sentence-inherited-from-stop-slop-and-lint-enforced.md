---
status: accepted
---
# One style for every sentence: inherited from stop-slop, extended, and lint-enforced

Every sentence dojo writes for a learner follows `skills/dojo/STYLE.md`: lessons, sidecars, projects, checkpoints, the syllabus, and coach and quiz replies. The rules inherit Hardik Pandya's stop-slop skill (MIT, 2025), rewritten in dojo's voice, and add the tells that skill predates: the vocabulary Wikipedia's AI Cleanup project tracks for 2025 onward, negative parallelisms and the rule of three, canned significance, vague attribution, formatting habits such as bold overuse and emoji, tutorial openers and closers, and coaching sycophancy. The rules split in two. Judgement, meaning voice, rhythm, false agency and specificity, lives in the style file the passes and the coach read. Mechanics, meaning the phrase list, the vocabulary list, the adverb list, contrast scaffolding, dashes and emoji, live in `scripts/lib/style.ts` and run as lint's `style/*` rules on every authored section, so the model never loads a word list and a slip is caught without spending tokens. The coach keeps one carve-out: questions to the learner may start with a Wh- word, because the ladder's first rung is one.

## Considered options

- **Depend on stop-slop as an installed skill.** Rejected: a teammate without it would get a broken cross-skill call, the skill's name differs per harness, and its lists stop at early 2025.
- **Put the whole rule set in prose and trust the model.** Rejected: the lists are 1,400 words the pass would re-read every turn, and the mechanical half is exactly what a regex holds better than a model.

## Consequences

- Adverbs on the list are warnings, the rest are errors; the brief says fix both. A single "just" does not block an item, but it is reported.
- Two eval graders check the mechanical half on a generated lesson and on the coach's replies.
- Adding a tell is a one-line change to a list in `style.ts`, with a test.
- His copyright notice travels with the adapted text, as the README says for Pocock's.
