---
status: accepted
---
# AI plans and curates; during learning it may only coach

The Odin Project's position is "We do not recommend using AI tools for your learning", and its Discord refuses to debug AI-assisted code. The evidence is narrower than that: in Bastani et al. (2025), unrestricted GPT access raised practice scores and cut the unassisted exam by about 17 percent, while a hint-only tutor raised practice more and left the exam unchanged. So dojo has no tutor mode and no explain-on-demand. The only runtime help is `coach`, which climbs a four-rung ladder of questions and pointers, attaches a concrete micro-action to every question, never produces solution code, partial or full, never edits files, and registers a session-long tool guard the moment it is invoked: a PreToolUse hook that denies file edits and any shell command outside dojo's read-only scripts, so the rule holds mechanically rather than in prose alone. Claude Code's `allowed-tools` only pre-approves permissions and `disallowed-tools` clears after one turn, which is why the guard is a hook, and why a coach session is read-only until you start a new one. The hook exists on Claude Code only; on any other harness the coach holds the same rule by instruction, and lesson zero tells the learner which applies (ADR 0011). `quiz` is the only other runtime role. Lesson zero states this as a deliberate departure from The Odin Project and links the evidence.

## Considered options

- **No AI at all after generation**, The Odin Project's stance. Rejected because the hint-only arm in the evidence shows no harm, and a Claude Code user can open a chat regardless; a guardrailed mode is safer than an unguarded default.
- **Tutor mode**, which is what `teach` does, with lessons that end in "ask the agent". Rejected because it replaces the reading and reopens the answer-copying path the harm comes from.

## Consequences

- A red-team eval demands solutions from the coach and grades refusal. The plugin does not ship if it fails.
- Micro-actions exist because a 2026 study found strictly Socratic bots lose learners to disengagement.
- A German trial found hint-only tutors raise exercise scores but not knowledge gains, so nothing in dojo treats coach usage as learning; only unassisted checkpoints and projects do.
- Full citations in `../evidence.md`.
