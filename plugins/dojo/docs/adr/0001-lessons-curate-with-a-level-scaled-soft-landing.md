---
status: accepted
---
# Lessons curate resources; authored text is a level-scaled soft landing

dojo follows The Odin Project's model: a lesson orients the learner and sends them to the best free resources rather than teaching the material itself. Authored text is limited to a soft landing (introduction, overview, one core idea with at most one small example) with a word budget that shrinks as level rises: about 800 words for beginners, 400 for intermediate, 200 for advanced. Depth and practice always come from resources; every factual claim in authored text cites a resource fetched in the same run; when no good resource exists, the skill writes the explanation, labels it as authored, and cites the docs it used.

## Considered options

- **Full authoring**, which is what `teach` does: the model writes the lesson from its own knowledge plus citations. Rejected because it is the highest-hallucination path, the most expensive in tokens, and it replaces the reading that builds the learner's ability to use primary sources.
- **Strict curation**: glue text and links only. Rejected because The Odin Project itself authors introductions and concept sections, and the worked-example evidence says novices need orientation before primary material.

## Consequences

- Resources are free only, as on The Odin Project. Price is a filter in the rubric, never a score.
- The lesson and project templates are baked into the plugin from The Odin Project's layout guide as of September 2026, with a provenance note, rather than fetched at runtime.
- Hallucination risk is concentrated in one labelled place per lesson, which is what the citation lint checks.
- Evidence: worked examples, expertise reversal and cognitive load in `../evidence.md`.
