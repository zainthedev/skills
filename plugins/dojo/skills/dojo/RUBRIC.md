# Rubric

A **resource** is scored 0 to 100. The scout computes the objective parts from public feeds and APIs; the model scores fit and authority after reading the resource. Free is a filter applied before scoring: paid resources are excluded, never scored.

| Signal | Weight | Who scores | What full marks means |
|--------|--------|------------|------------------------|
| Endorsement breadth | 15 | scout | Recommended in five or more distinct question threads |
| Vote-weighted depth | 15 | scout | The top-voted reply in the threads that mention it |
| Curated inclusion | 10 | scout | Listed in a subreddit wiki or a curated list with 10k or more stars; SEO listicles count zero |
| Verified freshness | 20 | scout | Updated in the last twelve months, verified by commit date or last-modified header, never by a year in a listicle |
| Version currency | 5 | model | Targets the current major version of the tool |
| Learner fit | 15 | model | Matches the level in `profile.md` and the item's concepts |
| Authority | 10 | model | Primary source, or written by the maintainers or a recognised expert |
| Independent signal | 10 | scout | Quoted Hacker News mentions in the last 24 months, or platform scale |

## Penalties

- Only the author or an affiliate recommends it: minus 10.
- Newest evidence older than four years: minus 5.
- Replies voted up for calling it outdated or too slow: minus 5.
- Dead link, paywall, or superseded major version with no update: excluded, listed under Excluded in the ledger with the reason.

## Evidence string

Write the Endorsements cell so a reader could check it: `top reply in 5 of 9 threads; r/learnjavascript wiki; HN 3`. Read the quotes before counting: "the docs" in a thread is not an endorsement of a specific page.

## Pitfalls the scout has met

Old threads and 2020 videos dominate top-sorted feeds; a subreddit's top feed is mostly memes and launch posts; search results are SEO and affiliate listicles; links move (nodejs.dev, Frontend Masters). Weigh recency and read the thread, not the tally.
