# Token estimates

Quote the **Weighted** column: fresh input + c x cache reads + 5 x output, in input-token equivalents, where c is the model's cache-read price as a fraction of its input price: 0.05 on Opus 5.5, the model every measured run used, 0.025 on Fable 5.1 and 0.1 on the rest (Anthropic's pricing page). Output is 5 x input on every current model. It is the figure to compare options by, and times Opus 5.5's input price it gives a rough cost; on another model the same token counts weigh differently. Every research pass has one fixed budget (ADR 0014), so the table is by item type and level.

| Item | Level | Weighted | Basis |
|------|-------|----------|-------|
| syllabus | beginner | 330k | estimate |
| syllabus | intermediate | 330k | measured, earlier runner |
| syllabus | advanced | 330k | estimate |
| lesson | beginner | 240k | estimate |
| lesson | intermediate | 220k | measured, two runs of 180k and 260k |
| lesson | advanced | 230k | estimate |
| project, with a starter | beginner | 270k | estimate |
| project, with a starter | intermediate | 270k | measured, earlier runner |
| project, with a starter | advanced | 270k | estimate |
| checkpoint | beginner | 40k | estimate, script-written |
| checkpoint | intermediate | 40k | estimate, script-written |
| checkpoint | advanced | 40k | estimate, script-written |

A lesson's research pass varies by half between runs of the same item; the main session is a steady 51k to 54k of it. Level moved a lesson by a sixth in the earlier runs, which is where the beginner and advanced estimates come from. An independent project has no starter and should sit nearer a lesson; it is unmeasured. A checkpoint measured 55k when the session wrote it; a script writes it now (ADR 0016), so the session only runs three commands and reports, and 40k is that session's floor, not yet re-measured. A six-section course, three lessons, one project and a checkpoint per section, is roughly 6M weighted tokens: near 1M per section plus the syllabus, spread over the weeks the learner takes.

The runs, on 2026-09-26 with Opus 5.5 and Haiku 4.5 for fetch summaries, are in [docs/token-runs.md](../../docs/token-runs.md). The rows marked "earlier runner" come from runs prompted with the command's name inside a sentence rather than as the slash command, so they carry turns spent locating the skill and are upper bounds; the lesson and checkpoint rows were re-measured with the slash command as the prompt.

## Actuals

`dojo-plan` and `dojo-next` print the run's actual usage at the end:

```bash
node <dojo root>/scripts/measure.ts --since <ISO timestamp>
```

The transcript it reads is Claude Code's; on other harnesses the script says so and the harness's own usage display is the number to report.
