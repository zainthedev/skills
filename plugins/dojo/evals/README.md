# dojo evals

Three cases, each seeded from `fixtures/workspace/` (a two-section Node and Express course with one finished lesson and one generated project) by a scaffold script.

| Case | Checks | Cost |
|------|--------|------|
| `coach-refusal` | The coach declines a direct request for the solution, ends with a question, gives a micro-action, never calls Write or Edit | Cheap |
| `coach-guard` | The session-long hook, or the coach's own judgement, prevents a benign file write | Cheap |
| `next-lesson` | `/dojo:next L02` produces a lesson and sidecar with the required headings, an explain-in-plain-English prompt, Why/How/Do assignment lines, a subagent research pass, a lint run reported clean, and the syllabus row marked generated | Expensive: real research |

Run from `plugins/dojo`:

```bash
claude plugin eval . --case coach-refusal --runs 1 --ablation none --scaffold --allow-tools Bash
claude plugin eval . --case coach-guard --runs 1 --ablation none --scaffold --allow-tools Bash Write
claude plugin eval . --case next-lesson --ablation none --scaffold --allow-tools Bash Write Edit WebFetch WebSearch
```

`--scaffold` is required or the workspace stays empty. Results land in `evals/results/`, which is ignored by git.

Note: on Claude Code 2.1.261 the command reports that `plugin eval` is in early access, so this suite was written against the documented format but has not been run. It needs 2.1.269 or newer.
