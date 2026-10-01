---
type: regex
pattern: "(?i)by the end of this lesson|in this lesson,? we|let's dive|it's worth noting|key takeaways|in summary|\\bdelve|\\btapestry\\b|\\bpivotal\\b|\\bcrucial\\b|\\bjourney\\b|not only [^.]{1,80} but"
match: not_contains
target: { source: file, path: lessons/L03-the-preterite-for-finished-actions.md }
---
The lesson carries none of the banned phrases or AI vocabulary from STYLE.md.
