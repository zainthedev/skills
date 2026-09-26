---
type: regex
pattern: "(?i)by the end of this lesson|in this lesson,? we|let's dive|it's worth noting|key takeaways|in summary|\\bdelve|\\btapestry\\b|\\bpivotal\\b|\\bcrucial\\b|\\bseamless|\\bleverage|\\blandscape\\b|\\bjourney\\b|[–—]|not only [^.]{1,80} but"
match: not_contains
target: { source: file, path: lessons/L02-middleware.md }
---
The lesson carries none of the banned phrases, AI vocabulary, dashes or contrast scaffolding from STYLE.md.
