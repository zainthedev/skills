---
type: regex
pattern: '\n\s*Why: [^\n]+\n\s*How: [^\n]+\n\s*Do: [^\n]+'
match: contains
target: { source: file, path: lessons/L02-middleware.md }
---
Assignment items carry Why, How and Do lines.
