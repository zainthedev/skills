---
name: dojo-next
description: Generate the next item in your dojo syllabus, a lesson, a project or a checkpoint, after settling whether you finished the last one.
argument-hint: "[item ID, to generate a specific item instead of the next planned one]"
disable-model-invocation: true
allowed-tools: Bash(node *), Bash(bun *)
---

Generate one **item**. Call the Skill tool with "dojo": it gives you the dojo root that every command below runs from. Read nothing else until a step names it: the research pass reads the format for itself.

## Process

### 1. Locate

```bash
node <dojo root>/scripts/next-item.ts <workspace>
```

Add `--id <ID>` when the argument named one. The line it prints carries `started`, the timestamp the token report needs; keep it. Done when you know the item's id, type, title, target path and its `unfinished` list.

### 2. Settle the unfinished items

`unfinished` lists every earlier item, in any section, that was generated and never marked done. If it is empty, skip this step. Otherwise ask one question naming them: which of these did you finish? For each one they finished:

```bash
node <dojo root>/scripts/mark-done.ts <workspace> <ID>
```

If some are unfinished, ask whether to generate the next item anyway; it is the learner's call. Done when every earlier item's status matches what the learner told you.

### 3. Estimate

State the token estimate for this item type at the profile's level, from the dojo root's TOKENS.md, then proceed. Done when the estimate is on screen.

### 4. Generate

- **Lesson** or **project**: read `<dojo root>/templates/brief.md` now and fill it in for this item. Give it to a subagent where your harness can spawn one, on the model `research_model` in `profile.md` names when the harness allows a choice; otherwise do it yourself in this session under the same budget. A completion project also writes its `starter/`.
- **Checkpoint**: no research and no subagent. Read `<dojo root>/CHECKPOINT-FORMAT.md` and `<dojo root>/STYLE.md`, run `node <dojo root>/scripts/context.ts <workspace> <ID>`, which prints the sampled lessons' prompts with their answers, link targets, heading anchors and assignment titles, and write the checkpoint yourself in this session from that output alone.

Done when the pass's report lists its files, the assignment's resources by title, the authored word count, the budget used and a clean lint.

### 5. Verify, mark and measure

One call:

```bash
node <dojo root>/scripts/fetch-log.ts --collect <workspace> && node <dojo root>/scripts/lint.ts <workspace> <ID> && node <dojo root>/scripts/mark-done.ts <workspace> <ID> --status generated && node <dojo root>/scripts/build-site.ts <workspace> --if-exists && node <dojo root>/scripts/measure.ts --since <started>
```

If lint fails, the chain stops there: send the errors back to the pass or fix small ones yourself, then run the call again. Done when it ran through and the syllabus row reads `generated`.

### 6. Report

From the pass's report and the measure output: title, path, the assignment's resources by title, authored word count, and the tokens used. If measure reported the transcript unavailable, say so and name the harness's own usage display instead. State `Lint: clean` on its own line, so evals can check it. Close with the rule: close this session and go learn; `/dojo-next` when it is done, `/dojo-coach` if stuck. Done when the learner has that.
