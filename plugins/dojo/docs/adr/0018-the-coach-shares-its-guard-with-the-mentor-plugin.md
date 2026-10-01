---
status: accepted
---
# The coach shares its guard with the mentor plugin

The mentor plugin's `/mentor-review` reviews a learner's code as a senior would and, like the coach, makes its session read-only through a PreToolUse guard (mentor ADR 0001). Both guards stay active for the rest of a session, so with two different guards a learner who ran `/dojo-coach` and then `/mentor-review` would find each blocking the other's scripts. The guard is therefore one file, `skills/dojo/scripts/guard.ts` here and `skills/mentor-review/scripts/guard.ts` there, byte-identical, and it allows each skill's scripts only from that skill's own folder. It moved out of `skills/dojo-coach/` so it can import the shared libraries beside it.

The same guard lets a file tool write one thing: a `.md` review directly inside `.mentor/reviews/` or a workspace's `reviews/`. A review is prose, which cannot pass through a script's arguments without the shell syntax the guard refuses. The coach never writes one; the exception exists for the reviewer.

Inside a workspace the reviewer follows this course's rule and never gives an answer, and `build-site.ts` renders its reviews with a sidebar entry, reading them through mentor's `lib/review.ts`, which dojo carries as a copy.

## Considered options

- **Independent guards.** Rejected: each would block the other, and the learner would need a fresh session between the two commands.
- **A dependency from one plugin on the other.** Rejected: each plugin must install alone, and a skill never reaches into another skill's folder (ADR 0011).

## Consequences

- Seven files ship in both plugins, and the mentor plugin's `tests/vendored.test.ts` fails when a pair differs.
- A guard change is a change to both plugins, and its tests live on both sides: the coach's rules here, the reviewer's in mentor.
- The lingo plugin carries the same guard (lingo ADR 0003). Its scripts share names with dojo's, so the guard allows a listed script from any skill folder whose list holds that name, and it lets a file tool write a talk record or a review in a lingo workspace. A guard change is now a change to three plugins.
