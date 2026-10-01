# Token estimates

Quote the **Weighted** column: fresh input + c x cache reads + 5 x output, in input-token equivalents, where c is the model's cache-read price as a fraction of its input price: 0.05 on Opus 5.5, 0.025 on Fable 5.1 and 0.1 on the rest (Anthropic's pricing page). Output is 5 x input on every current model. It is the figure to compare options by, and times the model's input price it gives a rough cost. Every research pass has one fixed budget, so the table is by item type and level.

No lingo run has been measured yet. Every row is an estimate carried from dojo's measured runs (`plugins/dojo/docs/token-runs.md`) with the same budgets: a lingo lesson does dojo's research plus a Words table, so it sits a little above dojo's lesson; a task has no starter code, so it sits below dojo's project with a starter. Placement moves a lesson by its authored budget, so the rows step down as the level rises.

| Item | Level | Weighted | Basis |
|------|-------|----------|-------|
| syllabus | A0 | 350k | estimate from dojo |
| syllabus | A1 | 350k | estimate from dojo |
| syllabus | A2 | 350k | estimate from dojo |
| syllabus | B1 | 350k | estimate from dojo |
| syllabus | B2 | 350k | estimate from dojo |
| syllabus | C1 | 350k | estimate from dojo |
| lesson | A0 | 260k | estimate from dojo |
| lesson | A1 | 255k | estimate from dojo |
| lesson | A2 | 250k | estimate from dojo |
| lesson | B1 | 245k | estimate from dojo |
| lesson | B2 | 240k | estimate from dojo |
| lesson | C1 | 235k | estimate from dojo |
| task | A0 | 200k | estimate from dojo |
| task | A1 | 200k | estimate from dojo |
| task | A2 | 200k | estimate from dojo |
| task | B1 | 200k | estimate from dojo |
| task | B2 | 200k | estimate from dojo |
| task | C1 | 200k | estimate from dojo |
| checkpoint | A0 | 40k | estimate, script-written |
| checkpoint | A1 | 40k | estimate, script-written |
| checkpoint | A2 | 40k | estimate, script-written |
| checkpoint | B1 | 40k | estimate, script-written |
| checkpoint | B2 | 40k | estimate, script-written |
| checkpoint | C1 | 40k | estimate, script-written |

A six-section course, three lessons, one task and a checkpoint per section, is roughly 6M weighted tokens: near 1M per section plus the syllabus, spread over the weeks the learner takes. Talk, review and quiz sessions are not in the table: each costs what the conversation costs, and a talk of fifteen turns is in the tens of thousands.

## Actuals

`lingo-plan` and `lingo-next` print the run's actual usage at the end:

```bash
node <lingo root>/scripts/measure.ts --since <ISO timestamp>
```

The transcript it reads is Claude Code's; on other harnesses the script says so and the harness's own usage display is the number to report. Measured runs replace the rows above as they come in.
