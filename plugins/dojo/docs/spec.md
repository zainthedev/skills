# dojo: spec

Synthesised from the design session of 25 September 2026. Vocabulary is defined in `../CONTEXT.md`, decisions with trade-offs are recorded in `adr/`, and the evidence base is `evidence.md`. No issue tracker is configured for this repo yet, so the spec lives here.

## Problem Statement

A developer who wants to learn a technology properly has two bad options in Claude Code today. They can ask the model to explain and build, which the evidence says raises short-term output and lowers what they can do unassisted afterwards. Or they can go to The Odin Project, whose model works, but which covers a fixed set of topics for one kind of learner at one pace. There is no way to get an Odin-style course, curated from the resources a community actually recommends, sized to their goal, level and time, that keeps the AI out of the way while they learn.

## Solution

`dojo` is a Claude Code plugin with five commands. `plan` interviews the learner once, researches how the topic is structured and which free resources are recommended, and writes a syllabus of sections, projects and checkpoints into a workspace directory. `next` generates the next item with its own budgeted research pass. `quiz` runs retrieval prompts with feedback. `coach` gives Socratic help that never produces solutions. `build` renders the workspace to a static site with a done button. Lesson zero, copied into every workspace, sets the rules of engagement. Every design choice that rests on evidence points at the evidence document, and every divergence from The Odin Project or from `teach` is an ADR.

## User Stories

### Learner

1. As a learner, I want to give my goal, level, hours per week and target date once, so that the course is sized to me and I am not asked again.
2. As a learner, I want the syllabus to mirror how the official docs and the community structure the topic, so that I learn things in the accepted order.
3. As a learner, I want each lesson to send me to three to five free resources with a reason and a way to consume each, so that I learn from primary sources instead of from a model.
4. As a learner, I want a short authored orientation before the resources, sized to my level, so that I am not dropped into docs cold.
5. As a learner, I want to be told which text was authored by the model and what it cites, so that I know what to verify.
6. As a learner, I want two or three prediction questions before I read, so that I read with a question in mind.
7. As a learner, I want an active task attached to each resource, so that I do something with what I read.
8. As a learner, I want open-ended retrieval prompts at the end of a lesson with no visible answers, so that I practise recall.
9. As a learner, I want a checkpoint at the end of each section that asks me to predict my score and then record it, so that I see how well I judge my own understanding.
10. As a learner, I want projects with requirements and no walkthrough that reuse earlier sections, so that I build things and revisit skills.
11. As a beginner, I want a completion project with a starter before an independent one, so that the first build is within reach.
12. As a learner, I want a capstone derived from my goal, so that the course ends with the thing I came for.
13. As a learner, I want lesson zero to tell me the rules, including exactly what the AI will and will not do, so that I know how to use the course.
14. As a learner, I want to generate the next item only when I reach it, so that I pay for what I use and later items reflect what came before.
15. As a learner, I want to be asked whether I finished the previous item when I ask for the next, so that progress stays current without a separate command.
16. As a learner, I want to run a quiz on any lesson, section or everything done so far, so that I practise recall with feedback.
17. As a learner stuck on a project, I want a coach that asks me what I tried and gives me a concrete next move, so that I get unstuck without being handed the answer.
18. As a learner, I want the coach to refuse to write my solution even when I ask directly, so that the course keeps its value.
19. As a learner, I want the coach to review code I wrote and tell me what it sees, so that I get feedback without a rewrite.
20. As a learner, I want a browsable site of my course with a sidebar, reveal controls for answers and a done button, so that I can work from the browser.
21. As a learner, I want to mark an item done from the site and have the syllabus updated, so that there is one record of progress.
22. As a learner, I want to open the site as plain files if I prefer, so that nothing depends on a server.
23. As a learner, I want to see an approximate token cost before anything is generated, so that I know what a course costs before I commit.
24. As a learner, I want the actual token usage reported after a run, so that the estimate stays honest.
25. As a learner, I want my workspace to be a directory I chose, so that it never lands inside the plugin or my work repo.
26. As a learner, I want the ledger to show why each resource was chosen and how fresh it is, so that I can judge the curation.
27. As a learner, I want stale resources excluded, so that I do not learn a superseded major version.
28. As a learner, I want The Odin Project's own course used as a resource when it covers my topic, so that I get the best free material rather than a re-invention.
29. As a learner, I want to edit the syllabus by hand and have the tools respect it, so that I am never locked out of my own course.
30. As a learner, I want to re-run plan on an existing workspace and be asked whether to extend or restart, so that nothing is overwritten by accident.

### Installer or team lead

31. As a team lead, I want to install dojo with one marketplace command, so that teammates get the same tool.
32. As a team lead, I want a README that says what dojo does, what it refuses to do and why, so that I can decide whether to recommend it.
33. As a team lead, I want a comparison with `teach`, so that people pick the right tool.
34. As an installer, I want the Node or Bun requirement stated, so that build does not fail mysteriously.
35. As an installer, I want the feed usage and rate limits documented, so that I know what the scout does on the network.

### Maintainer

36. As a maintainer, I want the lesson, project, checkpoint, syllabus and ledger formats in one reference skill, so that every command produces the same shapes.
37. As a maintainer, I want a lint script that checks structure and citations, so that evals and runtime share one checker.
38. As a maintainer, I want the token table to record the measured runs it comes from, with date and model, so that a learner can see how current it is.
39. As a maintainer, I want evals for structure, citations and coach refusal, so that a regression fails before release.
40. As a maintainer, I want every deliberate divergence recorded as an ADR, so that nobody "fixes" it later.
41. As a maintainer, I want the evidence document to be the single place citations live, so that lesson zero and the README never drift from it.

## Implementation Decisions

### Commands

- Five user-invoked skills, `dojo-plan`, `dojo-next`, `dojo-quiz`, `dojo-coach` and `dojo-build`, invoked as `/dojo-<verb>` on Claude Code (or namespaced, `/dojo:dojo-<verb>`) and `$dojo-<verb>` on Codex. Each sets `disable-model-invocation: true`, a human-facing description and an argument hint, following Matt Pocock's conventions. The prefix exists because outside a plugin there is no namespace.
- One model-invoked skill, `dojo`, is the root the five share: the formats and rules (lesson, project, checkpoint, lesson zero, syllabus, ledger, rubric, AI rules, style, structure sources), the token table, `scripts/` and `templates/`. The five call it through the Skill tool, and it names its own directory so the commands can run the scripts by absolute path on any harness. No skill links into another skill's folder, and nothing a skill needs lives outside a skill folder (ADR 0011).
- Each skill ships the Codex metadata file beside its SKILL.md, as his plugin does.
- `dojo-coach` registers a PreToolUse hook in its frontmatter that persists for the rest of the session, denying every tool outside a short read-only list, MCP tools included, and any Bash command other than one plain call to a script on the coach's list: `next-item.ts`, `lint.ts`, `measure.ts`, `context.ts`, and `quiz-log.ts`, which only appends a row to the quiz log. Claude Code's `allowed-tools` only pre-approves permissions and `disallowed-tools` lasts one turn, so the hook is the enforcement there. The hook command looks for the guard script in the plugin root, the project's `.claude/skills` and the home `.claude/skills`, and denies the tool if none is found. On other harnesses the coach holds the rule by instruction. A coach session is therefore read-only, and `dojo-next` and `dojo-build` need a fresh session. No other skill declares hooks.

### Intake (`plan`)

- One round, grilling-style, defaults shown, skipped for anything given as arguments: goal (becomes the capstone), level as concrete adjacent experience, hours per week and target date, workspace directory, with the token cost per item stated once. At most one topic-specific question when the topic forces a fork.
- The scout starts in the background the moment the topic is known and runs during intake.
- On an existing workspace, `plan` asks whether to extend or restart. It never overwrites.

### Workspace contract

Files the learner sees, all Markdown unless noted:

- `profile.md`: the marker file. Frontmatter holds the machine fields (dojo version, topic, level, research model, hours per week, target date, created). The body holds the goal and prior experience in the learner's words.
- `syllabus.md`: frontmatter (topic, generated date, structure sources); one heading per section; under each a table of items with ID, type, title, estimated hours, status and done date. IDs follow the L01, P01, C01 pattern. Status is planned, generated or done. This is the single source of truth for progress.
- `00-how-this-works.md`: lesson zero, copied from the plugin with goal and schedule templated in.
- `ledger.md`: a table of resources with type, rubric score, endorsement evidence, freshness, version checked and which items use it, plus a "thin evidence" note when the scout found little.
- `lessons/NN-slug.md` with `lessons/NN-slug.answers.md` beside it, the sidecar.
- `projects/NN-slug.md`, and for completion projects a `starter/` directory next to it holding the partial build with marked gaps.
- `checkpoints/NN-slug.md`.
- `quiz-log.md`: append-only, one line per quiz session with date, scope, predicted and actual.
- `.dojo/scout.json`: the scout's cached signal, machine-only.
- `site/`: the built site by default, overridable by a `build` argument.
- Commands locate the workspace by finding a `profile.md` with dojo frontmatter in the current directory or its parents.

### Lesson format

In order: title and a metadata line (section, estimated time); Introduction; Lesson overview (things to learn about, at most seven bullets, sentence case, never questions); Before you start (two or three prediction questions); Core idea (authored, at most one small example, omitted at advanced level where the budget is framing only); Assignment (three to five numbered items, each a resource with descriptive link text, why it is included, how to consume it, and an active task, with instructions as sub-bullets); Retrieval practice (opening line "attempt each from memory, then move on; these return at checkpoints", open-ended prompts each linked to the answering section or resource, at least one "explain in plain English"); Additional resources (optional, omitted if empty).

- Authored word budgets: about 800 for beginners, 400 for intermediate, 200 for advanced.
- Every factual claim in authored text links to a ledger resource fetched in the same run. Authored stand-ins for missing resources are labelled.
- Links to required reading appear only in Assignment or Additional resources, never scattered through the body.
- Video items are conceptual rather than code-alongs, and say how to watch.
- The sidecar holds numbered answers to the prediction questions and retrieval prompts, each with the link to its source.

### Project format

Title; Introduction (what you will build and which sections it reuses); for completion projects, what the starter contains and where the gaps are; Assignment as numbered requirements or user stories; Extra credit (optional); Rules (reconstruct, never copy; do not look at other people's solutions until done; the coach's limits); Done when (a checkable list of behaviours the learner verifies).

- Beginners get one completion project before the section's independent project. Intermediate and advanced learners get independent projects only.
- The capstone is the last project and is derived from the goal.
- Generation uses the project budget only, to verify named APIs and link their docs.

### Checkpoint format

Predicted score line; six to ten retrieval prompts sampled from the previous two sections' sidecars, each linked to its lesson; actual score line; a short "if below N, re-read" pointer per lesson sampled. Written by `scripts/checkpoint.ts` when `next` reaches it, with no research pass and no model writing (ADR 0016).

### Lesson zero

Static in the plugin with templated fields only. Covers how the course works, reading everything, projects before moving on, open-book rules (search and docs are encouraged), the AI rules (do not ask Claude for solutions; what coach and quiz will and will not do; that this departs from The Odin Project's stance and why, with a link to the evidence), and the commands.

### Research pipeline

- The syllabus pass and each item pass run in one subagent each, inheriting the session model, with Bash for the scout and curl, WebFetch, WebSearch, Read and Write, a fixed budget, and a line forbidding further delegation. The subagent drafts the item and sidecar and returns a summary. The main session runs the lint and reports.
- Budgets as maximum searches and fetches per pass, fixed by item type: lesson 8 and 12, project 4 and 6, syllabus 16 and 24 (ADR 0014).
- Structure sources, in order: the official docs guide ordering; The Odin Project's course outline when one exists; roadmap.sh; the tables of contents of the top two or three endorsed courses or books. The syllabus names which shaped it.
- Resources are free only. When The Odin Project covers the topic, its lessons rank as resources like any other.
- The scout fetches, per topic: Wayback snapshots of two to four subreddit wikis chosen by the model, top-sorted Reddit search feeds and comment feeds at one request per 30 seconds with backoff, comment scores from the Pushshift successor, Hacker News search, Stack Exchange, dev.to and GitHub metadata. It writes compact JSON with per-resource evidence. It never fetches reddit.com HTML.
- Rubric, 0 to 100: endorsement breadth 15, vote-weighted depth 15, curated inclusion 10, verified freshness 20, version currency 5, learner fit 15, authority 10, independent signal 10. Penalties: author-only or affiliate evidence minus 10, evidence older than four years minus 5, replies voted outdated minus 5. Dead links exclude. The scout computes breadth, depth, inclusion, freshness, currency and independent signal; the model scores fit and authority.
- The ledger caps at about a dozen resources per course; assignments use three to five per lesson.

### Token transparency

- A token table in the `dojo` skill: estimated tokens per artifact type (syllabus, lesson, project, checkpoint) per level, tokens not dollars, with the measured runs behind it in `docs/token-runs.md`. A maintainer updates it by hand from headless runs; the runner is not part of the repository.
- `plan` states the cost per item at the assigned level; `next` shows the estimate before generating.
- After a run, a bundled measure script sums this session's usage from the transcript since the run started and prints the actual, with a fallback pointer to the built-in per-skill usage report if the transcript is unavailable.
- A research pass reads a computed digest (`scripts/context.ts`) of the profile, section plan, previous items, ledger and scout instead of the files; every fetch asks for headings plus the passages on the item's concepts, never a summary; `research_model` in the profile can move passes to a cheaper model where the harness allows it (ADR 0013).

### Style

- Every sentence for the learner follows `skills/dojo/STYLE.md`, adapted from stop-slop and extended with newer AI tells. Its mechanical half (phrases, vocabulary, adverbs, contrast scaffolding, dashes, emoji, bold overuse) is lint's `style/*` rules on every authored section, sidecar answer, project section, checkpoint text and syllabus prose; adverbs warn, the rest error. The coach follows the same file plus its no-sycophancy rules, with a carve-out for questions that start with a Wh- word (ADR 0012).

### Coach rules

- Ladder, one rung per message, never skipping unless asked: what have you tried and what do you think is happening; a narrowing question; the exact resource section; the concept with a different example. Above the top rung: name the gap, say what to re-read, stop.
- Every question carries a micro-action. Every message ends with a question until the learner states the answer; then confirm and ask them to explain why it works.
- Never solution code, partial or full; never edits; generic syntax unrelated to the exercise is allowed; review of the learner's own code is feedback, not a rewrite. Off-syllabus questions get a short answer and a steer back.
- The learner runs their own code and pastes output.

### Quiz flow

- Optional scope argument, a lesson or a section; the default is every done lesson with prompts interleaved across sections. Ask for a predicted score; one prompt at a time; free-text answer; grade against the sidecar and give feedback after each attempt, never before; finish with predicted versus actual; `scripts/quiz-log.ts` appends one line to the quiz log.

### Site and server

- The converter is a zero-dependency TypeScript script run natively on Node 24 or Bun. It renders the workspace's Markdown subset to a static site: a syllabus sidebar with status, one page per item, accessible reveal controls fed by sidecars, print-friendly styles, and a done button per item.
- `plan` builds the site and starts a zero-dependency local server once the syllabus lints clean, detached so it outlives the session (ADR 0017); `next` rebuilds the site after each item; `build` starts the server again when it is not running, for example after a restart, and prints the URL. The done button posts to it and the server calls the mark-done script. Opened as a file, the button shows a notice.
- A single mark-done script updates the syllabus table. `next` and the server both use it, and manual edits are honoured.

### Plugin structure and conventions

- The repository is a marketplace named `zainhill`; the plugin lives under `plugins/dojo` with its manifest, skills, tests, evals and docs. Scripts and templates live inside the `dojo` skill so that skills.sh installs carry them. Claude Code users install the plugin; every other harness installs skill folders through skills.sh, one at a time or all together.
- SKILL.md files follow the writing-for-agents checklist: key term first, one trigger per distinct case, steps before reference, a done-when test per step, prohibitions paired with the positive instruction, no em dashes.
- Scripts are TypeScript with no build step and no dependencies: scout, context, wait-for, fetch-log, build-site, serve, mark-done, lint, measure. The site script is TypeScript too; build-site strips its types.
- The lesson and project templates are baked from The Odin Project's layout guide as of September 2026 with a provenance note. Their text is never copied.

## Testing Decisions

A good test checks external behaviour at a seam and never implementation details. Two seams:

1. **Script command lines.** Every script is a function from files, or recorded network fixtures, to files or JSON, tested with Node's built-in test runner against fixture workspaces. The converter renders a fixture workspace to expected HTML. Mark-done flips one row and leaves the rest byte-identical. Lint fails a lesson missing a section and a lesson whose authored claim cites a URL absent from the ledger. The scout parses recorded feed and API fixtures into the expected JSON and honours the rate limit against a fake clock. Measure sums a fixture transcript. No mocking beyond recorded fixtures.
2. **Plugin evals** for the skills, in Claude Code's plugin eval format, seeded from a fixture course by a scaffold script: a generation case (`next` produces a lesson and sidecar with the required headings, a subagent research pass, a lint run reported clean, and the syllabus row marked generated; the citation rule is enforced by that lint run, since a grader can read only one file), a coach red-team case (a direct demand for the solution, graded on refusal, a closing question, a micro-action, and no Write or Edit calls), and a guard case (a benign request to create a file leaves no file behind).

Prior art: Matt Pocock's plugin has no tests; the eval format is Claude Code's own.

## Out of Scope

- Non-technical topics.
- Paid resources anywhere.
- A tutor or explain-on-demand mode.
- A review scheduler, progress dates, Anki or calendar export.
- Logging the coach's explanation-seeking versus solution-seeking ratio.
- A diagnostic placement quiz at intake.
- An LLM-judged pedagogical quality grader, and the golden comparison against The Odin Project's Node course.
- Hand-crafted or interactive HTML beyond the fixed template.
- Languages other than English.
- Fetching The Odin Project's template at runtime.

## Further Notes

- The name `dojo` is free in the plugin catalog; the only learning plugin there is Coursera's.
- The evidence document is the single home for citations. Lesson zero and the README link to it and never restate numbers without it.
- The Odin Project removed knowledge checks on 22 and 23 September 2026. dojo's retrieval prompts are a recorded divergence (ADR 0003), as are the coach (ADR 0002) and the absence of a scheduler (ADR 0004).
- WebFetch returns a summary rather than the raw page and cannot reach Reddit, Stack Overflow or the Wayback Machine. The scout exists because of this (ADR 0006).
- Node 24 or Bun is required for the scripts. Nothing else needs a runtime.
