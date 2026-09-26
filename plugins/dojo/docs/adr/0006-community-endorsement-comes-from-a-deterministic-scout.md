---
status: accepted
---
# Community endorsement comes from a deterministic scout over public feeds

Reddit cannot be reached from Claude Code's built-in tools: WebFetch refuses reddit.com at the client (Stack Overflow and the Wayback Machine too), and the WebSearch backend returns no Reddit results. Reddit's public RSS feeds do work from curl at about one request per 30 seconds, a Pushshift successor returns comment scores, Wayback snapshots serve subreddit wikis, and the Hacker News, Stack Exchange, dev.to and GitHub APIs work normally. So endorsement gathering is a bundled script, the scout, that fetches these sources with rate limiting and backoff, parses them, and writes compact JSON. `plan` starts it in the background as soon as the topic is known so it runs during intake, results are cached in the workspace, and `next` reuses them, fetching only canonical pages to verify. The model ranks; it never sees raw feeds.

## Considered options

- Tell the research subagent to curl things itself. Rejected: rate limits and parsing in prose are fragile, and raw XML in context is expensive.
- Drop Reddit. Rejected for now: it is where the recommendations the user asked for live, and the feeds are enough.

## Consequences

- The plugin never fetches reddit.com HTML, and documents its feed usage and rate.
- WebFetch returns a model-written summary rather than the raw page, so anything structured goes through the scout, and WebFetch is used only to read canonical resource pages.
- Niche topics with thin community evidence are marked as such in the ledger rather than padded.
