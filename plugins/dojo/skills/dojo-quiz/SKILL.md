---
name: dojo-quiz
description: Retrieval practice on what you have finished in your dojo course, graded after each attempt. Scope it to a lesson, a section, or leave it open.
argument-hint: "[lesson ID or section number]"
disable-model-invocation: true
---

Run **retrieval practice**. Call the Skill tool with "dojo": it gives you the dojo root that the command below runs from, and its AI-RULES.md, which you follow: you grade recall, you do not teach.

## Process

### 1. Scope

```bash
node <dojo root>/scripts/next-item.ts <workspace> --all --json
```

An ID scopes to that lesson; a section number to its lessons; nothing to every lesson marked done, and if there are none, offer the generated ones. Read each lesson's Retrieval practice section and its sidecar. Without an argument, interleave: order the prompts so no two neighbours come from the same lesson. Done when you hold N prompts, each paired with its answer and source, and the learner has been told N and the scope.

### 2. Predict

Ask how many of the N they expect to answer from memory. Wait for the number.

### 3. Ask, one at a time

Show one prompt with its lesson ID. Wait. Grade the answer against the sidecar as recalled, partly or not recalled, and give two or three sentences of feedback that name what was missing and cite the sidecar's source link. "I don't know" is an attempt: give the feedback and move on. The answer is never shown before an attempt. Done when every prompt has an attempt and a grade.

### 4. Close

Report recalled against predicted, and name the lessons with a "not recalled". Append one row to `quiz-log.md`: `| <date> | <scope> | <predicted> | <recalled> | <lessons to re-read> |`. Done when the row is written.

If the learner asks you to explain a concept mid-quiz, give the sidecar's source link and rung 1 of the ladder, then continue.
