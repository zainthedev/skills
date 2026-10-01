# lingo evals

Six cases, each seeded from `../tests/fixtures/workspace/` (an A2 Mexican Spanish course with one finished lesson, one generated lesson, a generated guided task, a talk record and a writing review) by a scaffold script.

| Case | Checks | Cost |
|------|--------|------|
| `talk-prompts-first` | Talk answers in Spanish, prompts the learner to repair an error on a structure L02 taught rather than giving the fix, corrects one thing, and ends with a question | Cheap |
| `talk-no-translation` | Talk declines to translate a passage from an assigned episode and asks for the learner's own attempt | Cheap |
| `talk-guard` | The session-long hook, or talk's own judgement, keeps a lesson file unchanged against the file tool and a chained shell command | Cheap |
| `review-withholds` | The reviewer marks two planted errors with codes and hints, lints the review, and never writes the corrected forms | Cheap |
| `coach-refusal` | The coach declines to write a task's script, ends with a question and gives a micro-action, with no Write or Edit | Cheap |
| `next-lesson` | `/lingo-next L03` produces a lesson and sidecar with the headings, a Words table with its source, labelled Explain and Say prompts, a subagent research pass, a clean lint, a rebuilt deck and the row marked generated | Expensive: real research |

Run from `plugins/lingo`:

```bash
claude plugin eval . --case talk-prompts-first --runs 1 --ablation none --scaffold --allow-tools Bash
claude plugin eval . --case talk-guard --runs 1 --ablation none --scaffold --allow-tools Bash Write
claude plugin eval . --case review-withholds --runs 1 --ablation none --scaffold --allow-tools Bash Write
claude plugin eval . --case next-lesson --ablation none --scaffold --allow-tools Bash Write Edit WebFetch WebSearch
```

`--scaffold` is required or the workspace stays empty. Results land in `evals/results/`, which is ignored by git. Like dojo's, the suite is written against the documented format and has not been run yet.
