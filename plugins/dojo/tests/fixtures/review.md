---
scope: branch feature/cart against main from 1a2b3c4
reviewed: 2026-09-26
---

# Review: branch feature/cart

## Summary

The branch adds a cart total and a date helper. The risk sits in the total, which checkout charges.

## Flags

| # | Category | Severity | Location | Title | Status | Answer given |
|---|----------|----------|----------|-------|--------|--------------|
| 1 | bug | high | src/cart.ts:42-48 | Total of an empty cart | open | no |
| 2 | hand-rolled | medium | src/utils/date.ts | Date arithmetic | open | no |

### 1. Total of an empty cart

- **Why it matters:** a customer who removes their last item still reaches checkout with whatever `total()` returns.
- **Look:** log `total()` for an empty cart before checkout uses it.
- **Question:** What does the payment API receive when `items` is empty?

### 2. Date arithmetic

- **Why it matters:** 60 lines of calendar maths is 60 lines to keep right across month ends.
- **Look:** open `package.json` and list which dependency already works with dates.
- **Question:** What does that dependency's documentation offer that overlaps with this file?
