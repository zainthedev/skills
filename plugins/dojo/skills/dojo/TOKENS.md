# Token estimates

Quote the **Weighted** column: fresh input + 0.1 x cache reads + 5 x output, in input-token equivalents, the figure to compare options by and to multiply by your model's input price for a rough cost. Every research pass has one fixed budget (ADR 0014), so the table is by item type and level.

| Item | Level | Weighted | Basis |
|------|-------|----------|-------|
| syllabus | beginner | 420k | estimate |
| syllabus | intermediate | 420k | measured, earlier runner |
| syllabus | advanced | 420k | estimate |
| lesson | beginner | 300k | estimate |
| lesson | intermediate | 280k | measured, two runs of 220k and 330k |
| lesson | advanced | 290k | estimate |
| project, with a starter | beginner | 360k | estimate |
| project, with a starter | intermediate | 360k | measured, earlier runner |
| project, with a starter | advanced | 360k | estimate |
| checkpoint | beginner | 70k | estimate |
| checkpoint | intermediate | 70k | measured |
| checkpoint | advanced | 70k | estimate |

A lesson's research pass varies by half between runs of the same item; the main session is a steady 65k to 70k of it. Level moved a lesson by a sixth in the earlier runs, which is where the beginner and advanced estimates come from. An independent project has no starter and should sit nearer a lesson; it is unmeasured. A six-section course, three lessons, one project and a checkpoint per section, is roughly 8M weighted tokens: near 1.3M per section plus the syllabus, spread over the weeks the learner takes.

The runs, on 2026-09-26 with Opus 5.5 and Haiku 4.5 for fetch summaries, are in [docs/token-runs.md](../../docs/token-runs.md). The rows marked "earlier runner" come from runs prompted with the command's name inside a sentence rather than as the slash command, so they carry turns spent locating the skill and are upper bounds; the lesson and checkpoint rows were re-measured with the slash command as the prompt.

## Actuals

`dojo-plan` and `dojo-next` print the run's actual usage at the end:

```bash
node <dojo root>/scripts/measure.ts --since <ISO timestamp>
```

The transcript it reads is Claude Code's; on other harnesses the script says so and the harness's own usage display is the number to report.
