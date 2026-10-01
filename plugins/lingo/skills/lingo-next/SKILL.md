---
name: lingo-next
description: Generate the next item in your lingo syllabus, a lesson, a task or a checkpoint, after settling whether you finished the last one.
argument-hint: "[item ID, to generate a specific item instead of the next planned one]"
disable-model-invocation: true
allowed-tools: Bash(node *), Bash(bun *)
---

Generate one **item**. Call the Skill tool with "lingo": it gives you the lingo root that every command below runs from. Read nothing else until a step names it: the research pass reads the format for itself.

## Process

### 1. Locate

```bash
node <lingo root>/scripts/next-item.ts <workspace>
```

Add `--id <ID>` when the argument named one. The line it prints carries `started`, the timestamp the token report needs, and `estimate`, the item's row of the token table; keep both. Done when you know the item's id, type, title, target path and its `unfinished` list.

### 2. Settle the unfinished items

`unfinished` lists every earlier item, in any section, that was generated and never marked done. If it is empty, skip this step. Otherwise ask one question naming them: which of these did you finish? For each one they finished:

```bash
node <lingo root>/scripts/mark-done.ts <workspace> <ID>
```

If some are unfinished, ask whether to generate the next item anyway; it is the learner's call. Done when every earlier item's status matches what the learner told you.

### 3. Estimate

State the `estimate` from the next-item line, then proceed. Done when the estimate is on screen.

### 4. Generate

- **Lesson** or **task**: read `<lingo root>/templates/brief.md` now and fill it in for this item. Give it to a subagent where your harness can spawn one, on the model `research_model` in `profile.md` names when the harness allows a choice; otherwise do it yourself in this session under the same budget.
- **Checkpoint**: a script writes it; read nothing and write nothing yourself:

  ```bash
  node <lingo root>/scripts/checkpoint.ts <workspace> <ID>
  ```

  If it says there are too few prompts, tell the learner which lessons to generate or finish first and stop.

Done when the pass's report lists its files, the assignment's resources by title, the Words count, the authored word count, the budget used and a clean lint, or, for a checkpoint, when the script printed the file it wrote.

### 5. Verify, mark, export and measure

One call:

```bash
node <lingo root>/scripts/fetch-log.ts --collect <workspace> && node <lingo root>/scripts/lint.ts <workspace> <ID> && node <lingo root>/scripts/mark-done.ts <workspace> <ID> --status generated && node <lingo root>/scripts/deck.ts <workspace> && node <lingo root>/scripts/build-site.ts <workspace> --if-exists && node <lingo root>/scripts/measure.ts --since <started>
```

If lint fails, the chain stops there: send the errors back to the pass or fix small ones yourself, then run the call again. Done when it ran through and the syllabus row reads `generated`.

### 6. Report

From the pass's report and the measure output: title, path, the assignment's resources by title, the number of new words and the deck's note count, authored word count, anything the pass could not verify, and the tokens used. For a checkpoint: title, path, the prompt and word counts and the lessons it samples, from the script's line, and the tokens used. If measure reported the transcript unavailable, say so and name the harness's own usage display instead. State `Lint: clean` on its own line, so evals can check it. Close with the rule: close this session and go learn from the site, which now shows the new item; import `deck.tsv` into Anki for a lesson; mark the item done on the site, then `/lingo-next` for the next one, `/lingo-talk` to practise, `/lingo-coach` if stuck. Done when the learner has that.
