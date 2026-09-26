---
name: dojo-plan
description: Start a dojo course. One round of questions, then research into how the topic is taught and which free resources people recommend, then a syllabus in a workspace directory.
argument-hint: "<topic> [workspace directory]"
disable-model-invocation: true
allowed-tools: Bash(node *), Bash(bun *), Bash(date *)
---

Create a **workspace** for one topic. Call the Skill tool with "dojo": it gives you the dojo root that every command below runs from, then read its PROFILE-FORMAT.md and SYLLABUS-FORMAT.md. Read nothing else until a step names it.

A topic written as `@scope/package` reaches you as a file reference on Claude Code, not as text; if the argument looks like a path, ask for the topic in quotes.

## Process

### 1. Start the clock and the scout

Record the start time with `date -u +%Y-%m-%dT%H:%M:%SZ`; the token report at the end needs it.

From the topic alone, choose two or three subreddits where people ask how to learn it and two or three search phrases a learner would type; more than nine feeds will not fit the scout's budget. Arm the fetch log for this directory, since the workspace does not exist yet, then start the scout in the background, keyed by the slug, so it runs while you interview:

```bash
node <dojo root>/scripts/fetch-log.ts --arm
node <dojo root>/scripts/scout.ts --slug <slug> --topic "<topic>" --subreddits <a,b> --keywords "<k1>|<k2>|<k3>"
```

The scout writes to the system temp directory, prints that path first, and writes a file even when it fails, so the wait in step 3 always ends. Done when the scout is running.

### 2. Intake

One round, every question at once, numbered, each with its default. Skip any the arguments already answered.

1. **Goal**: what will you be able to build or do at the end? Push past "learn X" to a thing that could be the capstone.
2. **Level**: what adjacent things have you built, in what stack? Assign beginner, intermediate or advanced from the answer using PROFILE-FORMAT.md, and say which you assigned.
3. **Time**: hours per week, and a target date.
4. **Workspace directory**: default `./<slug>`. Advise against a directory inside a work repo.
5. At most one topic-specific fork, only when the topic forces one, such as TypeScript or JavaScript.

With the questions, state what generation costs from the dojo root's TOKENS.md: the syllabus once, then each lesson, project and checkpoint at the assigned level. Done when every profile field has a value and the learner has seen the level you assigned.

### 3. Initialise

If `<dir>/profile.md` exists, stop: ask whether to extend the existing course or start over in another directory. Never overwrite. Otherwise:

```bash
node <dojo root>/scripts/init-workspace.ts --dir <dir> --topic "<topic>" --slug <slug> --level <level> --hours <n> --target <YYYY-MM-DD> --goal "<goal>" --experience "<experience>" --notes "<fork answer>"
```

The syllabus pass needs the scout's signal, so block on its file and move it into place with one call. Give the shell call a ten-minute limit (on Claude Code, the Bash tool's timeout of 600000 milliseconds); the script's own default of 540 seconds stays under it:

```bash
node <dojo root>/scripts/wait-for.ts --slug <slug> --into <dir>/.dojo/scout.json
```

If it exits 1, run it once more. If that times out too, tell the learner and continue with thin evidence: the ledger's `thin_evidence` flag records it. Done when `profile.md`, `00-how-this-works.md` and `.dojo/scout.json` exist.

### 4. Syllabus pass

Read `<dojo root>/templates/brief.md` now and fill in its syllabus variant. Give it to a subagent where your harness can spawn one, on the model `research_model` in `profile.md` names when the harness allows a choice; otherwise do it yourself in this session under the same budget. Wait for the report. Then, in one call:

```bash
node <dojo root>/scripts/fetch-log.ts --collect <dir> && node <dojo root>/scripts/lint.ts <dir>
```

Send errors back to the pass, or fix small ones yourself. Done when lint is clean and the syllabus's total hours fit the learner's weeks with a fifth to spare.

### 5. Report

Show the outline (sections, items per section, total hours), the structure sources it followed, the top five ledger resources with scores, and the tokens this run used:

```bash
node <dojo root>/scripts/measure.ts --since <start time>
```

If it reports the transcript unavailable, say so and name the harness's own usage display instead. State `Lint: clean` on its own line once lint passed. Close with the learner's next step: read `00-how-this-works.md`, then run `/dojo-next`. Done when they have it.
