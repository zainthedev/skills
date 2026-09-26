---
status: accepted
---
# Mechanical items and records are written by scripts

A checkpoint is written by `scripts/checkpoint.ts`, a quiz session's row by `scripts/quiz-log.ts`, and the token estimate a command quotes comes from `next-item.ts`, which reads it from `TOKENS.md`. Every rule in CHECKPOINT-FORMAT.md is mechanical: six to ten prompts split two thirds and one third across two sections, copied verbatim and linked to their section, M as three quarters of N rounded down, one re-read pointer per sampled lesson. Before this, `context.ts` printed every input and the session read the format and STYLE.md, then retyped that output as a file, which lint then checked for the verbatim copy it had just been handed. The measured checkpoint cost 70k weighted tokens for that retyping. The quiz row cost a read and an edit of `quiz-log.md` per session, and the estimate a read of the token table, for one fixed-shape line and one number. Where the work has one right answer, a script does it every time for no model tokens; markdown instructions stay for the work that needs judgement: research, lessons, projects, grading and coaching.

## Considered options

- **Keep the session writing checkpoints from the digest.** Rejected: nothing in the file needs judgement, and the only authored-looking part, the re-read pointer, follows a rule: the lesson's Core idea, or its Assignment without one, and the assignment item the sampled answers cite most.
- **A general `record.ts` for every small workspace write.** Rejected as machinery: two writes have one right shape today, and each gets its own short script.

## Consequences

- A checkpoint costs the session's floor, estimated at 50k and not yet re-measured; `dojo-next` reads no format file for one.
- `context.ts` has no checkpoint digest; asked for one, it names `checkpoint.ts`.
- `checkpoint.ts` refuses to overwrite a checkpoint without `--force`, so a learner's edits survive a rerun, and it stops with the prompt count when the sampled lessons hold fewer than six.
- Lint keeps its checkpoint rules, for hand edits.
- The coach guard allows `context.ts` and `quiz-log.ts`, so a `/dojo-quiz` later in a coach session can print its prompts and record its row, and drops the file-tool exception it had for `quiz-log.md`: no file tool writes the log any more.
