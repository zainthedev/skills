# Writing review format

A **writing review** marks errors in a text the learner wrote, each with a code and a hint, and never gives the corrected form. The learner fixes the text and asks for the next round. Focused, coded marking that leaves the repair to the learner is what the evidence on written feedback supports (`docs/evidence.md` section 3).

File: `reviews/<item ID or "free">-<slug>-r<round>.md`, for example `reviews/T02-weekend-message-r1.md`. `/lingo-review` writes it with a file tool; on Claude Code the guard allows a `.md` file directly in the workspace's `reviews/` and nothing else.

```md
---
item: T02
round: 1
date: 2026-10-04
---
# Review: Weekend message to Ana

## Text

> ¡Hola Ana! El sábado yo voy [1] al mercado con mi hermano. Ayer nosotros comimos en un restaurante muy bueno, se llama [2] La Tía. ¿Quieres venir con nosotros en domingo [3]?

## Marks

| # | Where | Code | Hint | Status |
|---|-------|------|------|--------|
| 1 | yo voy | register | The pronoun adds emphasis here. Do you want to stress "I"? | open |
| 2 | se llama | punctuation | Two sentences are joined by a comma. Where does the first one end? | open |
| 3 | en domingo | preposition | How does L02 say "on Sunday"? | open |

## Next step

Fix each open mark in your own text, then run `/lingo-review` again with the new version.
```

## Rules

- **Text** quotes the learner's text exactly, as a blockquote, with `[n]` after each marked span. Nothing in it is corrected.
- **Marks** has exactly the columns `# | Where | Code | Hint | Status`, numbered from 1. At most eight marks per round: errors in the current section's structures first, then errors that block meaning. Leave the rest for a later round.
- **Code** is one of: agreement, verb-form, tense, mood, word-order, word-choice, article, preposition, spelling, accent, missing-word, extra-word, register, punctuation.
- **Hint** is a question or a pointer to a lesson, a Words row or a resource section, in the feedback language AI-RULES.md gives. It never contains the corrected word, form or sentence. At A0 and A1 the hint may name the rule; from A2 it asks a question.
- **Status** is `open`, `fixed` or `wontfix`. In a later round, carry the earlier marks over with their new status, and add new marks after them, still eight open at most.
- **Next step** tells the learner what to do with the open marks.
- Run `node <lingo root>/scripts/lint.ts <workspace> reviews/<file>.md` and fix every error before reporting.
