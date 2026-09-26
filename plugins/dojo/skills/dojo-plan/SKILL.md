---
name: dojo-plan
description: Start a dojo course. One round of questions, then research into how the topic is taught and which free resources people recommend, then a syllabus in a workspace directory.
argument-hint: "<topic> [workspace directory]"
disable-model-invocation: true
---

Create a **workspace** for one topic. Call the Skill tool with "dojo": it gives you the dojo root that every command below runs from, then read its PROFILE-FORMAT.md, SYLLABUS-FORMAT.md and RESEARCH.md.

## Process

### 1. Start the clock and the scout

Record the start time with `date -u +%Y-%m-%dT%H:%M:%SZ`; the token report at the end needs it.

From the topic alone, choose two to four subreddits where people ask how to learn it and three search phrases a learner would type. Start the scout in the background now, writing to a temporary file, so it runs while you interview:

```bash
node <dojo root>/scripts/scout.ts "${TMPDIR:-/tmp}/dojo-scout" --topic "<topic>" --subreddits <a,b,c> --keywords "<k1>|<k2>|<k3>" --out "${TMPDIR:-/tmp}/dojo-scout-<slug>.json"
```

Done when the scout is running and you have noted its output path.

### 2. Intake

One round, every question at once, numbered, each with its default. Skip any the arguments already answered.

1. **Goal**: what will you be able to build or do at the end? Push past "learn X" to a thing that could be the capstone.
2. **Level**: what adjacent things have you built, in what stack? Assign beginner, intermediate or advanced from the answer using PROFILE-FORMAT.md, and say which you assigned.
3. **Time**: hours per week, and a target date.
4. **Workspace directory**: default `./<slug>`. Advise against a directory inside a work repo.
5. **Depth**: quick, standard or deep, with the token estimate for each from the dojo root's TOKENS.md. Default standard.
6. At most one topic-specific fork, only when the topic forces one, such as TypeScript or JavaScript.

Done when every profile field has a value and the learner has seen the level you assigned.

### 3. Initialise

If `<dir>/profile.md` exists, stop: ask whether to extend the existing course or start over in another directory. Never overwrite. Otherwise:

```bash
node <dojo root>/scripts/init-workspace.ts --dir <dir> --topic "<topic>" --slug <slug> --level <level> --depth <depth> --hours <n> --target <YYYY-MM-DD> --goal "<goal>" --experience "<experience>" --notes "<fork answer>"
```

Wait for the scout to finish; it takes a few minutes and the syllabus pass needs its signal. Move its output to `<dir>/.dojo/scout.json`. Done when `profile.md`, `00-how-this-works.md` and `.dojo/scout.json` exist.

### 4. Syllabus pass

Run one research pass with the brief from RESEARCH.md, the syllabus variant, at double the budget for the chosen depth. Give it to a subagent where your harness can spawn one; otherwise do it yourself in this session under the same budget. Wait for the report. Then:

```bash
node <dojo root>/scripts/lint.ts <dir>
```

Send errors back to the pass, or fix small ones yourself. Done when lint is clean and the syllabus's total hours fit the learner's weeks with a fifth to spare.

### 5. Report

Show the outline (sections, items per section, total hours), the structure sources it followed, the top five ledger resources with scores, and the tokens this run used:

```bash
node <dojo root>/scripts/measure.ts --since <start time>
```

If it reports the transcript unavailable, say so and name the harness's own usage display instead. State `Lint: clean` on its own line once lint passed. Close with the learner's next step: read `00-how-this-works.md`, then run `/dojo-next`. Done when they have it.
