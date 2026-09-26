# Ledger format

The **ledger** is the workspace's table of vetted resources: what was considered, how it scored, what uses it. Lessons draw assignments and citations from it and from nowhere else.

File: `ledger.md` at the workspace root. The scout's raw signal is `.dojo/scout.json`; every URL fetched in a research pass is recorded in `.dojo/fetched.jsonl` as `{"url": "...", "fetched_at": "<ISO timestamp>", "item": "<ID, syllabus or hook>"}`. The pass appends it; the Claude Code plugin's hook writes a second record for every fetch the harness made (ADR 0015).

## Frontmatter

```yaml
---
topic: Node and Express
scouted: 2026-09-25
subreddits: [node, learnjavascript, webdev]
thin_evidence: false
---
```

`scouted` is `pending` until the syllabus pass fills the table.

## Body

```md
# Ledger

| Resource | Type | Score | Endorsements | Freshness | Version | Used in |
|----------|------|-------|--------------|-----------|---------|---------|
| [Express guide: Routing](https://expressjs.com/en/guide/routing.html) | docs | 92 | top reply in 5 of 9 threads; r/learnjavascript wiki; HN 3 | 2026-09 | Express 5 | L03, L04 |
| [Full Stack Open, part 3](https://fullstackopen.com/en/part3) | course | 88 | top reply in 3 threads; repo commit 2026-09 | 2026-09 | Express 5 | L04, P02 |

## Excluded

- [Express in Action](https://www.manning.com/books/express-in-action): last updated 2016, Express 4; paid.

## Notes

- Structure sources: Express guide ordering, The Odin Project NodeJS outline.
- Thin evidence: none.
```

## Rules

- **Resource** is `[Title](url)`, canonical URL, no tracking parameters.
- **Type** is `docs`, `guide`, `course`, `book`, `video`, `interactive`, `article` or `reference`.
- **Score** is the rubric total, 0 to 100 (RUBRIC.md).
- **Endorsements** is evidence a reader can check: where it was recommended and how strongly.
- **Freshness** is `YYYY-MM` of the last verified update, or `unknown`. **Version** is the tool version targeted, or `-`.
- **Used in** lists item IDs, updated whenever an item cites or assigns the resource.
- Free resources only in the table; paid, dead and stale ones go under Excluded with the reason.
- Around a dozen rows per course. Prune rather than pile up.
- When the scout found little, set `thin_evidence: true` and add `- Thin evidence: <what it could not find>` under Notes; lint warns until that bullet exists.

Done when every resource a lesson links to has a row with evidence behind its score.
