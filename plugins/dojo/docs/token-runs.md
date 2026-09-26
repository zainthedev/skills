# Token runs

The measured runs behind `skills/dojo/TOKENS.md`. Each was a headless `claude -p` session in a fresh temporary workspace, with the plugin loaded from a checkout, the artifact checked by `lint.ts` before it counted, and usage summed with `measure.ts` over the session and subagent transcripts. Token columns include the research subagent's transcript, because the usage Claude Code reports for a headless run covers the main session only. **Cost USD** is the figure Claude Code reported and covers the main session only, so it undercounts every run with a research pass; the ten runs reported USD 14.09 together. **Weighted** is fresh input + 0.05 x cache reads + 5 x output: Opus 5.5 bills a cache read at 0.05 of its input price and output at 5 times it (https://platform.claude.com/docs/en/about-claude/pricing). The tables first used 0.1, the rate on most other models, which overstated every run by a fifth to a quarter; every Weighted figure here was recomputed from the same token counts on 2026-09-26.

Run on 2026-09-26, Opus 5.5 as the session model, Haiku 4.5 for fetch summaries, one run per cell. "Depth" was the research budget preset the intake asked for at the time; ADR 0014 removed it, and the standard rows are the budget every pass now uses.

| Artifact | Depth | Level | Fresh input | Cache reads | Output | Weighted | Cost USD |
|----------|-------|-------|-------------|-------------|--------|----------|----------|
| syllabus | quick | intermediate | 125,654 | 3,026,990 | 25,755 | 405,778 | 2.14 |
| syllabus | standard | intermediate | 113,912 | 1,712,009 | 26,306 | 331,042 | 1.90 |
| syllabus | deep | intermediate | 138,550 | 3,347,970 | 40,871 | 510,304 | 2.88 |
| lesson | quick | intermediate | 59,408 | 920,578 | 12,090 | 165,887 | 0.88 |
| lesson | standard | beginner | 71,339 | 1,052,045 | 16,845 | 208,166 | 1.12 |
| lesson | standard | intermediate | 60,117 | 954,245 | 13,105 | 173,354 | 0.92 |
| lesson | standard | advanced | 66,937 | 1,007,394 | 16,238 | 198,497 | 1.05 |
| lesson | deep | intermediate | 66,822 | 1,211,694 | 16,312 | 208,967 | 1.11 |
| project | quick (always) | intermediate | 75,635 | 1,833,852 | 19,668 | 265,668 | 1.40 |
| checkpoint | any | intermediate | 55,584 | 728,963 | 8,845 | 136,257 | 0.70 |

## What they say

- **A lesson costs 166k to 209k weighted tokens whatever the budget or level.** The fetch caps are rarely reached, and level changes the authored budget by a few hundred words, so neither moves the total much. That finding is why the depth question went (ADR 0014).
- **Output is the largest part of the weighted cost, about two fifths; fresh input about a third; cache reads a quarter to a third.** Cache reads are over nine tenths of the tokens but bill at a twentieth of the input price. Every token the pass takes into context is paid as fresh input once and as a cache read on every later turn, which is why the pass reads a digest and fetches extracts (ADR 0013).
- **A completion project costs about 270k** because it writes a starter. **A checkpoint costs about 140k** with no research pass at all.

## What inflated them

A review of the transcripts after the runs found three causes, all since fixed, none yet re-measured:

- The prompt was "Run /dojo-next in the workspace ...", a sentence, not a slash command, and the command skills are user-invoked only, so every run spent turns locating the skill file with directory listings. The checkpoint run spent 49k of its 136k on an exploration agent sent to find it, and that agent was counted as a subagent transcript.
- The quick syllabus run's research pass spent 14 turns, about 80k weighted, trying to clear a `ledger/thin-evidence` warning that fired whenever the flag was true and could not be satisfied. That is why quick came out above standard; it was not single-run noise. The warning now clears once Notes says what was missing.
- The main session read files it did not use: the lesson format, the whole token table, the finished lesson to list its resources, and the research reference. The commands now read the brief template only, quote one row of the token table, and take the resource list from the pass's report.

## Re-measured runs

Same day, same models, with the slash command as the whole prompt (`/dojo:dojo-next L02`, `/dojo:dojo-next C01`), the workspace as the working directory, and the plugin loaded with `--plugin-dir`. Every run produced a lint-clean artifact.

| Artifact | Level | Fresh input | Cache reads | Output | Weighted | Main session | Research pass | Cost USD |
|----------|-------|-------------|-------------|--------|----------|--------------|---------------|----------|
| lesson, run 1 | intermediate | 88,486 | 1,376,651 | 21,050 | 262,569 | 51,439 | 211,130 | 1.41 |
| lesson, run 2 | intermediate | 61,251 | 848,059 | 14,772 | 177,514 | 53,731 | 123,783 | 0.92 |
| checkpoint | intermediate | 25,111 | 304,932 | 2,892 | 54,818 | 54,818 | none | 0.32 |

- **The checkpoint fell from 136k to 55k.** The earlier run's exploration agent and skill hunt were the difference; a checkpoint is now one session of eight messages that reads the digest and writes the file.
- **A lesson's main session fell from 63k to 81k down to 51k to 54k**, seven or eight messages: the next-item line, the token row, the brief, the profile, the pass, and one chained verify command.
- **The research pass varied from 124k to 211k for the same item.** Run 1's pass read the ledger and the previous lesson in full despite the digest, edited its files eight times and ran lint three times; run 2's read the digest and wrote once. That spread is the pass's, not the harness's, and the table quotes the mean.
- **The plugin's fetch hook recorded five of the pass's fetches in run 2**, inside the subagent, which the skill-frontmatter version had not (ADR 0015).

The syllabus and project rows above were not re-measured; they carry the earlier runner's overhead and stand as upper bounds.
