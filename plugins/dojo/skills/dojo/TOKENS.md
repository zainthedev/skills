# Token estimates

**Status: provisional.** Reasoned estimates from the size of each research pass, not measurements. Replace them by running the benchmark (below) and commit the regenerated table. Until then, trust the ratios more than the absolute values.

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

**Weighted** is fresh input + 0.1 x cache reads + 5 x output, in input-token equivalents: the column to compare options by, and to multiply by your model's input price for a rough cost. Cache reads dominate because the research pass re-reads its own context every turn, which is why the pass works from a digest and fetches extracts rather than summaries (ADR 0013). Level barely moves the numbers; a beginner completion project's starter adds about a third to the project row. A whole standard-depth course of six sections comes to roughly 5M weighted tokens, spread over the weeks the learner takes, since items are generated on demand. The scout is a script and costs no model tokens.

## Actuals

`dojo-plan` and `dojo-next` print the run's actual usage at the end:

```bash
node <dojo root>/scripts/measure.ts --since <ISO timestamp>
```

The transcript it reads is Claude Code's; on other harnesses the script says so and the harness's own usage display is the number to report.

## Regenerating this table

From `plugins/dojo`, the benchmark runs each artifact at each depth and level headlessly in a temporary workspace and rewrites this file from the reported usage. It spends real tokens, roughly the sum of the table times the number of runs.

```bash
node skills/dojo/scripts/benchmark.ts --plugin . --out skills/dojo/TOKENS.md --runs 1
node skills/dojo/scripts/benchmark.ts --plugin . --out /tmp/tokens-preview.md --dry-run
```

Record the date and model in the regenerated header, and keep the previous table in git history for comparison.
