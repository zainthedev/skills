# Rubric

A **resource** scores 0 to 100. The scout computes the objective signals from public feeds and APIs; the model scores fit and authority after reading the resource. Free is a filter before scoring: paid resources are excluded, never scored.

| Signal | Weight | Who scores | Full marks |
|--------|--------|------------|------------|
| Endorsement breadth | 15 | scout | Recommended in five or more distinct question threads |
| Vote-weighted depth | 15 | scout | The top-voted reply in the threads that mention it |
| Curated inclusion | 10 | scout | In a subreddit wiki or a curated list with 10k or more stars; SEO listicles count zero |
| Verified freshness | 20 | scout | Updated in the last twelve months, by commit date or last-modified header, never by a year in a listicle |
| Version currency | 5 | model | Targets the current major version of the tool |
| Learner fit | 15 | model | Matches the level in `profile.md` and the item's concepts |
| Authority | 10 | model | Primary source, or by the maintainers or a recognised expert |
| Independent signal | 10 | scout | Quoted Hacker News mentions in the last 24 months, or platform scale |

## Penalties

- Only the author or an affiliate recommends it: minus 10.
- Newest evidence older than four years: minus 5.
- Replies voted up for calling it outdated or too slow: minus 5.
- Dead link, paywall, or superseded major version with no update: excluded, listed under Excluded with the reason.

## Evidence string

Write Endorsements so a reader could check it: `top reply in 5 of 9 threads; r/learnjavascript wiki; HN 3`. Read the quotes before counting: "the docs" in a thread is not an endorsement of a specific page. Old threads dominate top-sorted feeds and search results are affiliate listicles, so weigh recency and read the thread, not the tally.
