# dojo

Odin-Project-style learning courses for technical topics, generated into a directory you work through mostly without AI.

`dojo` interviews you once, researches how the topic is taught and which free resources people actually recommend, and writes a syllabus of sections, projects and checkpoints. Each lesson orients you in a few hundred cited words, then sends you to the best free resources for the real material. Projects have requirements and no walkthrough. Checkpoints ask you questions from memory. The only AI help while you learn is a coach that asks questions and points at resources, and is mechanically unable to write your code.

## Install

```bash
claude plugin marketplace add zainthedev/skills
claude plugin install dojo@zainhill
```

For local development from a checkout:

```bash
claude --plugin-dir ./plugins/dojo
```

Requirements: Claude Code with WebFetch and WebSearch, and Node 24 or newer (or Bun) for the bundled scripts. The scripts have no dependencies and no build step.

## Commands

| Command | What it does |
|---------|--------------|
| `/dojo:plan <topic> [dir]` | One round of questions, research, then a syllabus in a workspace directory |
| `/dojo:next [ID]` | Generates the next lesson, project or checkpoint, after asking whether you finished the last one |
| `/dojo:quiz [ID or section]` | Retrieval practice, graded after each attempt |
| `/dojo:coach [what you're stuck on]` | Hints and questions up a four-rung ladder; never a solution; makes the session read-only for your files |
| `/dojo:build [dir]` | Renders the workspace to a local site with a done button and serves it |

## What it refuses to do, and why

The Odin Project's position is "we do not recommend using AI tools for your learning". The research is narrower: learners with unrestricted AI did better on practice and worse on the unassisted test afterwards, while a tutor that gave hints and withheld answers removed the harm. So `dojo` keeps the AI to three roles. Before you start an item it plans, curates and writes orientation text with citations. During an item, `/dojo:coach` climbs a ladder of questions and pointers with a concrete micro-action each time, and stops before the answer. `/dojo:quiz` grades recall after your attempt. There is no tutor mode, and invoking the coach registers a tool-level guard for the rest of the session so it cannot edit files even if asked. Every claim above has a citation in [docs/evidence.md](docs/evidence.md), and every deliberate departure from The Odin Project is an ADR in [docs/adr](docs/adr).

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

Generation costs tokens; learning does not. `plan` shows an estimate for each depth before you choose, `next` shows one before it generates, and both report the actual usage of the run afterwards. The estimates come from [docs/tokens.md](docs/tokens.md), which a maintainer regenerates from headless runs with `scripts/benchmark.ts`. Format is free: the site is rendered from the Markdown by a script, not written by the model.

## Network use

Community endorsement comes from public feeds and APIs, gathered by `scripts/scout.ts` once per course: Reddit RSS feeds at one request per 30 seconds, a Pushshift successor for comment scores, Wayback snapshots of subreddit wikis, and the Hacker News, Stack Exchange, dev.to and GitHub APIs. It never scrapes reddit.com HTML. Set `GITHUB_TOKEN` to raise the GitHub rate limit.

## Why not Matt Pocock's `teach`?

`teach` is an agent that teaches you interactively, one HTML lesson per session, from resources it found. `dojo` is a course you work through yourself, with the agent kept at arm's length: a syllabus first, curated Markdown lessons, projects, checkpoints, and a coach that cannot write code. The full comparison is [ADR 0007](docs/adr/0007-dojo-is-independent-of-the-teach-skill.md).

## Design

- [CONTEXT.md](CONTEXT.md): the vocabulary.
- [docs/spec.md](docs/spec.md): the design.
- [docs/adr](docs/adr): every decision with a trade-off.
- [docs/evidence.md](docs/evidence.md): the research behind the design, with citations.

## License

MIT. The Odin Project's curriculum is CC BY-NC-SA 4.0; `dojo` borrows its structure and philosophy, links to its lessons as resources, and copies none of its text. Where text from Matt Pocock's MIT-licensed skills is reused, his notice travels with it.
