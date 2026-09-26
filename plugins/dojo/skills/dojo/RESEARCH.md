# Research

Paths below are under the **dojo root**, the directory holding this file; the `dojo` skill says how to find it.

A research pass is **one worker** with a fixed budget, forbidden to delegate, that drafts the item and its sidecar itself (ADR 0008): a subagent where the harness can spawn one, otherwise the main session under the same budget. The main session lints and reports. The command fills in [templates/brief.md](templates/brief.md) and hands it over; the worker reads the format, STYLE.md and RUBRIC.md itself, so the main session reads none of them.

## Budgets

Maximum web searches and page fetches per pass, fixed by what the pass produces (ADR 0014):

| Pass | Searches | Fetches |
|------|----------|---------|
| lesson | 8 | 12 |
| project | 4 | 6 |
| syllabus | 16 | 24 |

A checkpoint needs no pass. The caps are rarely reached; what a pass costs is the context it carries, which is why it reads a digest.

## Model

`research_model` in `profile.md` names the model for research passes. `inherit`, the default, means the session's model. On a harness that lets a subagent run a different model, pass that model to the pass; elsewhere ignore the field and say so in the report.

## What the pass reads

```bash
node <dojo root>/scripts/context.ts <workspace> <ID>
```

The digest holds the learner's profile, the section plan, the previous items' overviews and prompts, the ledger and the scout's top resources for this item, each with its thread count, newest mention and one excerpt (`syllabus` in place of an ID for the syllabus pass; a checkpoint gets the sampled prompts, answers, anchors and assignment titles instead). Work from it. Open a workspace file only when the digest names something you must see whole.

## Fetching

Every fetch asks for extracts, never a summary, in two parts:

1. The page's headings, its last-updated date or version, and whether any part is paid.
2. The passages that cover this item's concepts, quoted.

Part 1 lets the rubric score the resource; part 2 is what the Why, How and Do lines cite. A second fetch of the same page is allowed when part 1 shows a section worth reading. Where the tool returns the raw page instead of an answer, note the same two parts and stop quoting the page. On Claude Code, WebFetch refuses reddit.com, stackoverflow.com and web.archive.org; the scout covers those.

Lint treats a citation to an unfetched URL as an error, and the record it checks is `.dojo/fetched.jsonl`. The pass appends each fetched URL itself, as the brief says. Where dojo is installed as the Claude Code plugin, a plugin hook also writes a line for every WebFetch the harness runs, in the main session and in subagents, and `scripts/fetch-log.ts --collect` moves lines recorded before the workspace existed into it (ADR 0015); those lines are the evidence, the pass's own lines the fallback.

The scout runs once per course, started by `dojo-plan`, and writes `.dojo/scout.json`; later passes reuse it through the digest.

## Structure sources, in order

1. The official documentation's guide ordering.
2. The Odin Project's course outline, when one exists for the topic. Its lessons are also resources.
3. roadmap.sh for the topic.
4. The tables of contents of the two or three most endorsed courses or books in the scout output.

The syllabus mirrors the consensus ordering and names the sources in its frontmatter.

Done when the pass's report lists its files, its budget, and a clean lint.
