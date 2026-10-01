---
status: accepted
---
# The AI converses in the target language and never translates or writes for the learner

dojo keeps the AI to planning, a hint-only coach and a quiz, because a model that writes the learner's code removes the learning (Bastani 2025, in dojo's evidence). A language has a harm of the same shape: a model that translates the assigned text, writes the learner's message or corrects their sentence before they try. It also has a need dojo does not: interaction. Learners who interact outperform those who do not (Mackey and Goo 2007), and most self-taught learners have no one to talk to.

So lingo adds one role, `/lingo-talk`, a conversation partner in the target language with fixed rules (AI-RULES.md, ADR 0004), and keeps the hard line elsewhere: no translation of assigned input, no writing of a task's text, no corrected version of the learner's writing. A single word's meaning is allowed, because a dictionary is open book and refusing it would push the learner to a translator.

## Considered options

- **dojo's stance, coach only.** Rejected: it leaves out the one practice the evidence most supports and the learner can least get alone.
- **A tutor that explains and translates on demand.** Rejected for the same reason dojo rejects one: it replaces the reading and the producing.

## Consequences

- Talk is guarded like the coach (ADR 0003) and graded by evals that check it prompts rather than corrects, and that it refuses a translation.
- Chatbot meta-analyses report medium effects on language learning with novelty and bias caveats (evidence section 3), so nothing in lingo counts talk sessions as progress; checkpoints and tasks do.
