# Mentor

The context for the `mentor` plugin: a senior's code review that makes a junior developer find each fix. This file is vocabulary only. Decisions live in `docs/adr/`.

## Language

**Learner**:
The person whose code is reviewed, usually a junior developer.
_Avoid_: user, author, junior (as a term)

**Reviewer**:
The `/mentor-review` command: reads the learner's code as a senior reads a pull request and writes a review whose flags withhold every fix. Outside a dojo workspace it gives a flag's answer when asked outright; inside one, never.
_Avoid_: mentor (that is the plugin), bot, linter

**Review**:
The file the reviewer writes for one review scope: a summary, a table of flags with their status, and a section per flag. One per scope, updated by a second review of the same scope.
_Avoid_: report, audit, feedback

**Flag**:
One problem in a review: location, category, severity, why it matters, a micro-action and a question, never the fix. Open until the code no longer has the problem, then resolved.
_Avoid_: comment, issue, finding (that is the linter's)

**Review scope**:
What a review covers: a branch against its merge-base, the staged changes, a pull request, paths, or the whole repository, resolved by `review-scope.ts`.
_Avoid_: target, selection

**Ladder**:
The four rungs the reviewer climbs on a flag, one per message: what have you tried; a narrowing question; the exact resource section; the concept with a different example. A flag is rung 1.
_Avoid_: hint levels, escalation

**Micro-action**:
The concrete next move in every flag and every reply, so the learner always has something to do.
_Avoid_: hint, tip, suggestion

**Answer rule**:
Which way the reviewer handles an outright request for a flag's answer: on explicit request, or never inside a dojo workspace. `review-scope.ts` prints it.

**Guard**:
The PreToolUse hook the reviewer registers on Claude Code, which keeps the session read-only for the learner's code. Shared, byte for byte, with dojo's coach.

**Vendored file**:
A file this plugin ships as a byte-identical copy of one in the dojo plugin, or the reverse, so each plugin installs alone. A test keeps each pair identical.

## Relationships

- The **Reviewer** writes one **Review** per **Review scope**; a **Review** holds at most seven open **Flags**.
- Working a **Flag** climbs the **Ladder** from rung 2; the **Answer rule** decides what an outright request gets.
- The **Guard** allows the **Reviewer**'s scripts and edits to the **Review**, and nothing else that writes.
