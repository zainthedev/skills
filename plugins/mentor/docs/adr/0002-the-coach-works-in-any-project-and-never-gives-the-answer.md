---
status: accepted
---
# The coach works in any project and never gives the answer

`/mentor` is dojo's coach for any project: the learner brings an error, a bug or a failing test, and the coach climbs the same ladder, one rung per message, each with a micro-action and a question, until the learner states the cause and fixes it. It reads the code, the stack trace and the official documentation, runs nothing, edits nothing, and never gives the fix, even when asked outright. The maintainer chose the coach's rule over the reviewer's answer on request: the coach exists for the learner who wants to learn from the bug, and a session that answers on request is one sentence away from a session that answers.

## Decisions

- **In the mentor plugin, not dojo.** dojo's coach orients on the current lesson with `next-item.ts` and points rung 3 at the lesson's vetted resources, and neither exists outside a course. Making it work anywhere would also mean installing a course to get a coach. The part that travels is the ladder, which the reviewer already climbs on a flag.
- **Rung 3 points at the official documentation** for the version in the project's manifest, found with WebSearch and WebFetch, in place of a lesson's resources.
- **A private diagnosis before rung 1.** The coach forms the likely cause and the experiment that would confirm it before it asks anything, so its questions lead somewhere, and treats the cause as a hypothesis the learner's runs can overturn. Its micro-actions are those experiments.
- **Inside a dojo workspace it hands off** to `/dojo-coach`, which knows the lesson, so each situation has one coach and one rule. It recognises the workspace by a `profile.md` with a `dojo:` key, as the reviewer does.
- **No record.** A coaching session leaves no file behind.
- **The same guard.** The coach registers a byte-identical copy of `guard.ts` from its own `scripts/` folder, with `lib/review.ts` and `lib/frontmatter.ts`, which the guard imports to recognise a dojo workspace. It lists no scripts of its own. The guard still lets the reviewer's scripts and review file through, so `/mentor-review` works in a session that ran `/mentor` first; a coach-only guard would block it.

## Considered options

- **Make `/dojo-coach` work outside a course.** Rejected for the reasons above, and because a command named for a course would read wrong in a project with no course.
- **A mode of `/mentor-review`.** Rejected: the reviewer goes looking and writes a review, the coach starts from the learner's problem and writes nothing, so most of the reviewer's instructions would load for nothing.
- **Answer on explicit request, as the reviewer does.** Rejected by the maintainer.
- **Share `RULES.md` with the reviewer as a vendored file.** Rejected: the two differ on the answer rule and on what a flag may give away, so a shared file would carry both.

## Consequences

- `tests/vendored.test.ts` checks the coach's three copies against the reviewer's, with no dojo checkout needed.
- A change to the ladder or the writing rules is made in both skills' `RULES.md` by hand.
- On harnesses without hooks, the coach holds read-only by instruction, as the reviewer and dojo's coach do.
