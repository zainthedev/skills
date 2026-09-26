# dojo scripts
TypeScript, no build step, no dependencies: run with `node <script>.ts ...` (Node 24 or newer) or `bun <script>.ts ...`; `--help` on any script is the reference. Tests: `npm test` in `plugins/dojo` (`node --test "scripts/tests/*.test.ts"`).
- `init-workspace.ts`: creates a workspace from the intake answers (profile, lesson zero, ledger, quiz log, directories).
- `next-item.ts`: prints the next planned, current, or all syllabus items as JSON with their file paths.
- `mark-done.ts`: sets one syllabus row's status and date, leaving every other byte alone.
- `lint.ts`: checks the syllabus, ledger and every generated or done item against the formats; exit 1 on any error.
- `build-site.ts`: renders the workspace to a static site with a syllabus sidebar, reveal controls and done buttons.
- `serve.ts`: serves the site on 127.0.0.1 and turns the done button's request into a mark-done plus rebuild.
- `measure.ts`: sums the session's token usage from the Claude Code transcript since a timestamp.
- `benchmark.ts`: maintainer tool that regenerates `docs/tokens.md` from headless `claude -p` runs.
