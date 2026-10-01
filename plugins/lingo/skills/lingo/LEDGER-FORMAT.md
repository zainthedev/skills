# Ledger format

The **ledger** is the workspace's table of vetted resources: what was considered, how it scored, what uses it. Lessons draw assignments, word sources and citations from it and from nowhere else.

File: `ledger.md` at the workspace root. The scout's raw signal is `.lingo/scout.json`; every URL fetched in a research pass is recorded in `.lingo/fetched.jsonl` as `{"url": "...", "fetched_at": "<ISO timestamp>", "item": "<ID, syllabus or hook>"}`. The pass appends it; the Claude Code plugin's hook writes a second record for every fetch the harness made.

## Frontmatter

```yaml
---
language: Spanish
scouted: 2026-10-01
subreddits: [Spanish, learnspanish, languagelearning]
thin_evidence: false
---
```

`scouted` is `pending` until the syllabus pass fills the table.

## Body

```md
# Ledger

| Resource | Type | Score | Endorsements | Freshness | Level | Used in |
|----------|------|-------|--------------|-----------|-------|---------|
| [Dreaming Spanish on YouTube](https://www.youtube.com/@DreamingSpanish) | channel | 88 | top reply in 6 of 11 threads; r/learnspanish wiki | 2026-09 | A1-A2 | L01, L02 |
| [SpanishDict: Preterite vs imperfect](https://www.spanishdict.com/guide/preterite-vs-imperfect) | reference | 81 | top reply in 3 threads | 2026-08 | A2-B1 | L03 |

## Excluded

- [A paid course](https://example.com/course): paid.

## Notes

- Structure sources: Instituto Cervantes Plan curricular, r/learnspanish wiki ordering.
- Thin evidence: none.
```

## Rules

- **Resource** is `[Title](url)`, canonical URL, no tracking parameters.
- **Type** is `course`, `guide`, `book`, `reader` (graded readers and leveled texts), `podcast`, `video`, `channel` (a series of videos or episodes), `interactive`, `reference` (grammar references, conjugation tables), `dictionary`, `article`, `deck` (shared word lists or Anki decks) or `community` (free exchange and correction communities).
- **Score** is the rubric total, 0 to 100 (RUBRIC.md).
- **Endorsements** is evidence a reader can check: where it was recommended and how strongly.
- **Freshness** is `YYYY-MM` of the last verified update, or `unknown`. A grammar reference ages slowly; a podcast that stopped years ago still teaches, so freshness weighs less here than in a technical course.
- **Level** is the CEFR band or range the resource suits, `B1` or `A2-B1`, or `-` for a resource of any level, such as a dictionary.
- **Used in** lists item IDs, updated whenever an item cites, assigns or takes words from the resource.
- Free resources only in the table; paid, dead and region-locked ones go under Excluded with the reason. A free tier counts when the part assigned is free.
- Around fifteen rows per course: input across levels, a reference, a dictionary, a frequency list. Prune rather than pile up.
- When the scout found little, set `thin_evidence: true` and add `- Thin evidence: <what it could not find>` under Notes; lint warns until that bullet exists.

Done when every resource a lesson links to has a row with evidence behind its score.
