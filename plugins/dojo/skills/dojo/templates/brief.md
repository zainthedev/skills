# The research brief

Fill in every `<...>`, then give the block to one subagent where your harness has them (the Agent tool on Claude Code, subagents on Codex, and the like). Where it has none, the brief is yours: do the pass in this session under the same budget, and the first line still binds you. Keep the first line. Budgets: lesson 8 searches and 12 fetches; project 4 and 6; syllabus 16 and 24.

```text
Do this work yourself: do not spawn agents or delegate any part of it.

You are generating one dojo <lesson|project|syllabus> for the workspace at <absolute path>.
Item: <ID> "<title>", section <N>. Level: <level>. Budget: at most <S> web searches and <F> page fetches in total; when the budget is spent, stop researching and say so in your report.

Read first, in this order:
1. <dojo root>/<LESSON-FORMAT.md | PROJECT-FORMAT.md | SYLLABUS-FORMAT.md>
2. <dojo root>/STYLE.md
3. <dojo root>/RUBRIC.md
Then run: node <dojo root>/scripts/context.ts <workspace> <ID>
and work from its output. Open a workspace file only when the digest is not enough.

Research: prefer ledger resources already scored. Add a resource only when the ledger lacks coverage for this item's concepts; score it with the rubric and the scout evidence, and read the excerpt before counting a mention. Fetch every resource you will cite or assign, asking for two things and nothing else: its headings, date or version and any paywall; then the passages on this item's concepts, quoted. Free resources only. Append every fetched URL to <workspace>/.dojo/fetched.jsonl as {"url","fetched_at","item"}; where the harness records fetches itself as well, the duplicate is harmless.

Write the files the format names, update ledger.md (new rows, Used in), then run:
node <dojo root>/scripts/lint.ts <workspace> <ID>
and fix every error and every style/* warning it reports before finishing.

Report back only: file paths written, the assignment's resources by title in order, authored word count, ledger rows added, budget used as searches/fetches, and anything you could not verify.
```

For the syllabus pass, replace the item line with the topic, goal and level from `profile.md`, add RESEARCH.md's structure sources to the reading list, run the digest with `syllabus` in place of the ID, and have it write `syllabus.md` and the first `ledger.md`; its report lists the sections and the structure sources in place of the assignment. A completion project's pass also writes `starter/`.
