---
status: accepted
---
# Talk and review share the coach's guard and may write only their own records

The coach, talk and review sessions must not edit the learner's files. On Claude Code a frontmatter hook registers dojo's shared guard (dojo ADR 0018) for the rest of the session. lingo extends the one guard, byte-identical in dojo, mentor and lingo, in two ways: lingo's scripts are allowed from lingo's own scripts folder, now that two skills ship a `next-item.ts`, `lint.ts` and `context.ts`, and a file tool may write a `.md` file directly inside a lingo workspace's `talk/` or `reviews/`.

A talk record and a review are prose a session must write, and prose cannot pass through a script's arguments without the quotes and parentheses the guard refuses, so a file tool writes them; `talk-log.ts` and `lint.ts` then check them. Nothing else in the workspace is writable from a guarded session: not the lessons, not `mistakes.md`, which only `talk-log.ts` and `quiz-log.ts` change.

## Consequences

- A guard change is a change to three plugins; mentor's and lingo's drift tests catch a missed copy.
- `/lingo-next` and `/lingo-build` need a fresh session after any guarded command, as dojo's do after the coach.
