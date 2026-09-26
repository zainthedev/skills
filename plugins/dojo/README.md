# dojo

Odin-Project-style learning courses for technical topics, generated into a directory you work through mostly without AI.

`dojo` interviews you once, researches how the topic is taught and which free resources people actually recommend, and writes a syllabus of sections, projects and checkpoints. Each lesson orients you in a few hundred cited words, then sends you to the best free resources for the real material. Projects have requirements and no walkthrough. Checkpoints ask you questions from memory. The only AI help while you learn is a coach that asks questions and points at resources, and will not write your code.

## Quick start

1. Install the skills for your agent (below). You need Node 24 or newer, or Bun, on your PATH.
2. Open your agent in a directory for your courses, not inside a work repo:

   ```bash
   mkdir -p ~/courses && cd ~/courses && claude
   ```

3. Run `/dojo-plan <topic>` (`$dojo-plan <topic>` on Codex), putting what you want to learn in place of `<topic>`; to learn Docker, that is `/dojo-plan Docker`. It asks one round of questions: your goal, what you have built before, hours per week and a target date, and it states what each lesson, project and checkpoint costs in tokens. It then researches for a few minutes and writes the course into a directory named after the topic, or into the one you give after the topic.
4. It ends by starting the course's site on your machine and printing its address, such as `http://127.0.0.1:4321/`. Open it and read "How this course works" first: it is the course's rules, including what the AI will and will not do from here on. Close the session; the site keeps running.
5. `/dojo-next` generates the first lesson, and the site shows it. Close the session and go learn, and mark the lesson done on the site when you finish. Come back with `/dojo-next` for the next item, `/dojo-coach` when you are stuck, and `/dojo-quiz` to test recall. After a restart of your computer, `/dojo-build` starts the site again.

## Install

The skills follow the Agent Skills format, so they run on any agent that supports it. On Claude Code, use the plugin: it carries the hooks that skills.sh cannot install. On every other agent, use skills.sh. Using both for different agents is fine, but do not point skills.sh at Claude Code as well, or every skill shows up twice.

**Claude Code**, as a managed plugin that updates when the marketplace does:

```bash
claude plugin marketplace add zainthedev/skills
claude plugin install dojo@zainhill
```

**Codex, Cursor, Copilot and other agents**, as editable skill files copied into your project by [skills.sh](https://skills.sh):

```bash
npx skills@latest add zainthedev/skills
```

The installer lets you choose skills and target agents. Take the six `dojo` skills together: `dojo` holds the scripts and formats the other five run on. To skip the picker, name the skills:

```bash
npx skills@latest add zainthedev/skills --skill dojo --skill dojo-plan
```

Requirements: an agent with web fetch and web search, and Node 24 or newer (or Bun) for the bundled scripts. The scripts have no dependencies and no build step.

### Desktop apps

- **Claude Code Desktop** shares its settings and installed plugins with the CLI, so the two marketplace commands above, run once in a terminal, make `/dojo-plan` available in the Code tab. Open the course directory as the session's folder.
- **The Codex app** reads the skills directory skills.sh fills (`~/.agents/skills` with `-g`, or the project's `.agents/skills`) and shows each skill in its picker with the name from `agents/openai.yaml`. Its sandbox blocks network access for shell commands by default; the scout and the fetch steps need it, so allow network for the session or the plan step reports thin evidence. Codex has no hooks, so the coach's read-only rule is held by instruction there.
- **Cursor, VS Code with Copilot, and the rest of the skills.sh list** read the project-level directory skills.sh writes to. None of them run Claude Code hooks, so the same coach note applies, and the research pass records its own fetches.

Contributors working on the skills themselves use `scripts/link-skills.sh` at the repo root, which symlinks every skill into `~/.claude/skills` and `~/.agents/skills` so a `git pull` updates them. It brings no plugin hooks, and with the plugin also installed Claude Code lists every skill twice.

## Commands

| Command | What it does |
|---------|--------------|
| `/dojo-plan <topic> [dir]` | One round of questions, research, then a syllabus in a workspace directory and the course's site, running |
| `/dojo-next [ID]` | Asks which earlier items you finished, then generates the next lesson, project or checkpoint |
| `/dojo-quiz [ID or section]` | Retrieval practice, graded after each attempt |
| `/dojo-coach [what you're stuck on]` | Hints and questions up a four-rung ladder; never a solution; makes the session read-only for your files |
| `/dojo-build [dir]` | Starts the course's local site again, for example after a restart; `/dojo-plan` starts it the first time |

For a senior's review of your project code, the separate [mentor](../mentor) plugin's `/mentor-review` works inside a workspace: it checks the project's requirements, never gives an answer there, and the site lists its reviews.

This page writes the short form. On Claude Code the documented form for a plugin command is namespaced, `/dojo:dojo-plan`; Codex uses `$dojo-plan`. A sixth skill, `dojo`, is not a command: it holds the formats, rules, scripts and token table the five share, and the agent loads it on its own when a directory holds a dojo `profile.md`.

## What it refuses to do, and why

The Odin Project's position is "we do not recommend using AI tools for your learning". The research is narrower: learners with unrestricted AI did better on practice and worse on the unassisted test afterwards, while a tutor that gave hints and withheld answers removed the harm. So `dojo` keeps the AI to three roles. Before you start an item it plans, curates and writes orientation text with citations. During an item, `/dojo-coach` climbs a ladder of questions and pointers with a concrete micro-action each time, and stops before the answer. `/dojo-quiz` grades recall after your attempt. There is no tutor mode.

A coach session is read-only for your files. On Claude Code, invoking the coach registers a tool-level guard for the rest of the session: every tool call passes through it, and only reading tools, one plain call to a read-only dojo script, an append to the quiz log, and a review written by the mentor plugin's reviewer get through, so it cannot edit files even when asked, whether through an edit tool, a shell command or an MCP tool. On other agents the coach holds the same rule by instruction, and lesson zero tells the learner which applies. Every claim above has a citation in [docs/evidence.md](docs/evidence.md), and every deliberate departure from The Odin Project is an ADR in [docs/adr](docs/adr).

## What a workspace holds

| File | Purpose |
|------|---------|
| `profile.md` | Your goal, level and time; the marker that makes a directory a workspace |
| `syllabus.md` | Sections of lessons, projects and checkpoints, with status. The single record of progress |
| `00-how-this-works.md` | The rules of the course, including the AI rules |
| `ledger.md` | Every resource considered, its score, its evidence and where it is used |
| `lessons/`, `projects/`, `checkpoints/` | One Markdown file per item; lessons have a sidecar `.answers.md` |
| `quiz-log.md` | One row per quiz session |
| `site/` | The rendered site; safe to delete and rebuild |

Keep the workspace out of the repository you work in. A directory of its own, or its own repository, is the right home.

## Tokens

Generation costs tokens; learning does not. `dojo-plan` states what each item will cost at your level, `dojo-next` shows the estimate before it generates, and both report the actual usage of the run afterwards on Claude Code, whose transcript the measure script reads; other agents show their own usage. The estimates live in [skills/dojo/TOKENS.md](skills/dojo/TOKENS.md); the runs behind them, and what inflated them, are in [docs/token-runs.md](docs/token-runs.md). Format is free: the site is rendered from the Markdown by a script, not written by the model.

Measured on Opus 5.5, a lesson costs about 180k to 260k weighted tokens, a checkpoint about 40k now that a script writes it, and, as upper bounds from earlier runs, a syllabus 330k and a project with a starter 270k, so a six-section course is roughly 6M weighted tokens spread over the weeks you take. Research depth turned out not to move a lesson's cost, so there is no depth question: every pass has one fixed budget ([ADR 0014](docs/adr/0014-research-budgets-are-fixed-by-item-type-there-is-no-depth-question.md)). Most of a lesson's cost is the research pass, and every token it takes into context is paid once as input and again on every later turn, so the pass works from a computed digest of the workspace rather than the files, fetches extracts rather than page summaries, and can run on a cheaper model by setting `research_model` in `profile.md` where the agent allows a subagent to use one ([ADR 0013](docs/adr/0013-research-passes-read-a-digest-fetch-extracts-and-may-run-on-a-cheaper-model.md)). None of this cuts what a lesson contains: every citation is still fetched before it is used, and on Claude Code a hook records the fetch rather than the pass ([ADR 0015](docs/adr/0015-fetches-are-recorded-by-a-harness-hook-where-one-exists.md)).

## Writing

Every sentence a learner reads follows [skills/dojo/STYLE.md](skills/dojo/STYLE.md): no throat-clearing, no AI vocabulary, no adverbs, no "not X but Y", no dashes, no cheering, and a coach that never opens with "great question". The word and phrase half is a lint rule, so a slip is caught without spending tokens ([ADR 0012](docs/adr/0012-one-style-for-every-sentence-inherited-from-stop-slop-and-lint-enforced.md)).

## Network use

Community endorsement comes from public feeds and APIs, gathered by the scout script once per course: Reddit RSS feeds at one request per 30 seconds, a Pushshift successor for comment scores, Wayback snapshots of subreddit wikis, and the Hacker News, Stack Exchange, dev.to and GitHub APIs. It never scrapes reddit.com HTML. Set `GITHUB_TOKEN` to raise the GitHub rate limit.

## Why not Matt Pocock's `teach`?

`teach` is an agent that teaches you interactively, one HTML lesson per session, from resources it found. `dojo` is a course you work through yourself, with the agent kept at arm's length: a syllabus first, curated Markdown lessons, projects, checkpoints, and a coach that will not write code. The full comparison is [ADR 0007](docs/adr/0007-dojo-is-independent-of-the-teach-skill.md).

## Layout

```
skills/dojo/         formats, STYLE.md, TOKENS.md, scripts/, templates/  (the shared root)
skills/dojo-plan/    one folder per command, each with agents/openai.yaml for Codex
skills/dojo-next/
skills/dojo-quiz/
skills/dojo-coach/   whose read-only guard is skills/dojo/scripts/guard.ts, shared with the mentor plugin
skills/dojo-build/
hooks/               hooks.json: the plugin-level WebFetch hook that records fetches
tests/               node --test suite for the scripts
evals/               claude plugin eval cases
docs/                spec, ADRs, evidence
```

## Design

- [CONTEXT.md](CONTEXT.md): the vocabulary.
- [docs/spec.md](docs/spec.md): the design.
- [docs/adr](docs/adr): every decision with a trade-off.
- [docs/evidence.md](docs/evidence.md): the research behind the design, with citations.

## License

MIT. The Odin Project's curriculum is CC BY-NC-SA 4.0; `dojo` borrows its structure and philosophy, links to its lessons as resources, and copies none of its text. The style rules in `skills/dojo/STYLE.md` and the word lists in `scripts/lib/style.ts` adapt Hardik Pandya's MIT-licensed stop-slop, copyright 2025, extended with the patterns Wikipedia's AI Cleanup project tracks.
