---
name: dojo-next
description: Generate the next item in your dojo syllabus, a lesson, a project or a checkpoint, after settling whether you finished the last one.
argument-hint: "[item ID, to generate a specific item instead of the next planned one]"
disable-model-invocation: true
---

Generate one **item**. Call the Skill tool with "dojo": it gives you the dojo root that every command below runs from, then read its RESEARCH.md and the format file for the item's type.

## Process

### 1. Locate

Record the start time with `date -u +%Y-%m-%dT%H:%M:%SZ`. Find the workspace and the item:

```bash
node <dojo root>/scripts/next-item.ts <workspace> --json
```

Use the argument's ID instead when one was given. Done when you know the item's id, type, title, target path, and the previous items in its section.

### 2. Settle the previous item

If the previous item is `generated` rather than `done`, ask one question: did you finish it? On yes:

```bash
node <dojo root>/scripts/mark-done.ts <workspace> <previous ID>
```

On no, ask whether to generate the next item anyway; it is the learner's call. Done when every earlier item's status matches what the learner told you.

### 3. Estimate

State the token estimate for this item type at the profile's depth and level, from the dojo root's TOKENS.md, then proceed. Done when the estimate is on screen.

### 4. Generate

- **Lesson** or **project**: run one research pass with the brief from RESEARCH.md. Give it to a subagent where your harness can spawn one; otherwise do it yourself in this session under the same budget. A project uses the quick budget whatever the profile says. A completion project also writes its `starter/`.
- **Checkpoint**: no research. Read the sampled lessons' Retrieval practice sections and sidecars yourself and write the checkpoint per CHECKPOINT-FORMAT.md.

Done when the files exist and the pass's report lists files, budget used and a clean lint.

### 5. Verify and mark

```bash
node <dojo root>/scripts/lint.ts <workspace> <ID>
node <dojo root>/scripts/mark-done.ts <workspace> <ID> --status generated
```

Fix every lint error before marking. If `<workspace>/site/index.html` exists, rebuild it with `node <dojo root>/scripts/build-site.ts <workspace>`. Done when lint is clean and the syllabus row reads `generated`.

### 6. Report

Title, path, the assignment's resources by title, authored word count, and the tokens used:

```bash
node <dojo root>/scripts/measure.ts --since <start time>
```

If it reports the transcript unavailable, say so and name the harness's own usage display instead. State `Lint: clean` on its own line once lint passed, so evals can check it. Close with the rule: close this session and go learn; `/dojo-next` when it is done, `/dojo-coach` if stuck. Done when the learner has that.
