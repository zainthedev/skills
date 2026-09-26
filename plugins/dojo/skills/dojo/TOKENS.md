# Token estimates

**Status: provisional.** These numbers are reasoned estimates from the size of each research pass, not measurements. Replace them by running the benchmark (below) and commit the regenerated table. Until then, trust the ratios more than the absolute values.

## How to read the table

Generation runs as a subagent that reads the workspace, searches, fetches pages, and writes files. Its cost is dominated by re-reading its own growing context on every turn, which Claude bills as cache reads at a tenth of the price of fresh input. So the table gives three raw counts and one comparable number:

- **Fresh input**: tokens read for the first time.
- **Cache reads**: tokens re-read from the prompt cache.
- **Output**: tokens the model wrote, including reasoning.
- **Weighted**: fresh input + 0.1 x cache reads + 5 x output, in input-token equivalents. Use this column to compare options; multiply by your model's input price per token for a rough cost.

Level barely moves the numbers: the authored budget differs by a few hundred words between beginner and advanced. The one exception is a beginner completion project, whose starter adds roughly a third to the project row.

## Estimates per artifact and depth

| Artifact | Depth | Budget (searches / fetches) | Fresh input | Cache reads | Output | Weighted | Relative |
|----------|-------|-----------------------------|-------------|-------------|--------|----------|----------|
| Checkpoint | any | none | 15k | 100k | 3k | 40k | 1x |
| Project | quick (always) | 4 / 6 | 30k | 300k | 5k | 85k | 2x |
| Lesson | quick | 4 / 6 | 40k | 500k | 6k | 120k | 3x |
| Lesson | standard | 8 / 12 | 60k | 1.0M | 8k | 200k | 5x |
| Lesson | deep | 15 / 25 | 100k | 2.5M | 10k | 400k | 10x |
| Syllabus | quick | 8 / 12 | 70k | 1.2M | 10k | 240k | 6x |
| Syllabus | standard | 16 / 24 | 120k | 2.5M | 14k | 440k | 11x |
| Syllabus | deep | 30 / 50 | 200k | 5.5M | 18k | 840k | 21x |

A whole course at standard depth, six sections of three lessons and one project plus checkpoints, comes to roughly 5M weighted tokens spread over the weeks you take to work through it, since items are generated on demand.

The scout is not in the table: it is a script, and costs no model tokens.

## Actuals

`plan` and `next` print the run's actual usage at the end by summing the session transcript:

```bash
node <dojo root>/scripts/measure.ts --since <ISO timestamp>
```

Subagent usage is reported separately when the transcript records it. The transcript is Claude Code's; on other harnesses the script says so and the harness's own usage display is the number to report.

## Regenerating this table

The benchmark, run from `plugins/dojo`, runs each artifact at each depth and level headlessly, in a temporary workspace, and rewrites this file from the reported usage. It spends real tokens, roughly the sum of the table times the number of runs.

```bash
node skills/dojo/scripts/benchmark.ts --plugin . --out skills/dojo/TOKENS.md --runs 1
node skills/dojo/scripts/benchmark.ts --plugin . --out /tmp/tokens-preview.md --dry-run
```

Record the date and model in the regenerated header, and keep the previous table in git history for comparison.
