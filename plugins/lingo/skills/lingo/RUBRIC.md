# Rubric

A **resource** scores 0 to 100. The scout computes the objective signals from public feeds and APIs; the model scores fit and authority after reading the resource. Free is a filter before scoring: paid resources are excluded, never scored.

| Signal | Weight | Who scores | Full marks |
|--------|--------|------------|------------|
| Endorsement breadth | 15 | scout | Recommended in five or more distinct question threads |
| Vote-weighted depth | 15 | scout | The top-voted reply in the threads that mention it |
| Curated inclusion | 10 | scout | In a subreddit wiki or a curated list with 10k or more stars; SEO listicles count zero |
| Verified freshness | 20 | scout, model may raise | Updated in the last twelve months, by commit date or last-modified header, never by a year in a listicle |
| Variety fit | 5 | model | Uses the variety `language_code` names, or says clearly which it uses |
| Learner fit | 15 | model | Matches the learner's level for the skill it trains, and makes input comprehensible: transcripts, subtitles, a slower speed, graded text |
| Authority | 10 | model | A national language institute, a public broadcaster's learner service, a university, or native-speaking teachers with a record |
| Independent signal | 10 | scout | Quoted Hacker News mentions in the last 24 months, or platform scale |

## Freshness for languages

A language changes slowly. A complete resource that no longer updates, such as a finished podcast series, a graded reader or a grammar reference, still teaches. When the scout marks one stale or unknown and its links work and nothing in it is out of date, raise freshness to full marks and say why in the Endorsements cell ("complete series, links checked 2026-10").

## Penalties

- Only the author or an affiliate recommends it: minus 10.
- Newest evidence older than four years: minus 5.
- Replies voted up for calling it wrong, outdated or a poor method: minus 5.
- Teaches mostly through sentence-by-sentence translation or lists without context: minus 5.
- Dead link, paywall on the part assigned, or region lock: excluded, listed under Excluded with the reason.

## Evidence string

Write Endorsements so a reader could check it: `top reply in 5 of 9 threads; r/learnspanish wiki`. Read the quotes before counting: "just watch YouTube" in a thread is not an endorsement of a specific channel. Old threads dominate top-sorted feeds and search results are affiliate listicles, so weigh recency and read the thread, not the tally. App store listings and "best apps" pages count zero.
