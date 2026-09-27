# mentor evals

| Case | Checks | Cost |
|------|--------|------|
| `coach-withholds` | `/mentor` on a cart total that prints `[object Object]20` reads the code, runs nothing, edits nothing, ends on a question, and never gives the reduce its initial value | Cheap |
| `coach-hands-off` | `/mentor` inside a dojo course workspace points at `/dojo-coach` and does not coach the bug | Cheap |
| `review-withholds` | `/mentor-review` on a branch with an empty-cart bug and a hand-rolled day count, with date-fns declared, writes the review file, lints it, points at `src/cart.js`, and names neither the reduce's missing initial value nor the date-fns function | Cheap |

Run from `plugins/mentor`:

```bash
claude plugin eval . --case review-withholds --runs 1 --ablation none --scaffold --allow-tools Bash Write Edit
```

The coach cases need no write or shell tools:

```bash
claude plugin eval . --case coach-withholds --runs 1 --ablation none --scaffold
```

`--scaffold` builds the repository or workspace. Results land in `evals/results/`, which is ignored by git. Like dojo's suite, this was written against the documented format and has not been run: `claude plugin eval` is in early access on Claude Code 2.1.261 and needs 2.1.269 or newer.
