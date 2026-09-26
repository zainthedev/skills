# Research

Paths below are under the **dojo root**, the directory holding this file; the `dojo` skill says how to find it.

A research pass is **one worker** with a fixed budget, forbidden to delegate, that drafts the item and its sidecar itself (ADR 0008): a subagent where the harness can spawn one, otherwise the main session under the same budget. The main session lints and reports.

## Depth budgets

Maximum web searches and page fetches per pass.

| Depth | Searches | Fetches |
|-------|----------|---------|
| quick | 4 | 6 |
| standard | 8 | 12 |
| deep | 15 | 25 |

The syllabus pass gets double. A project pass always uses quick. A checkpoint needs no pass.

## Model

`research_model` in `profile.md` names the model for research passes. `inherit`, the default, means the session's model. On a harness that lets a subagent run a different model, pass that model to the pass; elsewhere ignore the field and say so in the report.

## What the pass reads

```bash
node <dojo root>/scripts/context.ts <workspace> <ID>
```

The digest holds the learner's profile, the section plan, the previous items' overviews and prompts, the ledger and the scout's top resources for this item (`syllabus` in place of an ID for the syllabus pass; a checkpoint gets the sampled prompts and answers instead). Work from it. Open a workspace file only when the digest names something you must see whole.

## Fetching

Every fetch asks for extracts, never a summary, in two parts:

1. The page's headings, its last-updated date or version, and whether any part is paid.
2. The passages that cover this item's concepts, quoted.

Part 1 lets the rubric score the resource; part 2 is what the Why, How and Do lines cite. A second fetch of the same page is allowed when part 1 shows a section worth reading. Where the tool returns the raw page instead of an answer, note the same two parts and stop quoting the page. On Claude Code, WebFetch refuses reddit.com, stackoverflow.com and web.archive.org; the scout covers those. Record every fetched URL in `.dojo/fetched.jsonl`; lint treats a citation to an unfetched URL as an error.

The scout runs once per course, started by `dojo-plan`, and writes `.dojo/scout.json`; later passes reuse it through the digest.

## Structure sources, in order

1. The official documentation's guide ordering.
2. The Odin Project's course outline, when one exists for the topic. Its lessons are also resources.
3. roadmap.sh for the topic.
4. The tables of contents of the two or three most endorsed courses or books in the scout output.

The syllabus mirrors the consensus ordering and names the sources in its frontmatter.

## The brief

Give this brief, filled in, to one subagent where your harness has them (the Agent tool on Claude Code, subagents on Codex, and the like). Where it has none, the brief is yours: do the pass in this session under the same budget, and the first line still binds you. Keep the first line.

```text
Do this work yourself: do not spawn agents or delegate any part of it.

You are generating one dojo <lesson|syllabus|project|checkpoint> for the workspace at <absolute path>.
Item: <ID> "<title>", section <N>. Level: <level>. Depth: <depth>: at most <S> web searches and <F> page fetches in total; when the budget is spent, stop researching and say so in your report.

Read first, in this order:
1. <dojo root>/<FORMAT file for this item>
2. <dojo root>/STYLE.md
3. <dojo root>/RUBRIC.md
Then run: node <dojo root>/scripts/context.ts <workspace> <ID>
and work from its output. Open a workspace file only when the digest is not enough.

Research: prefer ledger resources already scored. Add a resource only when the ledger lacks coverage for this item's concepts; score it with the rubric and the scout evidence. Fetch every resource you will cite or assign, asking for two things and nothing else: its headings, date or version and any paywall; then the passages on this item's concepts, quoted. Free resources only. Append every fetched URL to <workspace>/.dojo/fetched.jsonl as {"url","fetched_at","item"}.

Write the files the format names, update ledger.md (new rows, Used in), then run:
node <dojo root>/scripts/lint.ts <workspace> <ID>
and fix every error and every style/* warning it reports before finishing.

Report back only: file paths written, authored word count, ledger rows added, budget used as searches/fetches, and anything you could not verify.
```

For the syllabus pass, replace the item line with the topic, goal and level from `profile.md`, add the structure sources above to the reading list, run the digest with `syllabus` in place of the ID, and have it write `syllabus.md` and the first `ledger.md`.

Done when the pass's report lists its files, its budget, and a clean lint.
