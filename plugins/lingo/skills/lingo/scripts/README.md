# lingo scripts

TypeScript, no build step, no dependencies: run with `node <script>.ts ...` (Node 24 or newer) or `bun <script>.ts ...`; `--help` on any script is the reference. The `lingo` skill tells commands where this directory is. Tests live outside the skill, in `plugins/lingo/tests/`, and run with `npm test` from `plugins/lingo`.

- `init-workspace.ts`: creates a workspace from the intake answers (profile with per-skill levels, lesson zero from `../templates/`, ledger, the quiz and talk logs, mistakes, directories).
- `next-item.ts`: prints the next planned, current, one chosen, or all syllabus items as one line of JSON with relative file paths, the earlier items still unfinished, a start timestamp and, for one item, its row of `../TOKENS.md`.
- `context.ts`: prints the digest a research pass works from for one item or the syllabus: profile, which language each authored part is in, section plan, previous items, words already taught, ledger, scout top resources with excerpts. `context.ts <workspace> quiz [scope]` prints a capped, interleaved quiz of prompts, words and open mistakes; `context.ts <workspace> talk [scope]` what a conversation practises.
- `checkpoint.ts`: writes a checkpoint of prompts and words from the lessons it samples, every rule of `../CHECKPOINT-FORMAT.md` applied mechanically; refuses to overwrite without `--force`.
- `deck.ts`: writes `deck.tsv`, every lesson's Words as Anki notes with import headers and tags.
- `talk-log.ts`: files a talk record: lints it, appends its row to `talk-log.md` and its corrections to `mistakes.md`.
- `quiz-log.ts`: appends one quiz session's row to `quiz-log.md` and marks the mistakes the learner fixed as cleared.
- `mark-done.ts`: sets one syllabus row's status and date, leaving every other byte alone.
- `lint.ts`: checks the syllabus, ledger and every generated or done item against the formats, and a talk record or writing review named by path, with the style rules in `lib/style.ts` on the English parts; exit 1 on any error.
- `build-site.ts`: renders the workspace to a static site with a syllabus sidebar, reveal controls and done buttons, pages for talk records, writing reviews and mistakes, and the deck to download, using `site/`; `site/lingo.ts` is stripped to `assets/lingo.js` at build time. `--if-exists` does nothing when no site has been built.
- `serve.ts`: serves the site on 127.0.0.1 and turns the done button's request into a mark-done plus rebuild; `--detach` starts it in its own process group so it outlives the session, `--stop` stops it, and a PID file counts only when its server answers for the workspace.
- `scout.ts`: gathers community endorsement for a language's learning resources from subreddit wikis, Reddit and Hacker News into `.lingo/scout.json`, or with `--slug` into the system temp dir before the workspace exists; writes a file even when it fails.
- `wait-for.ts`: blocks until a file exists and has stopped growing, then with `--into` moves it into place; `--slug` names the scout's temp file.
- `fetch-log.ts`: the plugin's WebFetch hook (`hooks/hooks.json`) that records every fetch in `.lingo/fetched.jsonl`; `--arm` turns recording on for a directory with no workspace yet, `--collect` merges those records into the workspace and turns it off.
- `guard.ts`: the PreToolUse hook that keeps a coach, talk or review session read-only, apart from a talk record or a review.
- `measure.ts`: sums the session's token usage from the Claude Code transcript since a timestamp; on other harnesses it says the transcript is unavailable.

Several files are byte-identical copies of dojo's, so each plugin installs alone: `guard.ts`, `measure.ts`, `lib/cli.ts`, `lib/findings.ts`, `lib/frontmatter.ts`, `lib/http.ts`, `lib/markdown.ts`, `lib/review.ts`, `lib/sections.ts`, `lib/sidecar.ts`, `lib/style.ts` and the scout's `lib/scout/` modules. `tests/vendored.test.ts` lists them and fails when a copy drifts; edit dojo's, then copy it here. The guard is also shared with the mentor plugin.
