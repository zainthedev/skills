# Lesson format

A **lesson** orients the learner on one structure or function and a set of words in a few hundred cited words, then sends them to curated input and practice for the rest. Layout adapted from The Odin Project's lesson template; their text is never copied.

File: `lessons/<ID>-<slug>.md`, for example `lessons/L03-the-preterite-for-finished-actions.md`. Sidecar beside it: `lessons/L03-the-preterite-for-finished-actions.answers.md`.

## Frontmatter

```yaml
---
id: L03
title: The preterite for finished actions
section: 2
hours: 3
generated: 2026-10-01
---
```

## Which language the text is in

The authored text moves into the target language as the learner climbs, by the overall `level` in `profile.md`. `context.ts` prints the split for the item.

| Part | A0 to A2 | B1 | B2 and C1 |
|------|----------|----|-----------|
| Introduction, Core idea | native | native | target |
| Lesson overview, Why/How/Do lines, prompts, sidecar answers | native | target | target |

The fixed lines and labels below (`Why:`, `Say:` and the rest) stay as written, in English. Target-language text in a native-language part is fine: examples, quoted words, a phrase to listen for.

## Headings, in this order

`# <title>` then these H2 headings, each required unless marked optional.

1. `## Introduction`: authored. One to three short paragraphs: what the learner will be able to say or understand, and in which situation.
2. `## Lesson overview`: authored. Bullets, at most seven, each a thing the learner will *learn about*, sentence case, ending in a period, never a question.
3. `## Before you start`: the fixed line `Answer these from what you already know. Check them in the sidecar after the assignment.`, then an ordered list of two or three **prediction questions**: guess a form, a meaning, or what a phrase in the input means.
4. `## Core idea`: authored, optional. The pattern in its smallest form: when to use it, how to build it, with at most one fenced example or one small table. When no resource covered the idea well, open with `> **Authored:** no resource covered this well. Written from [<title>](<url>).`
5. `## Words`: the table below, then one line `Source: [<title>](<url>)` naming the ledger resource the words come from: a frequency list, or the assigned text or episode they occur in.

   ```md
   | Word | Reading | Meaning | Example |
   |------|---------|---------|---------|
   | ayer | - | yesterday | Ayer comí con mi hermana. |
   | 昨日 | きのう (kinō) | yesterday | _昨日は雨でした。_ |
   ```

   Eight to twenty rows, none taught by an earlier lesson (the digest lists those). Choose high-frequency words the input in the Assignment uses. **Reading** is the pronunciation aid the learner needs, a reading in the learner's script, a romanisation or a stress mark, or `-` when spelling gives it. **Meaning** is short, in the native language, and unique in the table: the checkpoint and the deck show it alone. **Example** is a sentence from the source when one exists; an example you wrote yourself is in _italics_. `deck.ts` turns every lesson's Words into the Anki deck.
6. `## Assignment`: an ordered list of three to five items, each exactly:

   ```md
   1. **[Descriptive link text](https://example.com/episode-12)**
      Why: one sentence on why it is here.
      How: one sentence on how to consume it (which minutes, at what speed, with or without the transcript).
      Do: one active task to perform with it (shadow the first two minutes, note five sentences that use the pattern, retell it in three sentences).
   ```

   Link text names the thing; "this", "here", "video", "docs", "link" and the like are lint errors. Instructions such as "skip the second half" are sub-bullets. At least one item is listening, and its Do line is shadowing or record-and-compare: play a sentence, pause, say it in the speaker's rhythm, record yourself and listen against the original. Input sits at or just above the learner's level for that skill; say in the How line how to make it comprehensible (transcript first, slower speed, a second listen).
7. `## Retrieval practice`: the fixed line `Attempt each from memory, out loud or on paper, then move on. These return at checkpoints.`, then an ordered list of four to eight **retrieval prompts**, each one line `<Label>: [<prompt>](<target>)`. Label is one of:
   - `Explain`: the learner explains the pattern in their own words (when to use it, how to build it).
   - `Say`: the learner produces the language: answer a question, describe a situation, transform a sentence. Never a sentence-for-sentence translation of a model answer.
   - `Recall`: the learner recalls a word, a form or a fact about usage.

   At least one Explain and one Say. The target is a heading anchor in this lesson (`#core-idea`, `#words`) or a ledger resource URL.
8. `## Additional resources`: optional bullets of ledger resources to explore. Omit the heading when empty.

## Rules

- **Authored budget.** Introduction, Lesson overview and Core idea together: at most 800 words at A0, 700 at A1, 600 at A2, 500 at B1, 400 at B2, 300 at C1. Lint counts whitespace-separated tokens holding a letter or digit, ignoring fenced code and URLs; link text counts.
- **Citations.** Every URL in Introduction and Core idea is in `ledger.md` and was fetched in this run. Every Assignment, Words source and Additional resources URL is in the ledger.
- **Required input lives in Assignment or Additional resources only.** Links in authored sections are citations, not reading.
- **Free only.**
- **Style.** Every authored sentence follows STYLE.md; lint enforces its word and phrase half on the parts written in English.
- **Sidecar.** As many prediction answers as questions, as many retrieval answers as prompts, same numbering. An answer to a Say prompt is one model answer and says that other wordings are right too.

## Sidecar format

```md
---
id: L03
---
# Answers: The preterite for finished actions

## Before you start
1. <answer in one to three sentences>. Source: [SpanishDict: Preterite vs imperfect](https://www.spanishdict.com/guide/preterite-vs-imperfect)

## Retrieval practice
1. <answer>. Source: [<title>](<url or #anchor>)
```

Done when the lesson and sidecar exist and `lint` passes on the lesson.
