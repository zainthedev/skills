---
type: regex
pattern: '\d\. Explain: \[[\s\S]*\d\. Say: \[|\d\. Say: \[[\s\S]*\d\. Explain: \['
match: contains
target: { source: file, path: lessons/L03-the-preterite-for-finished-actions.md }
---
Retrieval practice has at least one Explain and one Say prompt.
