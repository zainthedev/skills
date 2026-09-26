---
status: accepted
---
# The reviewer writes a full review that withholds every fix

`/mentor-review` reviews the learner's code as a senior reviews a junior's pull request, on any git repository: a branch, the staged changes, a pull request, paths, or all of it. It writes the whole review at once, at most seven open flags ranked by severity, and every flag gives the location, a category and severity, why it matters, a micro-action and a question, and never the fix. A senior's review is where a junior learns the questions a senior asks; handing over the fixes turns it into a patch to apply. It grew out of dojo's coach, which allows "feedback on code the learner wrote, as observations and questions", and keeps the coach's ladder and micro-actions.

The reviewer differs from dojo's coach in one rule. Outside a dojo workspace, a learner who asks outright for a flag's answer gets it, in chat and never as an edit, and the review records that the answer was given. That code is usually real work with a deadline, and a reviewer that never answers would be abandoned for one that answers first. Inside a dojo workspace the reviewer never gives the answer, because dojo's lesson zero promises the course's AI will not write the learner's code, and a review of a course project is part of the course.

## Decisions

- **Scope.** With no argument, the branch against its merge-base with the default branch plus uncommitted and untracked work, or on the default branch what is not pushed yet plus the same. `review-scope.ts` resolves `branch`, `staged`, `pr`, `all`, paths and globs mechanically; words such as "backend" are mapped to paths by the model and stated in the review, with a question only when two mappings are both plausible. Over 60 files or 3,000 lines the script prints a breakdown by directory and the learner narrows the scope, since a senior does not review a whole repository in one sitting.
- **A plugin of its own**, so someone who never runs a dojo course installs only the reviewer: `claude plugin install mentor@zainhill`, or the one skill through skills.sh. Nothing in `skills/mentor-review/` reaches outside it. Inside a dojo workspace it notices the course and adapts, without needing dojo installed.
- **One review file per scope**, in `.mentor/reviews/` at the repository root and listed in `.git/info/exclude`, so it is never committed and teammates never see it; in a dojo workspace, in `reviews/`, where the site lists it. A second review of the same scope re-checks the open flags first and adds to the same file.
- **Resolved means the code no longer has the problem.** The learner is asked why the fix works, but the record does not wait on the answer.
- **Level does not change the review.** The same flags for everyone; the answer on request is the release valve for a learner in over their head.
- **Main session, one pass, then a verify pass** that re-reads each flag's lines and drops any flag without a concrete trigger. The guard holds only in the main session, since frontmatter hooks do not fire in subagents (measured for dojo, its ADR 0015), and one pass is the cheapest option and works on every harness.
- **The reviewer runs nothing.** The learner runs the tests, linter and typecheck and reports what they printed, as with the coach, so the guard never has to allow project code.

## The guard and the vendored files

The reviewer registers the same `guard.ts` as dojo's coach, a byte-identical copy in each plugin, so either command works while the other's guard is active in the same session. It allows each skill's scripts only from that skill's own folder: `review-scope.ts`, which runs git and gh itself, `review-mark.ts` and `review-lint.ts` for the reviewer. Its one file-tool exception is Write and Edit on a `.md` file directly inside `.mentor/reviews/` or a dojo workspace's `reviews/`, resolved through symlinks. A review is authored prose full of parentheses, backticks and newlines, which the guard rightly refuses in any shell command, so it cannot pass through a script's arguments; mechanical changes, a flag's status and whether its answer was given, go through `review-mark.ts`.

The reviewer also carries copies of the dojo libraries it needs, argument parsing, frontmatter and section parsing, and the style word lists, and dojo carries a copy of the reviewer's `lib/review.ts` to list reviews on a course's site. `tests/vendored.test.ts` fails when any pair differs, so the copies stay one implementation that ships twice.

## Considered options

- **A flag list, then one flag at a time up the ladder.** Rejected by the maintainer: a learner should see the whole review, as a pull request shows every comment.
- **Never give the answer, as the coach does.** Rejected outside the course, for the deadline reason above; kept inside it.
- **Post the flags as pull request comments with gh.** Rejected: outward-facing, needing approval on every post, and it shows teammates the learner's review.
- **Fan out to read-only subagents per dimension.** Rejected for now: three to five times the tokens, Claude Code only, and outside the guard.
- **A skill inside the dojo plugin.** Rejected: on Claude Code a plugin is the unit of install, so the reviewer would bring five course commands with it.
- **Depending on dojo's shared skill for scripts and rules.** Rejected: the reviewer must work for someone who never installs dojo.
- **Review-only helpers without the style lint.** Rejected: slop in a review would go uncaught; the cost of vendoring is one sync test.

## Consequences

- A review is checked by `review-lint.ts`: the table, the categories, at most seven open, the three required lines per flag, a question mark, and no fenced code under Flags.
- In a dojo workspace, the course site shows a review from its next rebuild. A guarded session cannot rebuild it, since `build-site.ts --out` writes anywhere.
- A change to a vendored file is made in one plugin and copied to the other; the sync test says which.
- A review's token cost scales with its scope and is unmeasured; the 3,000-line cap bounds the reading.
