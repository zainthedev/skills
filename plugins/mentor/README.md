# mentor

A senior's code review for a junior developer: `/mentor-review` reads your branch, pull request or files the way a senior reads a pull request, flags the bugs, security holes, hand-rolled code and antipatterns, and makes you find every fix yourself.

Each flag names where to look, what kind of problem it is and how severe, what goes wrong if it ships, one thing to try right now, and a question. It never says what the fix is. Ask about any flag and the reviewer climbs a ladder of questions and pointers with you, one step per message. If you are stuck and need to move on, ask outright for the answer and you get it, in chat; the review records that you asked.

## Quick start

1. Install it (below). You need Node 24 or newer, or Bun, and git on your PATH; reviewing a pull request also needs the GitHub CLI, `gh`, signed in.
2. In your repository, on the branch you want reviewed, run `/mentor-review` (`$mentor-review` on Codex).
3. Read the review, fix what it flags, and run `/mentor-review` again: it re-checks the open flags first and marks the fixed ones resolved.

## Install

**Claude Code**, as a managed plugin:

```bash
claude plugin marketplace add zainthedev/skills
claude plugin install mentor@zainhill
```

**Codex, Cursor, Copilot and other agents**, with [skills.sh](https://skills.sh):

```bash
npx skills@latest add zainthedev/skills --skill mentor-review
```

The skill folder is self-contained: its scripts, rules and format travel with it, and it needs nothing from the `dojo` plugin in the same repository.

## What to review

| You type | It reviews |
|----------|------------|
| `/mentor-review` | This branch against the default branch, plus uncommitted and untracked work. On the default branch, whatever is not pushed yet |
| `/mentor-review branch feature/cart` | Another branch against the default branch |
| `/mentor-review staged` | The staged changes |
| `/mentor-review pr 123` or a pull request URL | A GitHub pull request |
| `/mentor-review src/api` or `"src/**/*.ts"` | Those files, read whole |
| `/mentor-review branch src/api` | This branch's changes inside `src/api` only |
| `/mentor-review backend` | The paths the reviewer maps "backend" to, named in the review |
| `/mentor-review all` | The whole repository |

Lockfiles, build output, vendored, minified and binary files are left out. A review covers at most 60 files and 3,000 lines; above that it shows you a breakdown by directory and asks which part, since a senior would not review a whole codebase in one sitting either.

## What you get

At most seven open flags, ranked by severity, then by how much fixing each one teaches; the rest are counted and come back once those are resolved. Categories: bug, security, hand-rolled, antipattern, design, error-handling, performance, tests, readability. Nothing a formatter or your linter would catch.

The review is saved at `.mentor/reviews/<scope>.md` in your repository. The script lists `.mentor/` in `.git/info/exclude`, so it never shows in `git status`, is never committed, and your teammates never see it. Each scope has one file, and a second review of the same scope updates it.

## What it refuses to do

A review session is read-only for your code. On Claude Code, running `/mentor-review` registers a tool-level guard for the rest of the session: every tool call passes through it, and only reading tools, the reviewer's own three scripts, and edits to the review file get through, so it cannot change your code even when asked. It runs none of your code either: when a flag needs a test run, it asks you to run it and tell it what printed. On other agents the reviewer holds the same rule by instruction. Start a fresh session to edit.

The reason is the evidence on AI and learning: students given unrestricted AI help did better on practice and worse on the test afterwards, while a tutor that gave hints and withheld answers removed that harm (Bastani et al. 2025, [PNAS](https://www.pnas.org/doi/10.1073/pnas.2422633122)). The answer on request exists because real work has deadlines; the review records each one, so you can see how often you took it.

## With dojo

Inside a [dojo](../dojo) course workspace the reviewer checks your project against its requirements, never gives an answer, as the course promises, writes to the workspace's `reviews/`, and the course site lists the review. Apart from the site, it needs dojo for none of this: it recognises the workspace by its `profile.md`.

## Layout

```
skills/mentor-review/   SKILL.md, RULES.md, REVIEW-FORMAT.md, agents/openai.yaml
  scripts/              review-scope.ts, review-mark.ts, review-lint.ts, guard.ts, lib/
tests/                  node --test suite, including the check that vendored files match dojo's
docs/adr/               decisions
```

`guard.ts` and most of `scripts/lib/` are byte-identical copies of files in the dojo plugin, so each plugin installs alone; `tests/vendored.test.ts` fails when a pair drifts ([ADR 0001](docs/adr/0001-the-reviewer-writes-a-full-review-that-withholds-every-fix.md)). Run the tests with `npm test` from this directory.

## License

MIT. The writing rules in `skills/mentor-review/RULES.md` and the word lists in `scripts/lib/style.ts` adapt Hardik Pandya's MIT-licensed stop-slop, copyright 2025, extended with the patterns Wikipedia's AI Cleanup project tracks.
