---
name: lingo-plan
description: Start a lingo language course. One round of questions, then research into how the language is taught and which free resources learners recommend, then a syllabus in a workspace directory.
argument-hint: "<language and variety> [workspace directory]"
disable-model-invocation: true
allowed-tools: Bash(node *), Bash(bun *), Bash(date *)
---

Create a **workspace** for one language. Call the Skill tool with "lingo": it gives you the lingo root that every command below runs from, then read its PROFILE-FORMAT.md and SYLLABUS-FORMAT.md. Read nothing else until a step names it.

## Process

### 1. Start the clock and the scout

Record the start time with `date -u +%Y-%m-%dT%H:%M:%SZ`; the token report at the end needs it.

From the language alone, choose two or three subreddits where people ask how to learn it, always including `languagelearning` and the language's main learner subreddit (`learnspanish`, `LearnJapanese`, `German`), and two or three search phrases a learner would type ("best podcast for learning <language>", "<language> graded readers", "<language> beginner resources"); more than nine feeds will not fit the scout's budget. Arm the fetch log for this directory, since the workspace does not exist yet, then start the scout in the background, keyed by the slug, so it runs while you interview:

```bash
node <lingo root>/scripts/fetch-log.ts --arm
node <lingo root>/scripts/scout.ts --slug <slug> --topic "learning <language>" --subreddits <a,b,c> --keywords "<k1>|<k2>|<k3>"
```

The scout writes to the system temp directory, prints that path first, and writes a file even when it fails, so the wait in step 3 always ends. Done when the scout is running.

### 2. Intake

One round, every question at once, numbered, each with its default. Skip any the arguments already answered.

1. **Language and variety**: which language, and which variety if it has several (Mexican or Castilian Spanish, European or Brazilian Portuguese). Derive `language_code` from it.
2. **Native language**: default English. Lessons are written in it at the start (LESSON-FORMAT.md).
3. **Goal**: what will you be able to do in the language at the end, with whom, in what situation? Push past "be fluent" to a thing that could be the capstone. Ask whether an exam is part of it (DELE, DELF, Goethe, JLPT, TOPIK, HSK and the like).
4. **What you can do now**: show the placement table from PROFILE-FORMAT.md, one row per skill, and ask the learner to say which descriptor fits for listening, reading, speaking and writing, or "none yet". Assign each skill's level and the overall level from the answers, and say what you assigned.
5. **Focus**: which skills matter most to you, in order.
6. **Time**: hours per week, and a target date. Propose a target level from the goal, then check it against the hours (PROFILE-FORMAT.md); if they do not reach it, say so and offer the level they reach.
7. **Workspace directory**: default `./<slug>`. Advise against a directory inside a work repo.

With the questions, state what generation costs from the lingo root's TOKENS.md: the syllabus once, then each lesson, task and checkpoint at the assigned level, and that talk, review and quiz sessions cost what the conversation costs. Done when every profile field has a value and the learner has seen the levels you assigned.

### 3. Initialise

If `<dir>/profile.md` exists, stop: ask whether to extend the existing course or start over in another directory. Never overwrite. Otherwise:

```bash
node <lingo root>/scripts/init-workspace.ts --dir <dir> --language "<language>" --code <tag> --native "<native>" --level <overall> --listening <l> --reading <l> --speaking <l> --writing <l> --target-level <target> --exam "<exam or none>" --hours <n> --target <YYYY-MM-DD> --goal "<goal>" --experience "<experience>" --focus "<focus>" --notes "<variety and preferences>"
```

The syllabus pass needs the scout's signal, so block on its file and move it into place with one call. Give the shell call a ten-minute limit (on Claude Code, the Bash tool's timeout of 600000 milliseconds); the script's own default of 540 seconds stays under it:

```bash
node <lingo root>/scripts/wait-for.ts --slug <slug> --into <dir>/.lingo/scout.json
```

If it exits 1, run it once more. If that times out too, tell the learner and continue with thin evidence: the ledger's `thin_evidence` flag records it. Done when `profile.md`, `00-how-this-works.md` and `.lingo/scout.json` exist.

### 4. Syllabus pass

Read `<lingo root>/templates/brief.md` now and fill in its syllabus variant. Give it to a subagent where your harness can spawn one, on the model `research_model` in `profile.md` names when the harness allows a choice; otherwise do it yourself in this session under the same budget. Wait for the report. Then, in one call:

```bash
node <lingo root>/scripts/fetch-log.ts --collect <dir> && node <lingo root>/scripts/lint.ts <dir>
```

Send errors back to the pass, or fix small ones yourself. Done when lint is clean and the syllabus's total hours fit the learner's weeks with a fifth to spare.

### 5. Build and serve the site

The site is where the learner works through the course, so start it now. This builds `<dir>/site/` and starts the local server in its own process group, so it keeps running after this session closes; it prints the URL:

```bash
node <lingo root>/scripts/serve.ts <dir> --detach
```

If it fails, say so, give the path of `<dir>/site/index.html`, which opens as plain files without the done button, and name `/lingo-build` as the way to start the server later. Done when the URL, or that fallback, is on screen.

### 6. Report

Show the outline (sections, items per section, total hours), the level the hours reach against the target, the structure sources it followed, the top five ledger resources with scores, and the tokens this run used:

```bash
node <lingo root>/scripts/measure.ts --since <start time>
```

If it reports the transcript unavailable, say so and name the harness's own usage display instead. State `Lint: clean` on its own line once lint passed. Close with the learner's next step: open the site's URL and start with "How this course works", install Anki if they do not have it, then close this session, which leaves the site running; run `/lingo-next` in a new session for the first lesson. After a restart of the computer, `/lingo-build` starts the site again. Done when they have it.
