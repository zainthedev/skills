# Research

The plugin root is two directories above this file, the one holding `scripts/`; the command skills already carry it as an absolute path.

Every research pass runs in **one subagent** with a fixed budget, a line forbidding it to delegate, and the job of drafting the item itself (ADR 0008). The main session lints and reports.

## Depth budgets

Maximum web searches and page fetches per pass.

| Depth | Searches | Fetches |
|-------|----------|---------|
| quick | 4 | 6 |
| standard | 8 | 12 |
| deep | 15 | 25 |

The syllabus pass gets double. A project pass always uses quick. A checkpoint needs no pass.

## Tools and their limits

- WebFetch returns a model-written summary of a page, never the raw page, and refuses reddit.com, stackoverflow.com and web.archive.org. Use it to read a canonical resource page and confirm it covers what the lesson will claim.
- Anything structured, and everything from Reddit, comes from the **scout**: `node <plugin root>/scripts/scout.ts <workspace> --topic "<topic>" --subreddits <a,b,c> --keywords "<k1>|<k2>"`. It writes `.dojo/scout.json`. It rate-limits itself to one Reddit feed request per 30 seconds, so `plan` starts it in the background as soon as the topic is known and lets it run through intake. Run it once per course; later passes reuse the file.
- Record every fetched URL in `.dojo/fetched.jsonl`. Lint treats a citation to an unfetched URL as an error.

## Structure sources, in order

1. The official documentation's guide ordering.
2. The Odin Project's course outline, when one exists for the topic. Its lessons are also resources.
3. roadmap.sh for the topic.
4. The tables of contents of the two or three most endorsed courses or books in the scout output.

The syllabus mirrors the consensus ordering and names the sources in its frontmatter.

## The brief

Paste this into the Agent tool, filled in. Keep the first line.

```text
Do this work yourself: do not spawn agents or delegate any part of it.

You are generating one dojo <lesson|syllabus|project|checkpoint> for the workspace at <absolute path>.
Item: <ID> "<title>", section <N>. Level: <level>. Depth: <depth>, which means at most <S> web searches and <F> page fetches in total; when the budget is spent, stop researching and say so in your report.

Read first, in this order:
1. <plugin root>/skills/dojo-conventions/<FORMAT file for this item>
2. <plugin root>/skills/dojo-conventions/RUBRIC.md
3. <workspace>/profile.md, syllabus.md, ledger.md, .dojo/scout.json
4. <the previous one or two item files>, so this item builds on them and reuses the ledger.

Research: prefer ledger resources already scored. Add a resource only when the ledger lacks coverage for this item's concepts; score it with the rubric and the scout evidence. Fetch every resource you will cite or assign and note the section that supports each use. Free resources only. Append every fetched URL to <workspace>/.dojo/fetched.jsonl as {"url","fetched_at","item"}.

Write the files the format names, update ledger.md (new rows, Used in), then run:
node <plugin root>/scripts/lint.ts <workspace> <ID>
and fix every error it reports before finishing.

Report back only: file paths written, authored word count, ledger rows added, budget used as searches/fetches, and anything you could not verify.
```

For the syllabus pass, replace the item line with the topic, goal and level from `profile.md`, add the structure sources above to the reading list, and have it write `syllabus.md` and the first `ledger.md`.

Done when the subagent's report lists its files, its budget, and a clean lint.
