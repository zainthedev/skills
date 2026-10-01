---
status: accepted
---
# Talk prompts before it recasts, one error per turn

How should a conversation partner correct? The evidence (section 3) points to a mix. Prompts, a clarification request, a repetition, a short clue, make the learner repair the error and gave larger effects than recasts (Lyster and Saito 2010); recasts were common and rarely led to repair (Lyster and Ranta 1997); low-proficiency learners gained more from prompts while higher-proficiency learners gained from both (Ammar and Spada 2006); explicit feedback helps most in the short term and implicit feedback lasts (Li 2010); and in text chat a recast alone often goes unnoticed (Akbar).

So talk corrects at most one error per turn. When a lesson the learner has seen teaches the structure, it prompts, with a clue at A0 to A2 that may name the rule. When the structure is new, or one prompt did not lead to repair, it recasts and moves on. It never prompts twice for one error. At the end it gives an explicit summary of up to five corrections, which `talk-log.ts` files in `mistakes.md` and the quiz brings back until the learner gets each right.

## Considered options

- **Recasts only.** Rejected: the least effective for repair, and the most likely to pass unnoticed in text.
- **Correct every error explicitly.** Rejected: it stops the conversation, and focused feedback beats flooding (Ellis 2008).
- **Let the learner choose per session.** Deferred: the mixed rule adapts by level and structure already.

## Consequences

- Talk needs the digest's list of taught structures to decide between a prompt and a recast; `context.ts talk` prints it.
- The talk eval checks that a taught error gets a prompt, not the corrected form.
