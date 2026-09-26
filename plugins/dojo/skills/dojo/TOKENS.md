# Token estimates

Quote the **Weighted** column: fresh input + 0.1 x cache reads + 5 x output, in input-token equivalents, the figure to compare options by and to multiply by your model's input price for a rough cost. The estimates come from headless runs on 2026-09-26 with Opus 5.5 as the session model and Haiku 4.5 for fetch summaries, one run per measured cell, research subagent included. Cells marked estimate take the nearest measured cell, scaled by the beginner or advanced ratio seen at standard depth for lessons, and rounded. The scout is a script and costs no model tokens.

| Artifact | Depth | Level | Weighted | Basis |
|----------|-------|-------|----------|-------|
| syllabus | quick | beginner | 560k | estimate |
| syllabus | quick | intermediate | 560k | measured |
| syllabus | quick | advanced | 560k | estimate |
| syllabus | standard | beginner | 420k | estimate |
| syllabus | standard | intermediate | 420k | measured |
| syllabus | standard | advanced | 420k | estimate |
| syllabus | deep | beginner | 680k | estimate |
| syllabus | deep | intermediate | 680k | measured |
| syllabus | deep | advanced | 680k | estimate |
| lesson | quick | beginner | 250k | estimate |
| lesson | quick | intermediate | 210k | measured |
| lesson | quick | advanced | 240k | estimate |
| lesson | standard | beginner | 260k | measured |
| lesson | standard | intermediate | 220k | measured |
| lesson | standard | advanced | 250k | measured |
| lesson | deep | beginner | 320k | estimate |
| lesson | deep | intermediate | 270k | measured |
| lesson | deep | advanced | 300k | estimate |
| project | quick (always) | beginner | 360k | estimate |
| project | quick (always) | intermediate | 360k | measured |
| project | quick (always) | advanced | 360k | estimate |
| checkpoint | any | beginner | 170k | estimate |
| checkpoint | any | intermediate | 170k | measured |
| checkpoint | any | advanced | 170k | estimate |

An independent project has no starter and should sit nearer a lesson; it is unmeasured. A six-section course at standard depth, three lessons, one project and a checkpoint per section, is roughly 8M weighted tokens: near 1.3M per section plus the syllabus, spread over the weeks the learner takes.

## The measured runs

Token columns are the session transcript plus the research subagent's transcript, because the usage Claude Code reports for a headless run covers the main session only. **Cost USD** is the figure Claude Code reported and covers the main session only, so it undercounts every run with a research pass; the ten runs reported USD 14.09 together.

| Artifact | Depth | Level | Fresh input | Cache reads | Output | Weighted | Cost USD |
|----------|-------|-------|-------------|-------------|--------|----------|----------|
| syllabus | quick | intermediate | 125,654 | 3,026,990 | 25,755 | 557,128 | 2.14 |
| syllabus | standard | intermediate | 113,912 | 1,712,009 | 26,306 | 416,643 | 1.90 |
| syllabus | deep | intermediate | 138,550 | 3,347,970 | 40,871 | 677,702 | 2.88 |
| lesson | quick | intermediate | 59,408 | 920,578 | 12,090 | 211,916 | 0.88 |
| lesson | standard | beginner | 71,339 | 1,052,045 | 16,845 | 260,769 | 1.12 |
| lesson | standard | intermediate | 60,117 | 954,245 | 13,105 | 221,067 | 0.92 |
| lesson | standard | advanced | 66,937 | 1,007,394 | 16,238 | 248,866 | 1.05 |
| lesson | deep | intermediate | 66,822 | 1,211,694 | 16,312 | 269,551 | 1.11 |
| project | quick (always) | intermediate | 75,635 | 1,833,852 | 19,668 | 357,360 | 1.40 |
| checkpoint | any | intermediate | 55,584 | 728,963 | 8,845 | 172,705 | 0.70 |

What they say:

- **A lesson costs 210k to 270k weighted tokens whatever you choose.** Depth is a cap on searches and fetches that the pass rarely reaches, and level changes the authored budget by a few hundred words, so neither moves the total much.
- **A syllabus costs 420k to 680k.** Quick came out above standard, which is single-run noise: the scout's yield and the number of pages the pass opens vary more than the depth setting does.
- **A completion project costs about 360k** because it writes a starter.
- **A checkpoint costs about 170k** with no research pass at all; the cost is reading the sampled lessons and answers and writing the file.
- **Cache reads are four fifths of the weighted cost** in every cell, which is why the pass reads a digest and fetches extracts (ADR 0013).

Each run was a headless `claude -p` session in a fresh temporary workspace, with the plugin loaded from a checkout, the artifact checked by `lint.ts` before it counted, and usage summed with `measure.ts` over the session and subagent transcripts. A maintainer repeats that by hand when the models or the skills change and updates both tables with the date and model.

## Actuals

`dojo-plan` and `dojo-next` print the run's actual usage at the end:

```bash
node <dojo root>/scripts/measure.ts --since <ISO timestamp>
```

The transcript it reads is Claude Code's; on other harnesses the script says so and the harness's own usage display is the number to report.
