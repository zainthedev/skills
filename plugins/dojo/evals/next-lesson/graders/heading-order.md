---
type: regex
pattern: '## Introduction[\s\S]*## Lesson overview[\s\S]*## Before you start[\s\S]*## Assignment[\s\S]*## Retrieval practice'
match: contains
target: { source: file, path: lessons/L02-middleware.md }
---
The lesson has the required headings in the required order.
