---
status: accepted
---
# lingo is its own plugin and vendors dojo's generic scripts

A course in a language shares dojo's skeleton, a syllabus of sections, curated free resources, retrieval prompts, checkpoints and a site, and differs in nearly every format inside it: levels are CEFR placements per skill, lessons carry a Words table and move into the target language, projects become communicative tasks, and there are two new practice records, talk and writing reviews. lingo is a separate plugin with its own commands, `/lingo-*`, so a learner installs only what they use and dojo's formats stay free of language branches.

The scripts that know nothing of either format are byte-identical copies of dojo's: the markdown renderer, the frontmatter parser, the style word lists, the section splitter, the scout and its HTTP layer, the measure script, mark-done, the sidecar parser, the guard and the site's stylesheet. The scripts that know the formats, lint, init, context, checkpoint, next-item, the site builder and the logs, are lingo's own. `tests/vendored.test.ts` lists the copies and fails when a pair drifts.

## Considered options

- **Language skills inside the dojo plugin, sharing its root.** Rejected: every format script would branch on the course kind, and a dojo user would install language commands they never run.
- **A dependency on dojo.** Rejected: a plugin installs alone, and a skill never reaches into another skill's folder (dojo ADR 0011).

## Consequences

- A fix to a vendored file is made in dojo and copied here; the drift test enforces it.
- The scout drops dojo's developer sources, Stack Overflow and dev.to, which language learners do not use; Reddit, subreddit wikis and Hacker News remain.
