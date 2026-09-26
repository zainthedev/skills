# dojo scripts

TypeScript, no build step, no dependencies: run with `node <script>.ts ...` (Node 24 or newer) or `bun <script>.ts ...`; `--help` on any script is the reference. The `dojo` skill tells commands where this directory is. Tests live outside the skill, in `plugins/dojo/tests/`, and run with `npm test` from `plugins/dojo`.

- `init-workspace.ts`: creates a workspace from the intake answers (profile, lesson zero from `../templates/`, ledger, quiz log, directories).
- `next-item.ts`: prints the next planned, current, or all syllabus items as JSON with their file paths.
- `context.ts`: prints the digest a research pass works from for one item or the syllabus: profile, section plan, previous items, ledger, scout top resources; sampled prompts and answers for a checkpoint.
- `mark-done.ts`: sets one syllabus row's status and date, leaving every other byte alone.
- `lint.ts`: checks the syllabus, ledger and every generated or done item against the formats and the style rules in `lib/style.ts`; exit 1 on any error.
- `build-site.ts`: renders the workspace to a static site with a syllabus sidebar, reveal controls and done buttons, using `site/`.
- `serve.ts`: serves the site on 127.0.0.1 and turns the done button's request into a mark-done plus rebuild.
- `scout.ts`: gathers community endorsement for a topic from public feeds and APIs into `.dojo/scout.json`.
- `measure.ts`: sums the session's token usage from the Claude Code transcript since a timestamp; on other harnesses it says the transcript is unavailable.
- `benchmark.ts`: maintainer tool that regenerates `../TOKENS.md` from headless `claude -p` runs.
