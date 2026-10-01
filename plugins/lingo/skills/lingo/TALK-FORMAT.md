# Talk record format

A **talk record** is what one `/lingo-talk` session leaves behind: the scenario, the corrections from its closing summary, and what the next talk should practise. No transcript. `talk-log.ts` files it: one row in `talk-log.md`, one row per correction in `mistakes.md`, which `/lingo-quiz` recycles until the learner gets each one right.

File: `talk/<YYYY-MM-DD>-<slug of the scenario>.md`, for example `talk/2026-10-04-weekend-plans.md`. The talk session writes it with a file tool; on Claude Code the guard allows a `.md` file directly in a lingo workspace's `talk/` and nothing else.

```md
---
date: 2026-10-04
scope: L03
turns: 14
---
# Talk: Weekend plans with a friend

## Corrections

| You wrote | Better | Why | Lesson |
|-----------|--------|-----|--------|
| Ayer yo como pizza | Ayer comí pizza | Preterite for a finished action yesterday; the subject pronoun is optional | L03 |
| Es lunes, ¿estás libre en sábado? | ¿Estás libre el sábado? | Days take el, not en | L02 |

## Focus next

Preterite of ir and ser, which came up twice and were avoided.
```

## Rules

- `scope` is the item ID or section number the talk practised, or `free`. `turns` counts the learner's turns.
- At most five corrections, the ones that matter most for the scope. **You wrote** quotes the learner exactly; **Better** is the corrected phrase, short; **Why** names the rule in a few words, in the feedback language AI-RULES.md gives; **Lesson** is the item that teaches it, or `-` when none does yet.
- The corrections table may be empty when the learner made no error worth one, but the heading stays.
- `## Focus next` is one or two sentences: what the next talk should steer toward.
- Run `node <lingo root>/scripts/talk-log.ts <workspace> talk/<file>.md` once; it lints the record first and refuses one it has already filed.
