---
name: dojo-quiz
description: Retrieval practice on what you have finished in your dojo course, graded after each attempt. Scope it to a lesson, a section, or leave it open.
argument-hint: "[lesson ID or section number]"
disable-model-invocation: true
allowed-tools: Bash(node *), Bash(bun *)
---

Run **retrieval practice**. Call the Skill tool with "dojo": it gives you the dojo root that the command below runs from, and its AI-RULES.md, which you follow: you grade recall, you do not teach.

## Process

### 1. Scope

```bash
node <dojo root>/scripts/context.ts <workspace> quiz [<lesson ID> | <section number>]
```

It prints at most ten prompts, each with its answer and source link, interleaved so no two neighbours come from the same lesson, drawn from the scope: one lesson, one section, or every finished lesson (the generated ones when none is finished). Do not open the lessons or sidecars; the output is the whole quiz. Done when the learner has been told the count and the scope.

### 2. Predict

Ask how many of the N they expect to answer from memory. Wait for the number.

### 3. Ask, one at a time

Show one prompt with its lesson ID. Wait. Grade the answer against the printed answer as recalled, partly or not recalled, and give two or three sentences of feedback that name what was missing and cite the source link. "I don't know" is an attempt: give the feedback and move on. The answer is never shown before an attempt. Done when every prompt has an attempt and a grade.

### 4. Close

Report recalled against predicted, and name the lessons with a "not recalled". Record the session in one call, with the command's argument as the scope, or `all` without one:

```bash
node <dojo root>/scripts/quiz-log.ts <workspace> --scope <scope> --predicted <n> --recalled <n> --reread <IDs with a "not recalled", comma-separated>
```

Done when it printed the row.

If the learner asks you to explain a concept mid-quiz, give the source link and rung 1 of the ladder, then continue.
