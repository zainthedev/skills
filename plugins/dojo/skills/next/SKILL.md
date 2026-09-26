---
name: next
description: Generate the next item in your dojo syllabus, a lesson, a project or a checkpoint, after settling whether you finished the last one.
argument-hint: "[item ID, to generate a specific item instead of the next planned one]"
disable-model-invocation: true
---

Generate one **item**. Call the Skill tool with "dojo-conventions", then read its RESEARCH.md and the format file for the item's type.

## Process

### 1. Locate

Record the start time with `date -u +%Y-%m-%dT%H:%M:%SZ`. Find the workspace and the item:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/next-item.ts <workspace> --json
```

Use the argument's ID instead when one was given. Done when you know the item's id, type, title, target path, and the previous items in its section.

### 2. Settle the previous item

If the previous item is `generated` rather than `done`, ask one question: did you finish it? On yes:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/mark-done.ts <workspace> <previous ID>
```

On no, ask whether to generate the next item anyway; it is the learner's call. Done when every earlier item's status matches what the learner told you.

### 3. Estimate

State the token estimate for this item type at the profile's depth and level, from `${CLAUDE_PLUGIN_ROOT}/docs/tokens.md`, then proceed. Done when the estimate is on screen.

### 4. Generate

- **Lesson** or **project**: dispatch one subagent with the brief from RESEARCH.md. A project uses the quick budget whatever the profile says. A completion project also writes its `starter/`.
- **Checkpoint**: no research. Read the sampled lessons' Retrieval practice sections and sidecars yourself and write the checkpoint per CHECKPOINT-FORMAT.md.

Done when the files exist and, for a subagent, its report lists files, budget used and a clean lint.

### 5. Verify and mark

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/lint.ts <workspace> <ID>
node ${CLAUDE_PLUGIN_ROOT}/scripts/mark-done.ts <workspace> <ID> --status generated
```

Fix every lint error before marking. If `<workspace>/site/index.html` exists, rebuild it with `node ${CLAUDE_PLUGIN_ROOT}/scripts/build-site.ts <workspace>`. Done when lint is clean and the syllabus row reads `generated`.

### 6. Report

Title, path, the assignment's resources by title, authored word count, and the tokens used:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/measure.ts --since <start time> --session ${CLAUDE_SESSION_ID}
```

State `Lint: clean` on its own line once lint passed, so evals can check it. Close with the rule: close this session and go learn; `/dojo:next` when it is done, `/dojo:coach` if stuck. Done when the learner has that.
