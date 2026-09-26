# Dojo

The context for the `dojo` plugin: it turns a topic and a learner's goal into an Odin-Project-style curriculum the learner works through mostly without AI. This file is vocabulary only. Decisions live in `docs/adr/`, the design in `docs/spec.md`, the evidence in `docs/evidence.md`.

## Language

### The curriculum

**Workspace**:
The directory that holds everything dojo generates for one topic and one learner. One topic per workspace.
_Avoid_: course folder, teaching workspace, repo

**Learner**:
The person working through a workspace. Distinct from whoever runs the commands, even when they are the same person.
_Avoid_: user, student

**Goal**:
What the learner wants to be able to build or do by the end, captured at intake. The capstone is derived from it.
_Avoid_: mission, objective, why

**Level**:
The learner's placement from intake: beginner, intermediate or advanced, judged from concrete adjacent experience. Scales the soft landing budget and project scaffolding, never what is covered.
_Avoid_: skill level, seniority, experience

**Intake**:
The single round of questions `plan` asks before generating anything: goal, level, time, workspace directory.
_Avoid_: onboarding, interview, questionnaire, assessment

**Syllabus**:
The ordered plan of sections and items for a workspace, with each item's status. The single source of truth for progress.
_Avoid_: curriculum, plan, outline, roadmap, course

**Section**:
A run of lessons that ends in one or more projects and then a checkpoint.
_Avoid_: module, unit, week

**Item**:
One entry in the syllabus: a lesson, a project or a checkpoint. Has a status of planned, generated or done.

**Lesson**:
A Markdown page that orients the learner on one narrow topic and sends them to curated resources to learn it. Never the place depth lives.
_Avoid_: chapter, explainer, tutorial, module

**Project**:
A build the learner completes without a walkthrough, specified as requirements. Deliberately reuses earlier sections.
_Avoid_: exercise, task, lab, assignment (that is a lesson section)

**Completion project**:
A project that starts from a partial build the learner finishes. Given to beginners before their first independent project in a section.
_Avoid_: starter project, faded project, scaffolded exercise

**Independent project**:
A project specified only by requirements, with no starter. The default at intermediate and advanced levels.

**Capstone**:
The final independent project, derived from the goal.
_Avoid_: final project, portfolio project

**Checkpoint**:
A static block at a section boundary: retrieval prompts sampled from earlier sections, with the learner's predicted and actual score recorded beside them. How spacing happens without a scheduler. Written by a script, not a model.
_Avoid_: review, exam, test, milestone, quiz (that is a command)

**Lesson zero**:
The static "how this course works" page copied into every workspace: rules of engagement, the AI rules, and why the course is built this way.
_Avoid_: intro, orientation, README (that is the plugin's)

### Inside a lesson

**Soft landing**:
The authored part of a lesson: introduction, overview and one core idea with at most one small example. Its job is orientation and the minimal mental model; its word budget shrinks as level rises.
_Avoid_: explainer, primer, lecture, summary

**Authored text**:
Any prose dojo wrote itself. Every factual claim in it cites a resource fetched in the same run. Labelled when it stands in for a missing resource.
_Avoid_: generated content, AI text

**Prediction question**:
One of two or three questions asked before the assignment about the exact concepts the lesson covers. Answered from the sidecar only after the assignment.
_Avoid_: pretest, warm-up, quiz

**Assignment**:
The numbered list of three to five resources the learner must read, watch or do, each with why it is included, how to consume it, and an active task. The name is borrowed from The Odin Project.
_Avoid_: reading list, homework, links

**Active task**:
The one-line "do" attached to each assignment item, such as change a value and predict the result.
_Avoid_: exercise, activity

**Retrieval prompt**:
An open-ended question at the end of a lesson, linked to the section or resource that answers it, answered from memory. At least one per lesson asks for an explanation in plain English.
_Avoid_: knowledge check (The Odin Project's retired term), flashcard, quiz question, review question

**Sidecar**:
The file beside a lesson that holds reference answers to its prediction questions and retrieval prompts. Read by quiz and by the site's reveal control, and by nothing else before an attempt.
_Avoid_: answer key, solutions, answers file

### Resources

**Resource**:
An external, free page, document, video or interactive course a lesson sends the learner to. Free is a filter, not a score.
_Avoid_: link, material, reference

**Primary source**:
The resource that owns a fact: official docs, a specification, source code. Preferred over any write-up of it.

**Ledger**:
The workspace's table of vetted resources with each one's rubric score, endorsement evidence and freshness. Reused across lessons.
_Avoid_: resources list, bibliography, RESOURCES.md

**Endorsement**:
Evidence that a community recommends a resource: a top-voted thread reply, inclusion in a subreddit wiki or a major curated list, an independent mention.
_Avoid_: upvote, popularity, recommendation

**Scout**:
The bundled script that gathers endorsements from public feeds and APIs at a polite rate and writes compact JSON for the model to judge.
_Avoid_: scraper, crawler, search

**Rubric**:
The 0 to 100 score for a resource. The scout computes the objective parts; the model scores learner fit and authority.
_Avoid_: ranking, rating

**Structure source**:
A source whose ordering shapes the syllabus: the official docs guide, The Odin Project's outline when one exists, roadmap.sh, the tables of contents of top-endorsed courses.

**Research budget**:
The fixed cap on searches and fetches for a pass, set by what it produces: lesson, project or syllabus. Not a knob; ADR 0014 removed the depth question.
_Avoid_: depth, mode, tier, thoroughness, effort (a Claude setting)

### Commands and help

**Coach**:
The only help mode. Guides with questions and hints up a ladder, never gives a solution, writes no files: a tool guard enforces that on Claude Code, the coach itself elsewhere.
_Avoid_: tutor, assistant, sensei, mentor

**Harness**:
The agent that runs the skills: Claude Code, Codex, Cursor, Copilot or any other host of the Agent Skills format. Skill text names a harness only where behaviour differs.
_Avoid_: agent (ambiguous with subagent), IDE, tool

**Ladder**:
The coach's four rungs, one per message: what have you tried; a narrowing question; the exact resource section; the concept with a different example.
_Avoid_: hint levels, escalation

**Micro-action**:
The concrete next move attached to every coach question, so the learner always has something to do.
_Avoid_: hint, tip, suggestion

**Quiz**:
The command that asks retrieval prompts one at a time, grades free-text answers against the sidecar, and gives feedback after each attempt. Keeps no schedule.
_Avoid_: review, test, drill

**Site**:
The static HTML rendering of a workspace, built from the Markdown by the bundled converter and served locally so the done button can write back. The learner's main way through the course: plan starts it, next rebuilds it, and build starts it again.
_Avoid_: web pages, website, export

**Token estimate**:
The pre-flight number shown before generation, read from the token table for the item type and level.

**Digest**:
The computed block a research pass works from, printed by the context script for one item: profile, section plan, previous items' overviews and prompts, ledger, and the scout's top resources. Replaces reading the workspace files.
_Avoid_: summary (implies model-written), context (the harness's window)

**Style rules**:
The rules every learner-facing sentence follows, in STYLE.md, with a mechanical half lint enforces as `style/*`.
_Avoid_: tone guide, voice, slop filter

## Relationships

- A **Workspace** holds one **Syllabus**, one **Ledger**, one **Lesson zero** and the **Learner**'s profile.
- A **Syllabus** is **Sections** in order; a **Section** is **Lessons**, then **Projects**, then a **Checkpoint**; each is an **Item** with a status.
- A **Lesson** is **Prediction questions**, a **Soft landing**, an **Assignment** and **Retrieval prompts**, with a **Sidecar** beside it.
- The **Goal** becomes the **Capstone**; the **Level** sizes the **Soft landing** and decides whether a **Completion project** precedes the **Independent project**.
- The **Scout** produces **Endorsements**; the **Rubric** turns them into a score; the **Ledger** keeps the result; the **Assignment** draws from the **Ledger**.
- The **Research budget** bounds every research pass; the **Token estimate** is keyed on item type and **Level**.
- **Coach** and **Quiz** read the **Syllabus** to find the current **Item**. **Quiz** reads **Sidecars**. **Coach** reads the learner's code and the lesson, and writes nothing.

## Flagged ambiguities

- "curriculum" meant both the plan and everything generated. Resolved: the plan is the **Syllabus**; the whole is the **Workspace**; "curriculum" is not a domain term.
- "review" meant a scheduled command, a section-boundary block and re-reading. Resolved: the block is a **Checkpoint**, the command is **Quiz**, and "review" is not used.
- "knowledge check" is The Odin Project's retired name for what dojo calls a **Retrieval prompt**. The two are not identical; see ADR 0003.
- "user" meant the learner and whoever runs the harness. Resolved: **Learner** for the person learning; "user" only for the harness user in skill text.
- "resources" meant a file and a category. Resolved: the file is the **Ledger**; a **Resource** is one entry.
