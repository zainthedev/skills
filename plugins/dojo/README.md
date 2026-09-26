# dojo

Odin-Project-style learning courses for technical topics, generated into a directory you work through mostly without AI.

`dojo` interviews you once, researches how the topic is taught and which free resources people actually recommend, and writes a syllabus of sections, projects and checkpoints. Each lesson orients you in a few hundred cited words, then sends you to the best free resources for the real material. Projects have requirements and no walkthrough. Checkpoints ask you questions from memory. The only AI help while you learn is a coach that asks questions and points at resources, and will not write your code.

## Quick start

1. Install the skills for your agent (below). You need Node 24 or newer, or Bun, on your PATH.
2. Make a directory for the course, not inside a work repo, and open your agent there:

   ```bash
   mkdir ~/learn-rust && cd ~/learn-rust && claude
   ```

3. Run `/dojo-plan Rust` (`$dojo-plan Rust` on Codex). It asks one round of questions: your goal, what you have built before, hours per week and a target date, and how deep the research should go, with a token estimate beside each depth. It then researches for a few minutes and writes `syllabus.md`.
4. Close the session and read `00-how-this-works.md`. It is the course's rules, including what the AI will and will not do from here on.
5. `/dojo-next` generates the first lesson. Close the session and go learn. Come back with `/dojo-next` when it is done, `/dojo-coach` when you are stuck, `/dojo-quiz` to test recall, and `/dojo-build` for a browsable site with a done button.

## Install

The skills follow the Agent Skills format, so they run on any agent that supports it. Two ways in; pick one, because installing both leaves you with every skill twice.

**Claude Code**, as a managed plugin that updates when the marketplace does:

```bash
claude plugin marketplace add zainthedev/skills
claude plugin install dojo@zainhill
```

**Codex, Cursor, Copilot and other agents**, as editable skill files copied into your project by [skills.sh](https://skills.sh):

```bash
npx skills@latest add zainthedev/skills
```

The installer lets you choose skills and target agents. Take the six `dojo` skills together: `dojo` holds the scripts and formats the other five run on. For one skill:

```bash
npx skills@latest add zainthedev/skills --skill dojo --skill dojo-plan
```

Requirements: an agent with web fetch and web search, and Node 24 or newer (or Bun) for the bundled scripts. The scripts have no dependencies and no build step.

### Desktop apps

- **Claude Code Desktop** shares its settings and installed plugins with the CLI, so the two marketplace commands above, run once in a terminal, make `/dojo-plan` available in the Code tab. Open the course directory as the session's folder.
- **The Codex app** reads the skills directory skills.sh fills (`~/.agents/skills` with `-g`, or the project's `.agents/skills`) and shows each skill in its picker with the name from `agents/openai.yaml`. Its sandbox blocks network access for shell commands by default; the scout and the fetch steps need it, so allow network for the session or the plan step reports thin evidence. Codex has no hooks, so the coach's read-only rule is held by instruction there.
- **Cursor, VS Code with Copilot, and the rest of the skills.sh list** read the project-level directory skills.sh writes to. None of them run Claude Code hooks, so the same coach note applies.

Contributors working on the skills themselves use `scripts/link-skills.sh` at the repo root, which symlinks every skill into the same directories so a `git pull` updates them.

## Commands

| Command | What it does |
|---------|--------------|
| `/dojo-plan <topic> [dir]` | One round of questions, research, then a syllabus in a workspace directory |
| `/dojo-next [ID]` | Generates the next lesson, project or checkpoint, after asking whether you finished the last one |
| `/dojo-quiz [ID or section]` | Retrieval practice, graded after each attempt |
| `/dojo-coach [what you're stuck on]` | Hints and questions up a four-rung ladder; never a solution; makes the session read-only for your files |
| `/dojo-build [dir]` | Renders the workspace to a local site with a done button and serves it |

Claude Code also accepts the namespaced form, `/dojo:dojo-plan`; Codex uses `$dojo-plan`. A sixth skill, `dojo`, is not a command: it holds the formats, rules, scripts and token table the five share, and the agent loads it on its own when a directory holds a dojo `profile.md`.

## What it refuses to do, and why

The Odin Project's position is "we do not recommend using AI tools for your learning". The research is narrower: learners with unrestricted AI did better on practice and worse on the unassisted test afterwards, while a tutor that gave hints and withheld answers removed the harm. So `dojo` keeps the AI to three roles. Before you start an item it plans, curates and writes orientation text with citations. During an item, `/dojo-coach` climbs a ladder of questions and pointers with a concrete micro-action each time, and stops before the answer. `/dojo-quiz` grades recall after your attempt. There is no tutor mode.

A coach session is read-only for your files. On Claude Code, invoking the coach registers a tool-level guard for the rest of the session, so it cannot edit files even if asked. On other agents the coach holds the same rule by instruction, and lesson zero tells the learner which applies. Every claim above has a citation in [docs/evidence.md](docs/evidence.md), and every deliberate departure from The Odin Project is an ADR in [docs/adr](docs/adr).

## What a workspace holds

| File | Purpose |
|------|---------|
| `profile.md` | Your goal, level, time and depth; the marker that makes a directory a workspace |
| `syllabus.md` | Sections of lessons, projects and checkpoints, with status. The single record of progress |
| `00-how-this-works.md` | The rules of the course, including the AI rules |
| `ledger.md` | Every resource considered, its score, its evidence and where it is used |
| `lessons/`, `projects/`, `checkpoints/` | One Markdown file per item; lessons have a sidecar `.answers.md` |
| `quiz-log.md` | One row per quiz session |
| `site/` | The rendered site; safe to delete and rebuild |

Keep the workspace out of the repository you work in. A directory of its own, or its own repository, is the right home.

## Tokens

Generation costs tokens; learning does not. `dojo-plan` shows an estimate for each depth before you choose, `dojo-next` shows one before it generates, and both report the actual usage of the run afterwards on Claude Code, whose transcript the measure script reads; other agents show their own usage. The estimates live in [skills/dojo/TOKENS.md](skills/dojo/TOKENS.md), with the measured runs they come from. Format is free: the site is rendered from the Markdown by a script, not written by the model.

Measured on Opus 5.5, a lesson costs about 210k to 270k weighted tokens whatever its depth, a syllabus 420k to 680k, a project with a starter 360k and a checkpoint 170k, so a six-section course at standard depth is roughly 8M weighted tokens spread over the weeks you take. Most of a lesson's cost is the research pass re-reading its own context, so the pass works from a computed digest of the workspace rather than the files, fetches extracts rather than page summaries, and can run on a cheaper model by setting `research_model` in `profile.md` where the agent allows a subagent to use one ([ADR 0013](docs/adr/0013-research-passes-read-a-digest-fetch-extracts-and-may-run-on-a-cheaper-model.md)). None of this cuts what a lesson contains: every citation is still fetched before it is used.

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
skills/dojo-coach/   plus coach-guard.ts, the Claude Code hook
skills/dojo-build/
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

MIT. The Odin Project's curriculum is CC BY-NC-SA 4.0; `dojo` borrows its structure and philosophy, links to its lessons as resources, and copies none of its text. Where text from Matt Pocock's MIT-licensed skills is reused, his notice travels with it. The style rules in `skills/dojo/STYLE.md` and the word lists in `scripts/lib/style.ts` adapt Hardik Pandya's MIT-licensed stop-slop, copyright 2025, extended with the patterns Wikipedia's AI Cleanup project tracks.
