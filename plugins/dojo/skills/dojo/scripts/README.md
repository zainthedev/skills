# dojo scripts

TypeScript, no build step, no dependencies: run with `node <script>.ts ...` (Node 24 or newer) or `bun <script>.ts ...`; `--help` on any script is the reference. The `dojo` skill tells commands where this directory is. Tests live outside the skill, in `plugins/dojo/tests/`, and run with `npm test` from `plugins/dojo`.

- `init-workspace.ts`: creates a workspace from the intake answers (profile, lesson zero from `../templates/`, ledger, quiz log, directories).
- `next-item.ts`: prints the next planned, current, one chosen, or all syllabus items as one line of JSON with relative file paths, the earlier items still unfinished, a start timestamp and, for one item, its row of `../TOKENS.md`.
- `context.ts`: prints the digest a research pass works from for one item or the syllabus: profile, section plan, previous items, ledger, scout top resources with excerpts. `context.ts <workspace> quiz [scope]` prints a capped, interleaved quiz.
- `checkpoint.ts`: writes a checkpoint from the lessons it samples, every rule of `../CHECKPOINT-FORMAT.md` applied mechanically; refuses to overwrite without `--force`.
- `quiz-log.ts`: appends one quiz session's row to `quiz-log.md`.
- `mark-done.ts`: sets one syllabus row's status and date, leaving every other byte alone.
- `lint.ts`: checks the syllabus, ledger and every generated or done item against the formats and the style rules in `lib/style.ts`; exit 1 on any error.
- `build-site.ts`: renders the workspace to a static site with a syllabus sidebar, reveal controls and done buttons, and a page per code review in `reviews/`, using `site/`; `site/dojo.ts` is stripped to `assets/dojo.js` at build time. `--if-exists` does nothing when no site has been built.
- `serve.ts`: serves the site on 127.0.0.1 and turns the done button's request into a mark-done plus rebuild; `--detach` starts it in its own process group so it outlives the session (ADR 0017), `--stop` stops it, and a PID file counts only when its server answers for the workspace.
- `scout.ts`: gathers community endorsement for a topic from public feeds and APIs into `.dojo/scout.json`, or with `--slug` into the system temp dir before the workspace exists; writes a file even when it fails.
- `wait-for.ts`: blocks until a file exists and has stopped growing, then with `--into` moves it into place; `--slug` names the scout's temp file.
- `fetch-log.ts`: the plugin's WebFetch hook (`hooks/hooks.json`) that records every fetch in `.dojo/fetched.jsonl`; `--arm` turns recording on for a directory with no workspace yet, `--collect` merges those records into the workspace and turns it off.
- `guard.ts`: the coach's PreToolUse hook, which keeps a coach session read-only (ADRs 0002, 0018).
- `measure.ts`: sums the session's token usage from the Claude Code transcript since a timestamp; on other harnesses it says the transcript is unavailable.

`guard.ts` and `lib/cli.ts`, `lib/findings.ts`, `lib/frontmatter.ts`, `lib/review.ts`, `lib/sections.ts` and `lib/style.ts` also ship, byte for byte, in the mentor plugin's `skills/mentor-review/scripts/`, so each plugin installs alone. The mentor plugin owns `lib/review.ts`; edit a vendored file in either plugin and copy it to the other, or mentor's `tests/vendored.test.ts` fails.

The lingo plugin carries byte-identical copies of the guard, `measure.ts`, `mark-done.ts`, the format-free `lib/` modules, the scout's `lib/scout/` modules and `site/dojo.css` (as `lingo.css`); lingo's `tests/vendored.test.ts` fails when one drifts, so copy a change here to `plugins/lingo/skills/lingo/scripts/` too.
