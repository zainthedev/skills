# Research

Paths below are under the **lingo root**, the directory holding this file; the `lingo` skill says how to find it.

A research pass is **one worker** with a fixed budget, forbidden to delegate, that drafts the item and its sidecar itself: a subagent where the harness can spawn one, otherwise the main session under the same budget. The main session lints and reports. The command fills in [templates/brief.md](templates/brief.md) and hands it over; the worker reads the format, STYLE.md and RUBRIC.md itself, so the main session reads none of them.

## Budgets

Maximum web searches and page fetches per pass, fixed by what the pass produces:

| Pass | Searches | Fetches |
|------|----------|---------|
| lesson | 8 | 12 |
| task | 4 | 6 |
| syllabus | 16 | 24 |

A checkpoint needs no pass. The caps are rarely reached; what a pass costs is the context it carries, which is why it reads a digest.

## Model

`research_model` in `profile.md` names the model for research passes. `inherit`, the default, means the session's model. On a harness that lets a subagent run a different model, pass that model to the pass; elsewhere ignore the field and say so in the report.

## What the pass reads

```bash
node <lingo root>/scripts/context.ts <workspace> <ID>
```

The digest holds the learner's profile with its per-skill levels, which language each authored part is written in, the section plan, the previous items' overviews and prompts, every word earlier lessons taught, the ledger and the scout's top resources for this item, each with its thread count, newest mention and one excerpt (`syllabus` in place of an ID for the syllabus pass). Work from it. Open a workspace file only when the digest names something you must see whole.

## Fetching

Every fetch asks for extracts, never a summary, in two parts:

1. The page's headings, its last-updated date, which variety and level it targets, whether it has transcripts or subtitles, and whether any part is paid or region-locked.
2. The passages that cover this item's structure and words, quoted, and for an episode or video, the minutes that do.

Part 1 lets the rubric score the resource; part 2 is what the Why, How and Do lines and the Words source cite. A second fetch of the same page is allowed when part 1 shows a section worth reading. Where the tool returns the raw page instead of an answer, note the same two parts and stop quoting the page. On Claude Code, WebFetch refuses reddit.com, stackoverflow.com and web.archive.org; the scout covers Reddit and the Wayback Machine.

Lint treats a citation to an unfetched URL as an error, and the record it checks is `.lingo/fetched.jsonl`. The pass appends each fetched URL itself, as the brief says. Where lingo is installed as the Claude Code plugin, a plugin hook also writes a line for every WebFetch the harness runs, in the main session and in subagents, and `scripts/fetch-log.ts --collect` moves lines recorded before the workspace existed into it; those lines are the evidence, the pass's own lines the fallback.

The scout runs once per course, started by `lingo-plan`, and writes `.lingo/scout.json`; later passes reuse it through the digest. It reads subreddit wikis, Reddit threads and Hacker News; language learners rarely recommend resources anywhere else it can reach.

## Target-language text you write

Words, examples, Core idea patterns and guided-task models are in a language you may write less well than English. Check every form you write against a fetched reference or the assigned input. Quote input rather than invent it where you can, and mark what you wrote as the formats say: italics for an authored Words example, the Authored line for a model text. Never write a reading passage or a dialogue for study; assign one.

## Structure sources, in order

1. The exam's official specification and free sample papers, when the profile names an exam.
2. A national institute's curriculum by CEFR level, when one is free: the Instituto Cervantes Plan curricular for Spanish, the Goethe-Institut's level descriptions for German, the JF Standard and JLPT can-do lists for Japanese, and the like.
3. The ordering of the most endorsed free course or textbook in the scout output, and the subreddit wiki's recommended path.
4. The CEFR descriptors for the target level, for what each section must let the learner do.

The syllabus mirrors the consensus ordering and names the sources in its frontmatter.

Done when the pass's report lists its files, its budget, and a clean lint.
