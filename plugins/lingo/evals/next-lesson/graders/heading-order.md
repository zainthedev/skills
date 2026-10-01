---
type: regex
pattern: '## Introduction[\s\S]*## Lesson overview[\s\S]*## Before you start[\s\S]*## Words[\s\S]*## Assignment[\s\S]*## Retrieval practice'
match: contains
target: { source: file, path: lessons/L03-the-preterite-for-finished-actions.md }
---
The lesson has the required headings in the required order.
