---
status: accepted
---
# Words go to Anki, and lingo keeps no scheduler

Vocabulary needs spaced retrieval, and the testing effect was shown on foreign-language word pairs (Karpicke and Roediger 2008). dojo keeps no scheduler and spaces through checkpoints (dojo ADR 0004). lingo keeps that rule and adds a Words table to every lesson, which `deck.ts` exports with Anki's import headers and tags. Anki schedules the reviews; checkpoints and the quiz sample the same words by meaning.

## Considered options

- **A flashcard review on the site with its own spacing.** Rejected: a scheduler is a product to maintain, and Anki is free, widely used and better at it.

## Consequences

- A learner without Anki still gets words in checkpoints and quizzes, spaced by section.
- Meanings must be unique within a lesson, because a checkpoint shows the meaning alone.
