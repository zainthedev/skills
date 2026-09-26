---
status: accepted
---
# Research passes read a digest, fetch extracts, and may run on a cheaper model

Most of a lesson's weighted token cost is the research pass, and every token that enters its context is paid once as fresh input and again as a cache read on every later turn, so what enters that context is the lever. Three changes, none of which touch what a lesson contains. First, the pass works from `scripts/context.ts`, a deterministic digest of the profile, the section plan, the previous items' overviews and prompts, the ledger and the scout's top resources for the item, instead of reading the profile, the syllabus, the ledger, the whole scout file and the previous items in full. A checkpoint's digest carries the sampled prompts with their answers, so `dojo-next` writes it without opening a lesson. Second, every fetch asks for two extracts, the page's headings with its date, version and any paywall, then the passages on the item's concepts, rather than a summary; the rubric needs the first and the citations need the second, and nothing else needs to sit in context afterwards. Third, `research_model` in the profile names a model for research passes, default `inherit`, for harnesses that let a subagent run a different model. The format files were also trimmed of rationale that the ADRs already hold.

## Considered options

- **A hand-maintained context summary**, the pattern the "skills that reduce token usage" article recommends. Rejected: it rots the moment the workspace moves; a computed digest cannot drift from the files.
- **Cutting fetch budgets.** Rejected: fetch-before-cite is where lesson quality lives, and a claim that cannot be verified is the one saving that would show up in the lessons.
- **Compressing the skill files further**, per SkillReducer's finding that most skill text is background. Done as a trim, not a rewrite: the skills were already tiered, and the saving is a few hundred tokens per run against a million cache reads in the pass.

## Consequences

- The brief's reading list is three files and one command.
- Serendipity is preserved by the headings part of the fetch prompt, and a second fetch of a page is allowed when the headings show something worth reading.
- On harnesses whose fetch tool returns raw pages, the extract shape becomes an instruction to note the same two parts and stop quoting.
- Headless runs on 2026-09-26 (Opus 5.5, ten cells, one run each) put a lesson at 166k to 209k weighted tokens whatever its depth or level, a syllabus at 331k to 510k, a completion project at 266k and a checkpoint at 136k (weighted with Opus 5.5's cache-read rate of 0.05; see `docs/token-runs.md`). Depth moves a lesson by a quarter, not the tenfold spread the provisional table assumed, because the fetch budget is a cap the pass rarely reaches; the cost is the context the pass carries, which is what the digest and the extract-shaped fetches bound. That finding removed the depth question (ADR 0014). The figures are upper bounds; `docs/token-runs.md` records what inflated them.
- Measuring it meant adding the research subagent's transcript by hand, because the usage a headless Claude Code run reports covers the main session only.
