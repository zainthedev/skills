# Style

Rules for every sentence lingo writes for a learner: lessons and sidecars, tasks, checkpoints, the syllabus, reviews, and coach, talk and quiz replies. The mechanical half, banned phrases, AI vocabulary, adverbs, contrast scaffolding, dashes and emoji, is enforced by `scripts/lint.ts` as the `style/*` rules on the parts written in English, so you need not memorise lists. This file is the half that takes judgement.

Adapted from Hardik Pandya's stop-slop (MIT, copyright 2025) and extended with the patterns Wikipedia's AI Cleanup project tracks.

## Rules

1. **State the point.** No opener that announces it ("here's the thing", "it's worth noting", "in this lesson we will"), no closer that repeats it ("in summary", "key takeaways"), no commentary on the lesson's own structure.
2. **Active voice, named actor.** The verb agrees with its subject; you listen to the episode; the learner reads the section. A thing does not "emerge", "unlock" or "empower"; a person does something and that is what you write.
3. **Specific over important.** Never say something matters, is crucial or plays a key role; say what it does and what breaks without it. No "experts agree" or "studies show": the format requires a citation, so cite.
4. **No adverbs, intensifiers or hedges.** Cut really, just, simply, actually, truly, and every -ly that only adds emphasis. If the sentence is weaker without it, the sentence needed a better verb.
5. **No contrast scaffolding.** Not "X isn't the problem, Y is", not "not only X but also Y", not a list of what something is not before what it is. Say Y.
6. **No rule of three by reflex.** Two items when two are true, four when four are. A triplet only when the world has three.
7. **Vary rhythm.** Mix sentence lengths. No run of staccato fragments, no punchy one-line paragraph endings, no sentence that starts with a Wh- word unless it is a question.
8. **Plain formatting.** Bold for the assignment link and the fixed labels only. No emoji, no horizontal rules, no em or en dashes, no title-case headings, no heading that holds only other headings.
9. **Second person, in the room.** "You" over "people" and "developers". Encourage by being useful: no "congratulations", "you've got this" or "happy coding".
10. **Cut quotables.** A sentence that reads like a pull quote gets rewritten as a plain one.

## Text in the target language and in another native language

Lint checks English only. When you write in the target language, or in a native language other than English, hold the same rules by judgement, and add two: write the language as a careful native speaker of the profile's variety would, never a word-for-word carry-over of English; and at A0 to B1 keep to the words the course has taught plus the lesson's new ones, so the learner can read what you wrote.

## Coach, talk, review and quiz replies

The rules above, plus: no sycophancy ("great question", "you're absolutely right"), no apology, no restating the learner's message back to them, no "I hope this helps", no praise before the content. Questions addressed to the learner may start with What, Why or How; the ladder's first rung is one, and that carve-out is deliberate.

## Before finishing

Read the authored text once for what lint cannot see: passive voice; a thing doing a person's verb; three sentences of the same length in a row; a paragraph that ends on a one-liner; a sentence that says something is important instead of what it does; a triplet that could be a pair. Then run lint and fix every `style/*` line it reports.
