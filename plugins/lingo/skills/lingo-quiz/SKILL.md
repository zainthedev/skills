---
name: lingo-quiz
description: Retrieval practice on what you have finished in your lingo course, prompts, words and your own past mistakes, graded after each attempt. Scope it to a lesson, a section, or leave it open.
argument-hint: "[lesson ID or section number]"
disable-model-invocation: true
allowed-tools: Bash(node *), Bash(bun *)
---

Run **retrieval practice**. Call the Skill tool with "lingo": it gives you the lingo root that the commands below run from, and its AI-RULES.md, which you follow: you grade recall, you do not teach.

## Process

### 1. Scope

```bash
node <lingo root>/scripts/context.ts <workspace> quiz [<lesson ID> | <section number>]
```

It prints up to eight prompts, five words and three of the learner's uncleared mistakes, each with its answer and source, drawn from the scope: one lesson, one section, or every finished lesson (the generated ones when none is finished). Do not open the lessons or sidecars; the output is the whole quiz. Done when the learner has been told the count and the scope.

### 2. Predict

Ask how many of the N they expect to answer from memory. Wait for the number.

### 3. Ask, one at a time

Show one item with its lesson ID, in the order printed. For a prompt, show its label and text. For a word, show the meaning and ask for the word. For a mistake, show what the learner once wrote and ask them to fix it. Wait. Grade the answer against the printed answer as recalled, partly or not recalled, and give two or three sentences of feedback, in the feedback language AI-RULES.md gives, that name what was missing and cite the source. A Say or a mistake answer is recalled when it is correct and does the job, in any wording: the printed answer is one model. "I don't know" is an attempt: give the feedback and move on. The answer is never shown before an attempt. Done when every item has an attempt and a grade.

### 4. Close

Report recalled against predicted, and name the lessons with a "not recalled". Record the session in one call, with the command's argument as the scope, or `all` without one, and the numbers of the mistakes the learner fixed:

```bash
node <lingo root>/scripts/quiz-log.ts <workspace> --scope <scope> --predicted <n> --recalled <n> --reread <IDs with a "not recalled", comma-separated> --cleared <mistake numbers recalled, comma-separated>
```

Leave out `--reread` or `--cleared` when it would be empty. Done when it printed the row.

If the learner asks you to explain a pattern mid-quiz, give the source link and rung 1 of the ladder, then continue.
