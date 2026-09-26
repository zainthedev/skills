# dojo evidence base

## 1. Preface

This document is the curated evidence base for dojo, a Claude Code plugin that generates Odin-Project-style learning curricula for technical topics. It collects in one place what The Odin Project (TOP) actually does and says (section 2), what the learning-science and programming-education literature supports and how strongly (section 3), what a Claude Code session can and cannot reach when it goes looking for well-regarded free resources (section 4), and the full citation list (section 5). It was compiled on 2026-09-25 from three research passes over primary sources. Every factual claim carries a URL; author-year keys inside tables resolve to full citations with URLs in section 5; where a source gave no URL or no number, the text says so inline.

The rule for the rest of the plugin: every dojo design choice that rests on evidence points here, and only here. Skills, command prompts and templates may restate a rule ("open with two or three prediction questions", "the coach never writes solution code") but they do not carry their own citations, effect sizes or quotes; they reference the relevant row or bullet of this file. Where dojo departs from TOP (closing retrieval prompts after TOP removed knowledge checks; a bounded Socratic coach where TOP says avoid AI), the departure and its justification are recorded here. A claim that cannot be traced to a row in this document is a design preference, not evidence, and must be phrased as one.

## 2. How The Odin Project works

### 2.1 Vocabulary and shape

- Path > Course > Section > Lesson, official definitions: https://github.com/TheOdinProject/.github/blob/main/CONTRIBUTING.md#curriculum-structure
- A course is "a listing of lessons interspersed with multiple projects": https://github.com/TheOdinProject/curriculum/blob/main/README.md
- Concrete shape, NodeJS course: 8 sections, 21 lessons, 9 projects; each section is a run of 1-9 lessons closed by a project; the course ends with two integrative projects and a capstone: https://www.theodinproject.com/paths/full-stack-javascript/courses/nodejs (section descriptions: https://github.com/TheOdinProject/theodinproject/blob/main/db/fixtures/paths/full_stack_javascript/courses/node_js.rb)
- Foundations sections and lesson order (JavaScript Basics has three projects spread through the section): https://www.theodinproject.com/paths/foundations/courses/foundations
- Lesson Markdown lives in the curriculum repo, ordering in the website repo; a new lesson needs two PRs; removed lessons are archived, not deleted: https://github.com/TheOdinProject/curriculum/blob/main/CONTRIBUTING.md#adding-or-removing-lessons-from-the-curriculum

### 2.2 Lesson layout (current template, post 2026-09-22)

Template: https://github.com/TheOdinProject/curriculum/blob/main/templates/lesson-template.md. Section rules: https://github.com/TheOdinProject/curriculum/blob/main/LAYOUT_STYLE_GUIDE.md#lesson-layout. Enforced by custom markdownlint rules on every PR: https://github.com/TheOdinProject/curriculum/blob/main/CONTRIBUTING.md#curriculum-linting

| Section | Status | Rules | URL |
|---|---|---|---|
| `### Introduction` | Required | Brief summary of what the lesson covers and/or why it matters | https://github.com/TheOdinProject/curriculum/blob/main/LAYOUT_STYLE_GUIDE.md#lesson-layout |
| `### Lesson overview` | Listed by the linter; style guide says remove if none; 215 of 313 live files have one | Bulleted; things to learn about, not do; ideally no more than 7 items; each starts with a capital, ends with a period, never phrased as a question | https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP004.md, https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP009.md |
| `### CUSTOM SECTION HEADING` | Optional, usually present | The lesson's own content; note boxes open with a level-4 heading; generic headings such as "Note" or "Tip" banned | https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP013.md, https://github.com/TheOdinProject/curriculum/blob/main/LAYOUT_STYLE_GUIDE.md#note-boxes |
| `### Assignment` | Mandatory (linter; the "remove if none" sentence was deleted 2026-05-13) | Numbered list of external resources to read or watch, or exercises; each item has brief text on why it is included or what purpose it serves; instructions as sub-bullets, one instruction per bullet; ideally no more than 3-5 items; wrapped in `<div class="lesson-content__panel" markdown="1">` | https://github.com/TheOdinProject/curriculum/commit/3f23ae4749756d008efecc070bffd0475112f5a4, https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP003.md |
| `### Additional resources` | Optional since 2025-11-26; present only if non-empty; 61 of 313 files | Related but not necessary; each item says what purpose it serves | https://github.com/TheOdinProject/curriculum/commits/main/LAYOUT_STYLE_GUIDE.md |

Cross-cutting rules:

- Required-reading links live only in Assignment or Additional resources; refresher links to earlier lessons and definitional Wikipedia links are the exception: https://github.com/TheOdinProject/curriculum/blob/main/LAYOUT_STYLE_GUIDE.md#dont-scatter-links-throughout-lessons
- Descriptive link text; "this", "here", "video", "docs" banned; same label for the same href: https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP001.md
- Level-3 main headings, level-4 sub-headings; the lesson title is rendered by the site: https://github.com/TheOdinProject/curriculum/blob/main/LAYOUT_STYLE_GUIDE.md#atx-style-headings
- Exceptions: course intro and conclusion files; a separate guide layout for `*_guides/` files: https://github.com/TheOdinProject/curriculum/blob/main/LAYOUT_STYLE_GUIDE.md#layout-exceptions, https://github.com/TheOdinProject/curriculum/blob/main/LAYOUT_STYLE_GUIDE.md#guide-layout
- Live counts (clone of `main`, 2026-09-25): 313 lesson files, 288 with Introduction, 275 with Assignment, 0 with Knowledge check, 14 with Extra credit. These counts come from the research clone, not from a published page; no URL exists for them.

| TOP lesson part | dojo lesson part |
|---|---|
| Introduction, Lesson overview, custom section | Soft landing: introduction, overview, one core idea with one small example, scaled to level |
| Assignment, 3-5 items with why and how | 3-5 curated assignment items, each with why it is included and how to consume it |
| No equivalent | 2-3 prediction questions opening the lesson |
| Knowledge check (removed 2026-09-23, see 2.7) | Closing open-ended retrieval prompts including "explain in plain English", answers in a sidecar file |
| Additional resources | Optional, same rule: only if non-empty |

### 2.3 Project layout

Template: https://github.com/TheOdinProject/curriculum/blob/main/templates/project-template.md. Rules: https://github.com/TheOdinProject/curriculum/blob/main/LAYOUT_STYLE_GUIDE.md#project-layout. Linter structure Introduction, wildcard, Assignment, wildcard: https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP004.md

- `### Introduction`: what the project is and an overview of what the learner will build (rules URL above).
- Optional pre-assignment section, e.g. "Setting up your project's GitHub repository"; optional post-assignment section, e.g. "Viewing your project on the web": https://github.com/TheOdinProject/curriculum/blob/main/templates/project-example.md
- `### Assignment`: numbered requirements or user stories; optional `#### Extra credit` bulleted add-ons, removed if none (rules URL above).
- No Lesson overview in any project; Additional resources in 8 of 61 projects (research clone count, no URL); filenames `project_*.md`: https://github.com/TheOdinProject/curriculum/blob/main/CONTRIBUTING.md#adding-lessons
- Purpose: projects "give users the opportunity to practice what they are learning, thereby reinforcing and solidifying the theoretical knowledge learned in the lessons": https://github.com/TheOdinProject/curriculum/blob/main/README.md
- Projects are not tests: "The projects are not tests of what you have memorized so far.": https://www.theodinproject.com/lessons/foundations-how-this-course-will-work
- No copying: the Recipes project warns "DO NOT PEEK. Come ask for help in our Discord server!" and gives the reasons (submissions are other learners' code; peeking "robs you of the chance to develop your problem solving and researching skills"; many valid solutions; the baked-pizza analogy): https://www.theodinproject.com/lessons/foundations-recipes
- "Plagiarism" is on the Discord ban list: https://www.theodinproject.com/guides/community/rules
- The website flags projects with `is_project` and stores public submissions: https://github.com/TheOdinProject/theodinproject/blob/main/app/models/lesson.rb, https://github.com/TheOdinProject/theodinproject/blob/main/app/models/project_submission.rb
- dojo mirrors: a project closes each section, reuses earlier sections, forbids copying solutions. dojo adds a beginner completion-style project before the independent one; TOP has no such stage (evidence: section 3.1, worked examples and Parsons rows).

### 2.4 Curation philosophy, in their words (content is CC BY-NC-SA 4.0; quotes kept brief)

- "This curriculum works by aggregating the best content from across the internet to teach a specific topic." and "If there are no good resources, we write our own." - How This Course Will Work: https://www.theodinproject.com/lessons/foundations-how-this-course-will-work
- "everything in the curriculum is intentionally included" and "DO NOT SKIP ANYTHING!" - same lesson, same URL.
- "We will often link multiple resources so as to not rely too much on a single source of information." and "we prefer primary links to external sites." - original mission statement: https://github.com/TheOdinProject/curriculum/blob/main/archive/README-old.md
- Resources are "intentional additions supplementing our own material", not "check out these interesting reads" - FAQ: https://www.theodinproject.com/faq
- The target skill is transfer: after the course "you can simply jump straight into the documentation for anything you are trying to learn." - How This Course Will Work (URL above)
- Sequencing as rabbit-hole control: "Stick to the path laid out as much as possible." - Motivation and Mindset: https://www.theodinproject.com/lessons/foundations-motivation-and-mindset
- Struggle is intended: "We want you to know that this will not be easy." - Introduction to Web Development: https://www.theodinproject.com/lessons/foundations-introduction-to-web-development; its assigned essay is Trautman's "Why Learning to Code is So Damn Hard": https://dev.to/theodinproject/why-learning-to-code-is-so-damn-hard-11nn
- No sentence reading "don't write what is already well explained elsewhere" exists in the style guide, CONTRIBUTING or templates (full-repo grep in the research notes, no URL); the principle lives in the pages above and in the Assignment definition (2.2).

### 2.5 Rules on free resources and on videos

- Free: "we try to find the best free resources on the internet that teach that topic" and "everything one needs to know to become employed can be found for free online": https://github.com/TheOdinProject/curriculum/blob/main/archive/README-old.md
- TOP itself has been donation-funded since 2023 (Chegg-supported 2018-2023): https://dev.to/theodinproject/coding-education-for-all-join-us-in-supporting-the-odin-project-3ilp
- Videos: no primary source states a literal "read before you watch" rule. What exists: "code-along videos are largely something to be avoided" and videos "may feel easier because it's easy to turn your brain off" - Reading Comprehension blog: https://dev.to/theodinproject/reading-comprehension-22e0
- "While this often involves a lot of reading, learners get a lot more practice with the resources used and skills needed for professional work." - FAQ: https://www.theodinproject.com/faq
- When a video is assigned, the item says how to watch it: "Don't worry about actually coding along, just watch for the way that VSCode is used" - Text Editors: https://www.theodinproject.com/lessons/foundations-text-editors
- Research first, no hand-holding: "We discourage low-effort questions and hand-holding": https://www.theodinproject.com/guides/community/how_to_ask; helpers "Do not answer searchable questions": https://www.theodinproject.com/lessons/foundations-join-the-odin-community; bot `/research`: https://github.com/TheOdinProject/odin-bot-v2/blob/main/bot-commands/slash/research.js
- Notes should be "prompts for further research", not references - Motivation and Mindset (URL in 2.4)

### 2.6 AI stance

- Canonical statement, "A note on AI code generation", closes: "We do not recommend using AI tools for your learning." https://www.theodinproject.com/lessons/foundations-motivation-and-mindset#a-note-on-ai-code-generation (source: https://github.com/TheOdinProject/curriculum/blob/main/foundations/introduction/motivation_and_mindset.md)
- The seven reasons, summarised: (1) learners miss discovering how something works and why; (2) asking people good questions is a skill that AI use delays; (3) so is explaining one's own code, as in code review; (4) AI output must be scrutinised and beginners cannot judge it; (5) prompting is a skill but supplementary to fundamentals; (6) AI answers instead of coaching research and problem solving; (7) interviews will likely not allow AI. Same URL. The note links Humphrey's "CheatGPT": https://blog.humphd.org/cheatgpt/
- History: added 2023-02-24 (https://github.com/TheOdinProject/curriculum/commit/f7d56fc3f367a056ebfa8403d49a29bf608cbcae), merged via PR #25139 on 2023-03-15 (https://github.com/TheOdinProject/curriculum/pull/25139); Google AI Overview sentence added 2026-07-04 (https://github.com/TheOdinProject/curriculum/commit/53497c7e0cc6f452ebb9bd3f62188a4ed2977cdf)
- Enforcement in lessons: disable Copilot in VS Code (https://www.theodinproject.com/lessons/foundations-text-editors); do not use LaunchSchool's chatbot (https://github.com/TheOdinProject/curriculum/blob/main/ruby/introduction/how_this_course_will_work.md); skip Prisma's AI features (https://github.com/TheOdinProject/curriculum/blob/main/nodeJS/orms/prisma_orm.md). Only neutral mention: https://github.com/TheOdinProject/curriculum/blob/main/getting_hired/preparing_for_job_search/professional_networking.md
- Discord bot rule, `/ai` command: "Do not ask for help debugging code created by or with the help of AI tools. Requests to verify or examine the accuracy of AI-generated content (including code) are not permitted." and learners should "avoid using generative AI while learning": https://github.com/TheOdinProject/odin-bot-v2/blob/main/bot-commands/slash/ai.js
- Bot `/search google` switched to web mode "to remove AI response" on 2026-09-24: https://github.com/TheOdinProject/odin-bot-v2/pull/921
- The FAQ and the public Community Rules contain no AI rule (full text checked): https://www.theodinproject.com/faq, https://www.theodinproject.com/guides/community/rules
- Reading: a strong recommendation for personal use, not a ban; a hard rule inside the community.
- dojo's departure: AI stays discouraged during learning, as TOP says, except for two bounded commands. `coach` gives escalating Socratic hints with one concrete micro-action per message and never writes solution code; `quiz` runs retrieval with feedback after each attempt. Justification, section 3.2: answer-withholding removed the measured harm (Bastani 2025), lead-and-reveal gave the best unassisted transfer and calibration (Kazemitabaar 2025), a hint-first tutor preserved intrinsic motivation (Bassner 2025/2026), and Socratic modes need engagement scaffolds or learners quit them (Clin Deffarges 2026). Both commands answer TOP reason (6) directly: the coach asks, it does not answer.

### 2.7 Knowledge check: removed September 2026

- Until 2026-09-22 every lesson had `### Knowledge check` between Assignment and Additional resources. Pre-removal template: https://github.com/TheOdinProject/curriculum/blob/3fa1383f2e/templates/lesson-template.md; pre-removal rules: https://github.com/TheOdinProject/curriculum/blob/14aff20160/LAYOUT_STYLE_GUIDE.md#lesson-layout
- Pre-removal rules: bulleted questions; each links only to an in-lesson anchor or a resource already linked in the lesson; ideally no more than 7; the template told learners "you are not expected to memorize or master this knowledge". Example: https://github.com/TheOdinProject/curriculum/blob/14aff20160/foundations/javascript_basics/variables_and_operators.md
- Removal: commit https://github.com/TheOdinProject/curriculum/commit/7a32f72e4aae3632a4a541d654c8bb4d8e50e4e0 via PR https://github.com/TheOdinProject/curriculum/pull/31411 ("Lesson structure: Remove Knowledge Check requirements"); content PR https://github.com/TheOdinProject/curriculum/pull/31412 ("All Lessons: Remove Knowledge Check section", merged 2026-09-23); tracking issue https://github.com/TheOdinProject/curriculum/issues/31410; trigger issue https://github.com/TheOdinProject/curriculum/issues/31390; earlier discussion https://github.com/TheOdinProject/curriculum/discussions/26669
- Stated reasons: accessibility (a screen-reader user reported that the links "don't go to a different page, or show information when selected"; the same href carried different accessible names) and "incorrect expectations with regards to what they should "know" upon finishing a lesson" (PR #31411). Maintainers added that the section mostly re-iterated the overview and readings, that it "opens doors for a lot of "I don't fully understand this like an expert yet so I'm afraid to move on" situations", and that the phrase "Knowledge Check" "throws roadblocks in front of learners" (issue #31390). PR #31411 notes Additional resources may be removed next.
- dojo's departure: dojo keeps closing retrieval prompts. TOP's stated reasons were accessibility and expectation-setting, not evidence against retrieval, and the retrieval evidence is Strong (section 3.1). dojo avoids the specific problems: prompts are open-ended text rather than anchor links, answers sit in a sidecar file, and the wording frames them as practice, not a mastery bar.

### 2.8 Licenses

- Curriculum content: CC BY-NC-SA 4.0; attribute Erik Trautman, non-commercial, share-alike: https://github.com/TheOdinProject/curriculum/blob/main/license.md; deed: https://creativecommons.org/licenses/by-nc-sa/4.0/
- TOP's reading: teaching "at your club, meetup, or with your friends" is fine; a bootcamp needs "a conversation first": https://www.theodinproject.com/faq; Terms of Use restate the license: https://www.theodinproject.com/terms_of_use
- Website code: MIT: https://github.com/TheOdinProject/theodinproject/blob/main/license.txt; the bot repo is separate: https://github.com/TheOdinProject/odin-bot-v2
- Consequence for dojo: structure and rules are mirrored, lesson text is not copied; quotes stay brief and attributed; generated curricula carry no TOP content.

## 3. Learning science

Strength tags are exactly the source notes' tags: Strong (multiple meta-analyses or several independent randomised studies, replicated in classrooms), Moderate (several studies or one good RCT, boundary conditions matter, often mathematics not programming), Emerging (one or two studies, small samples or preprints), Contested (credible studies disagree; the rule is conditional). Author-year keys resolve to URLs in section 5.

### 3.1 Techniques

| Technique | Headline evidence (effect size and study) | Strength | What dojo does with it |
|---|---|---|---|
| Retrieval practice and the testing effect | Testing vs restudy g = 0.50 across 159 effects, larger with feedback and recall formats (Rowland 2014); g = 0.61 (Adesope 2017); classroom quizzing g = 0.499 across 222 studies and 48,478 students (Yang 2021); 1-week recall 56% tested vs 42% restudied, d = 0.83 (Roediger and Karpicke 2006); retrieval 0.67 vs concept mapping 0.45, d = 1.50 (Karpicke and Blunt 2011); high utility (Dunlosky 2013) | Strong | Every lesson closes with open-ended retrieval prompts, answers hidden in a sidecar; `quiz` gives feedback after each attempt |
| Spacing (distributed practice) | 839 assessments: spaced beats massed and the optimal gap grows with the retention interval (Cepeda 2006); optimal gap about 1 day for a 1-week test, about 3 weeks for 70-day and 1-year tests (Cepeda 2008); spaced vs massed retrieval g = 0.74 (Latimier 2021); high utility (Dunlosky 2013) | Strong | Section checkpoints re-test earlier sections later, never in the same session |
| Expanding vs uniform intervals | Expanding vs uniform g = 0.034, not significant (Latimier 2021); equal spacing beat expanding at 2 days (Karpicke and Roediger 2007); equivalent at 8 weeks (Kang 2014) | Contested | Checkpoints space by section; dojo does not present an expanding schedule as the evidence-based part |
| Interleaving | Interleaved 61% vs blocked 38% one month later, d = 0.83, preregistered RCT, n = 787 (Rohrer 2020); meta g = 0.42, mathematics g = 0.34 (Brunmair and Richter 2019) | Strong (mathematics); Moderate (programming) | Projects reuse earlier sections; checkpoints mix items from all prior sections |
| Prediction and pretesting | Prequestioned content g = 0.66, about 0 for non-prequestioned content (King-Shepard 2025; Pan and Carpenter 2023); failed pre-attempts beat extra reading (Richland 2009; Kornell 2009) | Strong (prequestioned content only) | Two or three prediction questions open each lesson, aimed at that lesson's core idea |
| Self-explanation | Induced self-explanation g = 0.55 across 69 effects (Bisra 2018); line-by-line prompting improved deep understanding (Chi 1994); focused prompts beat open ones in CS1 (Vihavainen 2015) | Strong (general); Moderate (programming) | An "explain in plain English" prompt in every closing set |
| Worked examples, faded scaffolding, expertise reversal | Worked examples g = 0.48 across 55 studies (Barbieri 2023); faded examples beat example-problem pairs (Renkl 2002; Atkinson 2003); guidance wins for novices (Kirschner 2006; Ashman 2020); scaffolds turn harmful as knowledge grows (Kalyuga 2001; Kalyuga 2003) | Strong (novices) | Soft landing is level-scaled and carries one small example; beginners get a completion-style project before an independent one; higher levels get less scaffolding |
| Parsons and faded Parsons problems | Faded Parsons taught patterns better than writing or tracing, n = 237 (Weinman 2021); Parsons as effective as writing code with equal 1-week retention, in less time (Ericson 2017; Ericson 2018) | Moderate to Strong | The model for the beginner completion-style project: complete or fill the gaps, then build alone |
| Generation effect and no-copy rules | Generation d = 0.40 across 86 studies (Bertsch 2007); passive acceptance of generated code predicted worse comprehension (Balepur 2026; Prather 2023) | Strong (memory); Moderate (complex skills and the no-copy rule) | Projects forbid copying solutions; the coach never writes solution code |
| ICAP modes | Passive < Active < Constructive < Interactive (Chi and Wylie 2014); Constructive beat Active in K-12 (Chi 2018); strict ordering does not always hold (npj Science of Learning 2023) | Moderate | Assignment items say how to consume, not just what; predictions, prompts and projects are Constructive; `coach` dialogue is Interactive |
| Desirable difficulties bounded by cognitive load | Slower training, better retention, and learners misjudge it (Bjork 1994; Bjork and Bjork 2011); a difficulty helps only when the learner can overcome it (Kirschner 2006; Ashman 2020) | Strong (as a framework), with boundary conditions from cognitive load theory | Difficulty scales with the declared level; beginners get the scaffolded project first |
| Calibration, predicted vs actual | Pure-study learners predicted the best recall and did worst (Roediger and Karpicke 2006; Karpicke and Blunt 2011); AI users overestimated their learning (Bastani 2025; Prather 2024); calibration measured directly (Kazemitabaar 2025) | Moderate | Checkpoints ask the learner to predict their score, then record the actual one |
| Explain in plain English (EiPE), reading before writing | Tracing plus EiPE explained 46% of code-writing variance (Lopez 2008); EiPE correlates with writing ability (Murphy 2012); explicit skill sequencing improved outcomes (Xie 2019) | Moderate (mostly correlational) | The EiPE prompt doubles as an assessment that copying cannot fake |
| PRIMM (Predict, Run, Investigate, Modify, Make) | 493 students vs 180 controls, r = .13, non-randomised (Sentance 2019) | Moderate | Opening predictions mirror the Predict step; the section project is the Make step |
| Productive failure | Problem-solving-first g = 0.36 (Sinha and Kapur 2021); needs contrasting cases and instruction that builds on the attempt (Loibl 2017); reversed for novices and high element interactivity (Ashman 2020) | Moderate; Contested (novices) | Predictions are short bounded attempts followed at once by the soft landing; no unaided problem-first work for beginners |
| Subgoal labels in worked examples | Better formative quizzes, fewer drops, not better exams, n = 265 (Margulieux 2020; Morrison 2015) | Moderate | Not implemented; candidate for soft-landing examples |
| Explicit problem-solving stages (metacognition) | Naming the current stage made novices more independent (Loksa 2016) | Moderate | `coach` gives one concrete micro-action per message, so the learner always has a named next step |

What the evidence does not support (Dunlosky 2013 low-utility ratings and the source's section F): rereading, rewatching, highlighting or summarising as core activities; long blocked drills on one construct; massed cramming without revisits; treating "completed with AI" as mastery; assuming a Socratic prompt alone makes an AI tutor educational. dojo never assigns rereading or rewatching as review.

### 3.2 AI assistance and learning

| Study | Sample and design | Headline numbers | Caveats and source tag |
|---|---|---|---|
| Bastani et al. 2024 (SSRN) / 2025 (PNAS) | About 1,000 high-school students in about 50 classes, Turkey; RCT with control, GPT Base and GPT Tutor (hints only); four 90-minute maths sessions | Practice: +48% (Base), +127% (Tutor); unassisted exam: Base -17% (about -0.19 SD), Tutor -0.004 (ns) | Students did not notice the loss; guardrails removed harm but produced no gain. Source rule tag: Strong for harm avoidance, Moderate for benefit |
| Kosmyna et al. 2025 | n = 54 (18 per arm), essays with LLM, search engine or nothing; EEG; 18 returned for a crossover | 83% of LLM users could not quote a sentence from their own essay vs about 11%; weakest connectivity in the LLM group | Preprint, small n, EEG analysis criticised (arXiv:2601.00856). Emerging, not peer reviewed |
| Kestin et al. 2025 | n = 194 intro physics, two-week crossover, custom GPT-4 tutor built on the class's own pedagogy vs active-learning class | Post-test medians 4.5 vs 3.5; about 0.7 to 1.3 SD; 49 minutes vs 60 | Two weeks, custom tests, one elite institution, authors built the tutor, no delayed test. Moderate |
| Kazemitabaar et al. 2023 | 69 novices aged 10-17, controlled experiment, 45 Python tasks, half with Codex | 1.15x completion, 1.8x authoring scores; 1-week post-test slightly better, ns | Higher prior knowledge benefited more. Moderate |
| Prather et al. 2023 | 19 CS1 students with Copilot in C++, observational | "Shepherding" and "drifting" interaction patterns | Metacognitive difficulties; qualitative. Moderate |
| Prather et al. 2024 | 21 lab sessions with observation, interviews, eye tracking | 20 of 21 completed; strugglers ended with an "illusion of competence" | Gap widened by prior knowledge. Moderate |
| Margulieux et al. 2024 | Repeated-measures mixed methods; n not given in the source | Self-regulation, self-efficacy and fear of failure predicted usage mode | Moderate |
| Nie et al. 2024/2025 | RCT, n = 5,831 from 146 countries, Code in Place | Offering GPT-4 chat reduced exam participation and engagement on average; adopters may have scored better, under assumptions | Engagement drop reversed in lower-HDI countries. Moderate |
| Lehmann, Cornelius and Sting 2024 | Two pre-registered lab experiments plus a field study; n not given in the source | No average effect; substitution gave shallower understanding, complementing gave more; gap widened by prior knowledge | Preprint and SSRN. Moderate |
| Liffiton et al. 2023 (CodeHelp) | Deployment with prompt guardrails; n not given in the source | Students valued guidance over answers | Descriptive |
| Kazemitabaar et al. 2024 (CodeAid) | 700 students, 12 weeks, 8,000 usages analysed | Design lessons: avoid direct answers, keep the student in control | Descriptive |
| Zamfirescu-Pereira et al. 2025 (61A Bot) | 2,000+ Berkeley CS1 students, 100,000+ requests | Homework time fell by 30+ minutes (up to 50%) for the 50th-80th percentile | Learning effects not established. Descriptive |
| Bassner et al. 2025/2026 (Iris) | n = 275 CS1, three-arm RCT: hint-first Iris, unrestricted ChatGPT, no AI; 90-minute exercise | Both AI arms scored higher on the exercise; neither improved pre-post knowledge or comprehension; only Iris raised intrinsic motivation | Described as a "comfort trap". Source rule tag: Emerging (engagement scaffolds) |
| Kazemitabaar et al. 2025 (IUI) | n = 82 between-subjects and n = 42 within; seven engagement techniques | Lead-and-reveal best for unassisted transfer and calibration | Emerging but directly tested |
| Barcaui 2025 | RCT, n = 120 undergraduates; surprise retention test at 45 days | 57.5% (ChatGPT) vs 68.5% (traditional), d = 0.68 favouring no AI | Single study; no source tag |
| Contractor and Reyes 2026 | Proctored randomised experiment with undergraduates; n not given in the source | +0.27 SD immediate, persisted 1 week; augmentation users held gains, automation users lost them | Preprint. Moderate (usage-mode rule) |
| Xiao et al. 2026 | RCT, n = 979, semester-long CS1, four ICAP-graded prompting interventions | All improved prompting skill; no between-condition exam differences | Preprint. Emerging |
| Clin Deffarges, Kosmyna and Maes 2026 | n = 50, nuclear-safety protocols; unrestricted vs Socratic hint-only vs EEG-adaptive | Unrestricted had the highest immediate gains (d > 0.80); Socratic users progressively disengaged | Preprint; immediate post-test only. Emerging |
| Balepur et al. 2026 | 54 students; code-editing agent vs chatbot | Agents faster; users understood and could extend code less; still preferred the agent | Preprint. Emerging |
| Bo et al. 2026 | n = 24 within-subjects, high vs low sycophancy | Sycophancy left misconceptions uncorrected and lowered performance, unnoticed | Emerging |
| Choi et al. 2025 | Field experiment in an online programming course; n not given in the source | Reflection before a hint: better reflections, lower satisfaction, no immediate performance change | Preprint. Emerging |
| Akgun and Toker 2025 / 2026 | AI-assisted pretesting with a 7-week follow-up; n not given in the source | Gains persisted only when later practice was structured spaced retrieval | Preprints. Emerging |
| LearnLM Team 2025 | Exploratory RCT, n = 165 UK secondary maths | Remediation odds ratio about 7 vs static hints; next-unit first-try 66.2% vs 60.7% (human) vs 56.2% (static) | Technical report, not peer reviewed |
| Henkel et al. 2024 (Rori) | School-randomised, about 500 students, Ghana, 8 months | Maths growth effect size 0.37 | Moderate |
| De Simone et al. 2025 | Six-week after-school programme in Nigeria, Copilot with teacher guidance; n not given in the source | +0.31 SD overall, +0.23 SD English | Working paper |
| Khurana and Liew 2026 | Exploratory EEG study, high-school students; n not given in the source | EEG differences not significant | Preprint; exploratory |
| Deng et al. 2025 (meta-analysis) | 69 experimental articles, 2022-2024 | ChatGPT improved performance and motivation, reduced mental effort | Mostly assisted or immediate outcomes |
| Wu et al. 2026 (meta-analysis) | 35 studies, 4,193 participants | g = 0.670 | Moderated by subject, duration, mode |
| Huang et al. 2025 (meta-analysis) | 133 studies, 188 effects | Strong effects mainly when the LLM acts as a tutor in sustained use | Preprint |
| Strohmaier et al. 2026 (living meta-analysis) | 34 mathematics studies | g = 0.57 [0.36, 0.79]; larger when AI supplements teaching | Living preprint |
| Wang and Fan 2025 (meta-analysis) | Reported g = 0.867 | Retracted in 2026 for discrepancies in the meta-analysis | Retracted; do not cite |

What it adds up to (source section 4.6) and what dojo does with it:

- Performance with AI is not learning (Bastani; Bassner; Barcaui; Balepur): dojo assesses only with unassisted checkpoints and quizzes.
- Withholding answers removes the harm; pedagogy creates the gain: `coach` withholds solutions and adds one micro-action per message, lead-and-reveal style (Kazemitabaar 2025).
- Usage mode mediates (Lehmann; Contractor and Reyes; Xiao): the coach steers toward explanation-seeking, never "fix my code".
- Learners cannot self-diagnose (Bastani; Prather 2024; Kosmyna): checkpoints add predicted-vs-actual calibration.
- Prior knowledge moderates (Kazemitabaar 2023; Lehmann; Prather 2024): AI stays discouraged for ordinary lesson work; the coach is a bounded escape hatch, not the default.
- Socratic modes must sustain engagement (Clin Deffarges; Choi; Bassner): short exchanges, visible progress, a concrete next action every message.

## 4. Finding well-regarded resources

All findings here come from one dry run on 2026-09-25 ("learn Node.js + Express, already know JavaScript") executed inside Claude Code with WebSearch, WebFetch and curl from Bash; raw outputs (`curl_*.out`, `*.json`, `rss_*.out`, `wb_*.out`, `arctic_c_*.json`, `yt_*.html`, `ddg_*.out`) are in the research scratchpad. They are observations, not published claims, so no external URL exists for the observations themselves; endpoint URLs are given where the run used them.

### 4.1 Reachable from Claude Code tools, and not

| Tool and target | Result |
|---|---|
| WebFetch on www.reddit.com, old.reddit.com, stackoverflow.com, web.archive.org | Tool-level refusal; no HTTP request is made |
| WebSearch `site:reddit.com ...` | The `site:` operator is ignored |
| WebSearch `allowed_domains: ["reddit.com"]` | API 400: the domain is "not accessible to our user agent" |
| WebSearch `allowed_domains` for news.ycombinator.com, dev.to | Works (10 HN threads; 10 dev.to posts); lobste.rs returned 0 |
| WebFetch on any JSON or list endpoint | Never returns the raw page; converts to markdown and answers the prompt with a small model; JSON truncated and partly hallucinated ("Points: N/A"); "not visible on the page" can mean the summariser gave up |
| WebFetch behaviour | Cross-host redirects are returned, not followed; responses cached 15 minutes |
| WebFetch works well on | github.com READMEs, developer.mozilla.org (last-modified), fullstackopen.com (updated date), theodinproject.com course pages, nodejs.org/learn, expressjs.com, udemy.com course pages (rating, rating count, students, last updated, hours), manning.com, master.dev, dev.to articles |
| JS shells, empty for WebFetch | freecodecamp.org/learn, scrimba.com course pages, dev.to search, YouTube watch pages (consent wall) |
| Blocked for both WebFetch and curl | classcentral.com (Cloudflare 403), lobste.rs (Anubis), stackoverflow.com HTML (Cloudflare challenge) |

### 4.2 What works via curl, and at what rate

| Route | Result and budget |
|---|---|
| `https://www.reddit.com/r/<sub>/top.rss?t=year` | 200 Atom, 25 entries (title, permalink, date, selftext) |
| `https://www.reddit.com/r/<sub>/search.rss?q=...&restrict_sr=on&sort=top&t=all&limit=50` | 200, 25-50 entries; relevance is Reddit-search quality (on-topic for r/node, mostly unrelated for r/webdev and r/learnjavascript) |
| `https://www.reddit.com/r/<sub>/comments/<id>/.rss?limit=100&sort=top` | 200, post plus comments with author, date, body; no scores |
| Reddit RSS rate limit | Burst of 3, then 429 for the next 7 requests over 21 s; about 1 request per 30 s; a 60 s cooldown recovers |
| Reddit `.json`, `api.reddit.com`, `wiki/index.json` | 403; old.reddit.com serves a new-UI shell to this network; www wiki pages are JS shells |
| `https://arctic-shift.photon-reddit.com/api/comments/search?link_id=<id>&limit=100` | 200 JSON with scores, authors, dates, bodies; 9 of 10 threads at 6 s spacing; one 422 "Timeout. Maybe slow down a bit" |
| Arctic Shift `posts/search?subreddit=<sub>&title=<term>` | 200 but newest-first with no score sort; free-text `query=` and `body=` returned 422 twice |
| `https://web.archive.org/web/2025id_/https://old.reddit.com/r/<sub>/wiki/<page>` | Works via curl (WebFetch refuses the host); old-UI captures are clean HTML with comment scores; www captures are 1 MB JSON blobs; the CDX API timed out, so read the capture timestamp from `%{url_effective}` |
| Wiki captures found | r/learnprogramming index (2025-12-26), faq (2025-11-25), books (2026-07-21), online (2021-04-17, stale); r/learnjavascript index (2025-10-20); r/webdev index (2025-10-30, effectively empty); r/node wiki 404 |
| `https://html.duckduckgo.com/html/?q=site:reddit.com+...` | First query: 11 results, 10 of them Reddit threads; every later query 202 CAPTCHA, even after 60 s; `lite.duckduckgo.com` CAPTCHA immediately. One shot per IP per long window |
| `https://hn.algolia.com/api/v1/search?query=...` | Works; about 50 calls at 0.25 s spacing with no throttling; `tags=story` or `tags=ask_hn`, `hitsPerPage=0` for counts, `numericFilters=created_at_i>...` for recency; quote phrases (unquoted "Traversy node" gave 726 hits) |
| `https://dev.to/api/articles?tag=<tag>&top=365` | 200 JSON with reactions, comments, dates |
| `https://api.stackexchange.com/2.3/search/advanced` | Works, 300 requests per day unauthenticated; returns troubleshooting Q&A, not recommendations (recommendation questions are off-topic there) |
| GitHub REST `repos/<owner>/<repo>` and `repos/<owner>/<repo>/commits?path=...&per_page=1` (host api.github.com) | Works, 60 per hour unauthenticated; stars and precise last-commit dates; `raw.githubusercontent.com` is not rate-limited |
| YouTube watch page with `-b "CONSENT=YES+cb; SOCS=CAI"` | HTML contains `publishDate`, `viewCount`, `lengthSeconds`, `ownerChannelName`; oEmbed gives title and author only; playlist pages came back in a Japanese UI, unparsed |
| Dead or blocked | pullpush.io (429, refuses agents), Redlib mirrors (429, Anubis, 410), r.jina.ai reader proxy (Reddit 403), Google and Bing HTML (no parsable results), Bluesky search (403), Lemmy programming.dev (200 but irrelevant) |
| Local gotcha | This machine's python3 3.9 fails SSL verification; shell out to curl |

### 4.3 Ranking rubric, 0 to 100

Evidence must be linkable: thread URL plus comment score, wiki capture URL, commit URL or video URL. Cost is a filter and a column, not a score; the learner chooses free-only or not.

| Signal | Weight | Scoring |
|---|---|---|
| Endorsement breadth | 15 | Distinct question threads (not launch threads) that mention it: 1 = 5, 2 = 10, 3+ = 15 |
| Endorsement depth (vote-weighted) | 15 | In the top-voted comment of at least one thread = 15; in a top-3 comment = 10; any comment = 5; only in the OP or the author's own replies = 0 |
| Curated inclusion | 10 | Subreddit wiki or sidebar, or a curated list with 10k+ GitHub stars = 10; only SEO listicles = 0 |
| Freshness | 20 | Verified update within 12 months = 20; 12-24 = 14; 24-48 = 7; older or unverifiable = 0. Use the repo commit date, page last-modified, platform "last updated" or video publish date; never a listicle's claimed year |
| Version currency | 5 | Teaches the current major of the framework = 5; one major behind = 2; two or more = 0 |
| Learner fit | 15 | Stated prerequisites match the request = 15; mismatched but skippable = 8; mismatched = 0 |
| Authority | 10 | Official docs, maintainers or a university = 10; independent educator with a public track record and public ratings = 7; anonymous or content farm = 0 |
| Independent signal | 10 | HN mentions of the quoted name in the last 24 months: 10+ = 5, 3+ = 3; plus platform scale (rating 4.5+ with 10k+ ratings, or 1M+ views) = 5 |
| Penalties | - | Only evidence is the author's own thread or an affiliate or tracking listicle: -10. All thread evidence older than 4 years: -5. Voted "outdated", "slow" or "too long" replies: -5. Dead link or redirect to a different product: exclude |

Pipeline that worked: (1) discover threads with one DuckDuckGo HTML query plus `search.rss` on 2-3 subreddits at 30 s spacing plus HN Algolia `ask_hn` and `story`; (2) pull comments with scores from Arctic Shift at 6 s spacing, falling back to the thread `.rss` and then a Wayback capture; (3) pull subreddit wikis from Wayback and record the capture timestamp; (4) extract candidate URLs and names, tally per thread with the max comment score, keep the quote; (5) verify each candidate on its canonical page (WebFetch for HTML pages, GitHub API for commits and stars, curl for YouTube, Udemy pages for ratings and "last updated"); (6) score with the rubric and emit the table with evidence links and a "why it lost points" note.

Dry-run shortlist head, as an example of what evidence looks like: Express official docs (https://expressjs.com/en/starter/installing.html; "read the docs" in 8 of 9 threads, top comment score 10 in thread `beye4e`); Full Stack Open part 3 (https://fullstackopen.com/en/part3; page states updated 2025-03-16, praised in 3 of 9 threads, the top comment in one); TOP NodeJS course (https://www.theodinproject.com/paths/full-stack-javascript/courses/nodejs; repo commit 2026-09-23, listed in the r/learnjavascript wiki capture); MDN Express tutorial (https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Express_Nodejs; Express 5, last modified 2026-09-17, 0 thread mentions, ranked on authority and version currency).

### 4.4 Pitfalls

- Stale threads dominate: the best-matching threads are 2019-2023 and the most-voted videos 2020-2021 (Express 4); `sort=top` surfaces old threads first; the 2025-2026 r/node top feed is memes, AI discourse and "I built X" posts.
- Self-promotion: launch threads (NodeBook), a "$3/hour tutor" pitch, instructors linking their own paid courses; newest-first Arctic Shift results are mostly library announcements.
- Affiliate and SEO listicles dominate WebSearch for every phrasing ("11 best courses 2026", javarevisited, coursesity, educative); awesome-nodejs itself carries an affiliate link; DuckDuckGo's first result was a Udemy ad.
- Dead or moved links: nodejs.dev redirects; Frontend Masters redirects to master.dev; a guessed Odin lesson URL was 404; Class Central and Stack Overflow sit behind Cloudflare; Lobsters and Redlib behind Anubis.
- Search relevance: Reddit's own search returned unrelated posts for two of three subreddits; WebSearch ignores `site:`; only `allowed_domains` works, and not for Reddit.
- Rate limits everywhere: Reddit RSS 429 after 3 requests, DuckDuckGo CAPTCHA after 1, Arctic Shift 422 on heavy queries, GitHub 60 per hour, Stack Exchange 300 per day.
- Tool artefacts: WebFetch summarises; JS-shell pages look empty; RSS has no scores; www-Reddit Wayback captures are JSON blobs.
- Keyword-tally false positives: a "the docs" regex, unquoted HN queries, "Odin" matching sidebar links in a capture. Read the quoted comment before counting it.
- Comment-count bias: launch and rant threads have the most comments and the least information; 4-comment threads carried the clearest recommendations.

## 5. Token efficiency and writing style

### 5.1 Where the tokens go, and what the sources say

- Measured on 2026-09-26 with Opus 5.5, one run per cell, subagent transcripts included: a standard intermediate lesson is 60k fresh input, 954k cache reads and 13k output (173k weighted, with Opus 5.5's cache-read rate of 0.05 of input); depth moves a lesson from 166k to 209k and level from 173k to 208k; a syllabus runs 331k to 510k; a completion project 266k; a checkpoint 136k. Cache reads are over nine tenths of the tokens but a quarter to a third of the weighted cost, and output about two fifths; every token that enters the research pass's context is paid as input once and as a cache read on every later turn, so the size of what enters that context is the lever (ADR 0013). The usage Claude Code reports for a headless run covers the main session only; the research subagent's transcript held more tokens than the session. A later review of the transcripts found the figures are upper bounds: the runs were prompted with a sentence rather than the slash command, so turns went to locating the skill, and one run looped on a lint warning that could not be cleared (`docs/token-runs.md`). The depth setting did not move a lesson's cost, which is why the intake no longer asks for it (ADR 0014).
- Betterclaw's "skills that reduce token usage" names five patterns. Pattern 3, scripts over Markdown instructions, matches dojo's design: the scout, lint, next-item, mark-done, build-site, measure and context are scripts. Its "up to 90%" figure is unsourced. Pattern 5, a condensed context summary sent instead of raw files, is adopted as a computed digest rather than a hand-written one, because a hand-written summary drifts from the files.
- Google Cloud's eleven principles for token-efficient engineering: skills from the start, scripts and CLI tools, delegating output-heavy work to subagents, planning in one session and executing in clean ones, hard stop conditions on loops, and a new session per topic all describe ADR 0008 and the "close the session and go learn" rule. Principle 1, start with a cheaper model and scale up on failure, became the `research_model` profile field.
- SkillReducer (Gao et al., 2026) studied 55,315 public skills: 26.4% lack a routing description, only 38.5% of body text is actionable core rules, and reference files can inject tens of thousands of tokens. Its two-stage compression cut descriptions 48% and bodies 39% while task quality rose 2.8%, a less-is-more effect, with 0.965 mean retention across five models. dojo's skills were already tiered (a router plus on-demand format files) so the format files were trimmed, not restructured. The paper's conclusion names skill obsolescence, skills that stop triggering as models change, as the larger ecosystem problem, which is the case for re-running the evals when the model changes.

### 5.2 AI writing tells

- Hardik Pandya's stop-slop (MIT, 2025) is the base rule set: throat-clearing openers, emphasis crutches, business jargon, adverbs, meta-commentary, vague declaratives; binary contrasts, negative listing, dramatic fragmentation, rhetorical setups, false agency, narrator-from-a-distance, passive voice; a 1 to 10 score on directness, rhythm, trust, authenticity and density.
- Wikipedia's "Signs of AI writing" (WikiProject AI Cleanup, revised through 2026) adds what that list predates and dates the vocabulary by era: 2023 to mid-2024 "delve, tapestry, testament, intricate, pivotal, landscape"; mid-2024 to mid-2025 "align with, bolstered, fostering, showcasing, vibrant"; mid-2025 onward a smaller set, "emphasizing, enhance, highlighting, showcasing". Structural signs: negative parallelisms ("not only X but also Y", "not X, but Y"), the rule of three, canned significance ("stands as a testament", "plays a crucial role"), vague attribution ("experts argue", "industry reports"), outline-like conclusions ("despite these challenges"); formatting signs: bold overuse, title-case headings, headings holding only headings, emoji as formatting, em dashes, thematic breaks, curly quotes, tracking parameters in URLs. It also lists knowledge-cutoff disclaimers and collaborative asides as tells.
- dojo's additions for teaching and coaching prose, from the two sources above and from what tutorials and chat replies do: "in this lesson we will", "let's dive in", "by the end of this lesson", "congratulations", "pro tip", "key takeaways", "happy coding"; "great question", "you're absolutely right", "I hope this helps", apology and praise before content.
- Split: judgement rules in `skills/dojo/STYLE.md`, word and phrase lists in `scripts/lib/style.ts` as lint rules (ADR 0012).

## 6. Citations

Format: author (year). Venue. Title. URL. Undated web pages are marked "accessed 2026-09-25". Entries are copied from the source notes without alteration; two entries whose authors the notes did not capture are marked as such.

### The Odin Project

- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. Lesson template. https://github.com/TheOdinProject/curriculum/blob/main/templates/lesson-template.md
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. Project template. https://github.com/TheOdinProject/curriculum/blob/main/templates/project-template.md
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. Project example (Landing Page). https://github.com/TheOdinProject/curriculum/blob/main/templates/project-example.md
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. Layout style guide (anchors #lesson-layout, #project-layout, #dont-scatter-links-throughout-lessons, #layout-exceptions, #guide-layout, #note-boxes, #atx-style-headings). https://github.com/TheOdinProject/curriculum/blob/main/LAYOUT_STYLE_GUIDE.md
- The Odin Project (revision before 2026-09-22). GitHub, TheOdinProject/curriculum. Layout style guide with Knowledge check rules. https://github.com/TheOdinProject/curriculum/blob/14aff20160/LAYOUT_STYLE_GUIDE.md#lesson-layout
- The Odin Project (revision before 2026-09-22). GitHub, TheOdinProject/curriculum. Lesson template with Knowledge check. https://github.com/TheOdinProject/curriculum/blob/3fa1383f2e/templates/lesson-template.md
- The Odin Project (revision before 2026-09-22). GitHub, TheOdinProject/curriculum. Foundations: Variables and Operators, with knowledge checks. https://github.com/TheOdinProject/curriculum/blob/14aff20160/foundations/javascript_basics/variables_and_operators.md
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. Style guide commit history (Additional resources made optional, 2025-11-26). https://github.com/TheOdinProject/curriculum/commits/main/LAYOUT_STYLE_GUIDE.md
- The Odin Project (2026-05-13). GitHub commit 3f23ae4749. Style Guide: Remove inaccurate statement about assignment section (#31077). https://github.com/TheOdinProject/curriculum/commit/3f23ae4749756d008efecc070bffd0475112f5a4
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. CONTRIBUTING.md (anchors #curriculum-linting, #adding-lessons, #adding-or-removing-lessons-from-the-curriculum). https://github.com/TheOdinProject/curriculum/blob/main/CONTRIBUTING.md
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/.github. Organisation contributing guide, curriculum structure. https://github.com/TheOdinProject/.github/blob/main/CONTRIBUTING.md#curriculum-structure
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. markdownlint rule docs TOP001, TOP003, TOP004, TOP009, TOP013. https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP001.md, https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP003.md, https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP004.md, https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP009.md, https://github.com/TheOdinProject/curriculum/blob/main/markdownlint/docs/TOP013.md
- The Odin Project (2026-09-22). GitHub commit 7a32f72e and PR #31411. Lesson structure: Remove Knowledge Check requirements. https://github.com/TheOdinProject/curriculum/commit/7a32f72e4aae3632a4a541d654c8bb4d8e50e4e0, https://github.com/TheOdinProject/curriculum/pull/31411
- The Odin Project (2026-09-23). GitHub PR #31412. All Lessons: Remove Knowledge Check section. https://github.com/TheOdinProject/curriculum/pull/31412
- The Odin Project (2026). GitHub issues #31410 (tracking) and #31390 (accessibility report), discussion #26669. https://github.com/TheOdinProject/curriculum/issues/31410, https://github.com/TheOdinProject/curriculum/issues/31390, https://github.com/TheOdinProject/curriculum/discussions/26669
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. README. https://github.com/TheOdinProject/curriculum/blob/main/README.md
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. Archived original README and mission statement. https://github.com/TheOdinProject/curriculum/blob/main/archive/README-old.md
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. Curriculum license, CC BY-NC-SA 4.0. https://github.com/TheOdinProject/curriculum/blob/main/license.md
- Creative Commons (accessed 2026-09-25). creativecommons.org. Attribution-NonCommercial-ShareAlike 4.0 International deed. https://creativecommons.org/licenses/by-nc-sa/4.0/
- The Odin Project (2020). GitHub, TheOdinProject/theodinproject. MIT license. https://github.com/TheOdinProject/theodinproject/blob/main/license.txt
- The Odin Project (accessed 2026-09-25). theodinproject.com. Terms of Use. https://www.theodinproject.com/terms_of_use
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/theodinproject. Lesson model, project submissions, NodeJS course fixture. https://github.com/TheOdinProject/theodinproject/blob/main/app/models/lesson.rb, https://github.com/TheOdinProject/theodinproject/blob/main/app/models/project_submission.rb, https://github.com/TheOdinProject/theodinproject/blob/main/db/fixtures/paths/full_stack_javascript/courses/node_js.rb
- The Odin Project (accessed 2026-09-25). theodinproject.com. FAQ. https://www.theodinproject.com/faq
- The Odin Project (accessed 2026-09-25). theodinproject.com. About. https://www.theodinproject.com/about
- The Odin Project (accessed 2026-09-25). theodinproject.com. Paths; Foundations course; NodeJS course. https://www.theodinproject.com/paths, https://www.theodinproject.com/paths/foundations/courses/foundations, https://www.theodinproject.com/paths/full-stack-javascript/courses/nodejs
- The Odin Project (accessed 2026-09-25). theodinproject.com. Foundations: How This Course Will Work. https://www.theodinproject.com/lessons/foundations-how-this-course-will-work
- The Odin Project (accessed 2026-09-25). theodinproject.com. Foundations: Introduction to Web Development. https://www.theodinproject.com/lessons/foundations-introduction-to-web-development
- The Odin Project (accessed 2026-09-25). theodinproject.com. Foundations: Motivation and Mindset, including "A note on AI code generation". https://www.theodinproject.com/lessons/foundations-motivation-and-mindset#a-note-on-ai-code-generation (source: https://github.com/TheOdinProject/curriculum/blob/main/foundations/introduction/motivation_and_mindset.md)
- The Odin Project (2023-02-24, merged 2023-03-15). GitHub commit f7d56fc3 and PR #25139. fix: Add a note about generative AI. https://github.com/TheOdinProject/curriculum/commit/f7d56fc3f367a056ebfa8403d49a29bf608cbcae, https://github.com/TheOdinProject/curriculum/pull/25139
- The Odin Project (2026-07-04). GitHub commit 53497c7e. Include Google's AI overview in our AI avoidance advice. https://github.com/TheOdinProject/curriculum/commit/53497c7e0cc6f452ebb9bd3f62188a4ed2977cdf
- The Odin Project (accessed 2026-09-25). theodinproject.com. Foundations: Asking For Help. https://www.theodinproject.com/lessons/foundations-asking-for-help
- The Odin Project (accessed 2026-09-25). theodinproject.com. Foundations: Join the Odin Community. https://www.theodinproject.com/lessons/foundations-join-the-odin-community
- The Odin Project (accessed 2026-09-25). theodinproject.com. Foundations: Text Editors (disable Copilot; how to watch the video). https://www.theodinproject.com/lessons/foundations-text-editors
- The Odin Project (accessed 2026-09-25). theodinproject.com. Foundations: Project: Recipes (do-not-peek warning). https://www.theodinproject.com/lessons/foundations-recipes (source: https://github.com/TheOdinProject/curriculum/blob/main/foundations/html_css/html_foundations/project_recipes.md)
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. Ruby: How this course will work (LaunchSchool chatbot note). https://github.com/TheOdinProject/curriculum/blob/main/ruby/introduction/how_this_course_will_work.md
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. NodeJS: Prisma ORM. https://github.com/TheOdinProject/curriculum/blob/main/nodeJS/orms/prisma_orm.md
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/curriculum. Getting Hired: Professional Networking. https://github.com/TheOdinProject/curriculum/blob/main/getting_hired/preparing_for_job_search/professional_networking.md
- The Odin Project (accessed 2026-09-25). theodinproject.com community guides. Rules; Expectations; How to ask technical questions; Help yourself before asking others; How to help others. https://www.theodinproject.com/guides/community/rules, https://www.theodinproject.com/guides/community/expectations, https://www.theodinproject.com/guides/community/how_to_ask, https://www.theodinproject.com/guides/community/before_asking, https://www.theodinproject.com/guides/community/how_to_help
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/odin-bot-v2. `/ai` slash command. https://github.com/TheOdinProject/odin-bot-v2/blob/main/bot-commands/slash/ai.js
- The Odin Project (accessed 2026-09-25). GitHub, TheOdinProject/odin-bot-v2. `/research` command and the other slash commands. https://github.com/TheOdinProject/odin-bot-v2/blob/main/bot-commands/slash/research.js, https://github.com/TheOdinProject/odin-bot-v2/tree/main/bot-commands/slash
- The Odin Project (2026-09-24). GitHub, TheOdinProject/odin-bot-v2, PR #921. Use web mode to remove AI response. https://github.com/TheOdinProject/odin-bot-v2/pull/921
- Trautman, E. (accessed 2026-09-25). dev.to/theodinproject. Why Learning to Code is So Damn Hard. https://dev.to/theodinproject/why-learning-to-code-is-so-damn-hard-11nn
- The Odin Project (accessed 2026-09-25). dev.to/theodinproject. Reading Comprehension. https://dev.to/theodinproject/reading-comprehension-22e0
- The Odin Project (accessed 2026-09-25). dev.to/theodinproject. Memorization and learning to code. https://dev.to/theodinproject/memorization-and-learning-to-code-1b6h
- The Odin Project (accessed 2026-09-25). dev.to/theodinproject. Becoming a TOP Success Story; Mindset. https://dev.to/theodinproject/becoming-a-top-success-story-mindset-3dp2, https://dev.to/theodinproject/mindset-2bbn
- The Odin Project (accessed 2026-09-25). dev.to/theodinproject. Coding education for all: join us in supporting The Odin Project. https://dev.to/theodinproject/coding-education-for-all-join-us-in-supporting-the-odin-project-3ilp
- Humphrey, D. (accessed 2026-09-25). blog.humphd.org. CheatGPT. https://blog.humphd.org/cheatgpt/

### General learning science

- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., and Willingham, D. T. (2013). Psychological Science in the Public Interest, 14(1), 4-58. Improving students' learning with effective learning techniques: Promising directions from cognitive and educational psychology. https://journals.sagepub.com/doi/abs/10.1177/1529100612453266 (PDF: https://www.wku.edu/senate/documents/improving_student_learning_dunlosky_2013.pdf)
- Roediger, H. L., and Karpicke, J. D. (2006). Psychological Science, 17(3), 249-255. Test-enhanced learning: Taking memory tests improves long-term retention. https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x (PDF: https://learninglab.psych.purdue.edu/downloads/2006/2006_Roediger_Karpicke_PsychSci.pdf)
- Karpicke, J. D., and Blunt, J. R. (2011). Science, 331(6018), 772-775. Retrieval practice produces more learning than elaborative studying with concept mapping. https://www.science.org/doi/10.1126/science.1199327 (PDF: https://learninglab.psych.purdue.edu/downloads/2011/2011_Karpicke_Blunt_Science.pdf)
- Rowland, C. A. (2014). Psychological Bulletin, 140(6), 1432-1463. The effect of testing versus restudy on retention: A meta-analytic review of the testing effect. https://doi.org/10.1037/a0037559
- Adesope, O. O., Trevisan, D. A., and Sundararajan, N. (2017). Review of Educational Research, 87(3), 659-701. Rethinking the use of tests: A meta-analysis of practice testing. https://journals.sagepub.com/doi/abs/10.3102/0034654316689306
- Yang, C., Luo, L., Vadillo, M. A., Yu, R., and Shanks, D. R. (2021). Psychological Bulletin, 147(4), 399-435. Testing (quizzing) boosts classroom learning: A systematic and meta-analytic review. https://pubmed.ncbi.nlm.nih.gov/33683913/
- Agarwal, P. K., Nunes, L. D., and Blunt, J. R. (2021). Educational Psychology Review, 33, 1409-1453. Retrieval practice consistently benefits student learning: A systematic review of applied research in schools and classrooms. https://link.springer.com/article/10.1007/s10648-021-09595-9
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., and Rohrer, D. (2006). Psychological Bulletin, 132(3), 354-380. Distributed practice in verbal recall tasks: A review and quantitative synthesis. https://escholarship.org/uc/item/3rr6q10c
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., and Pashler, H. (2008). Psychological Science, 19(11), 1095-1102. Spacing effects in learning: A temporal ridgeline of optimal retention. https://laplab.ucsd.edu/articles/Cepeda%20et%20al%202008_psychsci.pdf
- Karpicke, J. D., and Roediger, H. L. (2007). Journal of Experimental Psychology: Learning, Memory, and Cognition, 33(4), 704-719. Expanding retrieval practice promotes short-term retention, but equally spaced retrieval enhances long-term retention. https://learninglab.psych.purdue.edu/downloads/2007/2007_Karpicke_Roediger_JEPLMC.pdf
- Kang, S. H. K., Lindsey, R. V., Mozer, M. C., and Pashler, H. (2014). Psychonomic Bulletin and Review, 21(6), 1544-1550. Retrieval practice over the long term: Should spacing be expanding or equal-interval? https://link.springer.com/article/10.3758/s13423-014-0636-z
- Latimier, A., Peyre, H., and Ramus, F. (2021). Educational Psychology Review, 33, 959-987. A meta-analytic review of the benefit of spacing out retrieval practice episodes on retention. https://link.springer.com/article/10.1007/s10648-020-09572-8
- Rohrer, D., and Taylor, K. (2007). Instructional Science, 35(6), 481-498. The shuffling of mathematics problems improves learning. http://uweb.cas.usf.edu/~drohrer/pdfs/Rohrer&Taylor2007IS.pdf
- Rohrer, D., Dedrick, R. F., and Stershic, S. (2015). Journal of Educational Psychology, 107(3), 900-908. Interleaved practice improves mathematics learning. http://uweb.cas.usf.edu/~drohrer/pdfs/Rohrer_et_al_2015JEdPsych.pdf
- Rohrer, D., Dedrick, R. F., Hartwig, M. K., and Cheung, C.-N. (2020). Journal of Educational Psychology, 112(1), 40-52. A randomized controlled trial of interleaved mathematics practice. https://eric.ed.gov/?id=EJ1237752
- Brunmair, M., and Richter, T. (2019). Psychological Bulletin, 145(11), 1029-1052. Similarity matters: A meta-analysis of interleaved learning and its moderators. https://psycnet.apa.org/record/2019-57442-001
- Bjork, R. A. (1994). In J. Metcalfe and A. Shimamura (Eds.), Metacognition: Knowing about knowing, MIT Press, 185-205. Memory and metamemory considerations in the training of human beings. https://gwern.net/doc/psychology/spaced-repetition/1994-bjork.pdf
- Bjork, E. L., and Bjork, R. A. (2011). Psychology and the real world: Essays illustrating fundamental contributions to society, Worth, 56-64. Making things hard on yourself, but in a good way: Creating desirable difficulties to enhance learning. https://burrell.edu/wp-content/uploads/2020/09/EBjorkRBjork_FABBSchapter2014-2nd-ed._WithCoverPage.pdf
- Slamecka, N. J., and Graf, P. (1978). Journal of Experimental Psychology: Human Learning and Memory, 4(6), 592-604. The generation effect: Delineation of a phenomenon. https://doi.org/10.1037/0278-7393.4.6.592
- Bertsch, S., Pesta, B. J., Wiscott, R., and McDaniel, M. A. (2007). Memory and Cognition, 35(2), 201-210. The generation effect: A meta-analytic review. https://link.springer.com/article/10.3758/BF03193441
- Richland, L. E., Kornell, N., and Kao, L. S. (2009). Journal of Experimental Psychology: Applied, 15(3), 243-257. The pretesting effect: Do unsuccessful retrieval attempts enhance learning? https://learninglab.uchicago.edu/Pre-Testing_files/RichlandKornellKao.pdf
- Kornell, N., Hays, M. J., and Bjork, R. A. (2009). Journal of Experimental Psychology: Learning, Memory, and Cognition, 35(4), 989-998. Unsuccessful retrieval attempts enhance subsequent learning. https://web.williams.edu/Psychology/Faculty/Kornell/Publications/Kornell.Hays.Bjork.2009.pdf
- Pan, S. C., and Carpenter, S. K. (2023). Educational Psychology Review, 35, 97. Prequestioning and pretesting effects: A review of empirical research, theoretical perspectives, and implications for educational practice. https://link.springer.com/article/10.1007/s10648-023-09814-5
- King-Shepard, Q. W., Walker, J., Nokes-Malach, T. J., et al. (2025). Educational Psychology Review, 37. The effect of prequestions on learning: A multilevel meta-analysis. https://link.springer.com/article/10.1007/s10648-025-10075-7
- Sweller, J., and Cooper, G. A. (1985). Cognition and Instruction, 2(1), 59-89. The use of worked examples as a substitute for problem solving in learning algebra. https://www.tandfonline.com/doi/abs/10.1207/s1532690xci0201_3
- Sweller, J. (2006). Learning and Instruction, 16(2), 165-169. The worked example effect and human cognition. https://doi.org/10.1016/j.learninstruc.2006.02.005
- Kirschner, P. A., Sweller, J., and Clark, R. E. (2006). Educational Psychologist, 41(2), 75-86. Why minimal guidance during instruction does not work: An analysis of the failure of constructivist, discovery, problem-based, experiential, and inquiry-based teaching. https://www.tandfonline.com/doi/abs/10.1207/s15326985ep4102_1
- Kalyuga, S., Chandler, P., Tuovinen, J., and Sweller, J. (2001). Journal of Educational Psychology, 93(3), 579-588. When problem solving is superior to studying worked examples. https://doi.org/10.1037/0022-0663.93.3.579
- Kalyuga, S., Ayres, P., Chandler, P., and Sweller, J. (2003). Educational Psychologist, 38(1), 23-31. The expertise reversal effect. https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_4
- Renkl, A., Atkinson, R. K., Maier, U. H., and Staley, R. (2002). Journal of Experimental Education, 70(4), 293-315. From example study to problem solving: Smooth transitions help learning. http://www.davidlewisphd.com/courses/EDD8121/readings/2002-Renkl_et_al.pdf
- Atkinson, R. K., Renkl, A., and Merrill, M. M. (2003). Journal of Educational Psychology, 95(4), 774-783. Transitioning from studying examples to solving problems: Effects of self-explanation prompts and fading worked-out steps. https://doi.org/10.1037/0022-0663.95.4.774
- Barbieri, C. A., Miller-Cotto, D., Clerjuste, S. N., and Chawla, K. (2023). Educational Psychology Review, 35, 11. A meta-analysis of the worked examples effect on mathematics performance. https://link.springer.com/article/10.1007/s10648-023-09745-1
- Ashman, G., Kalyuga, S., and Sweller, J. (2020). Educational Psychology Review, 32, 229-247. Problem-solving or explicit instruction: Which should go first when element interactivity is high? https://link.springer.com/article/10.1007/s10648-019-09500-5
- Kapur, M. (2008). Cognition and Instruction, 26(3), 379-424. Productive failure. https://www.tandfonline.com/doi/abs/10.1080/07370000802212669
- Kapur, M. (2014). Cognitive Science, 38(5), 1008-1022. Productive failure in learning math. https://onlinelibrary.wiley.com/doi/10.1111/cogs.12107
- Sinha, T., and Kapur, M. (2021). Review of Educational Research, 91(5), 761-798. When problem solving followed by instruction works: Evidence for productive failure. https://journals.sagepub.com/doi/10.3102/00346543211019105
- Loibl, K., Roll, I., and Rummel, N. (2017). Educational Psychology Review, 29, 693-715. Towards a theory of when and how problem solving followed by instruction supports learning. https://link.springer.com/article/10.1007/s10648-016-9379-x
- Chi, M. T. H., and Wylie, R. (2014). Educational Psychologist, 49(4), 219-243. The ICAP framework: Linking cognitive engagement to active learning outcomes. https://www.tandfonline.com/doi/abs/10.1080/00461520.2014.965823 (PDF: https://education.asu.edu/sites/g/files/litvpz656/files/lcl/chiwylie2014icap_2.pdf)
- Chi, M. T. H., Adams, J., Bogusch, E. B., et al. (2018). Cognitive Science, 42(6), 1777-1832. Translating the ICAP theory of cognitive engagement into practice. https://onlinelibrary.wiley.com/doi/full/10.1111/cogs.12626
- Wiggins, B. L., Eddy, S. L., Grunspan, D. Z., and Crowe, A. J. (2017). AERA Open, 3(2). The ICAP active learning framework predicts the learning gains observed in intensely active classroom experiences. https://journals.sagepub.com/doi/full/10.1177/2332858417708567
- Authors not captured in the source notes (2023). npj Science of Learning. Questioning central assumptions of the ICAP framework. https://www.nature.com/articles/s41539-023-00197-4
- Chi, M. T. H., Bassok, M., Lewis, M. W., Reimann, P., and Glaser, R. (1989). Cognitive Science, 13(2), 145-182. Self-explanations: How students study and use examples in learning to solve problems. https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog1302_1
- Chi, M. T. H., de Leeuw, N., Chiu, M.-H., and LaVancher, C. (1994). Cognitive Science, 18(3), 439-477. Eliciting self-explanations improves understanding. https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1803_3
- Bisra, K., Liu, Q., Nesbit, J. C., Salimi, F., and Winne, P. H. (2018). Educational Psychology Review, 30, 703-725. Inducing self-explanation: A meta-analysis. https://link.springer.com/article/10.1007/s10648-018-9434-x

### Programming education

- Ericson, B. J., Margulieux, L. E., and Rick, J. (2017). Koli Calling International Conference on Computing Education Research. Solving Parsons problems versus fixing and writing code. https://dl.acm.org/doi/10.1145/3141880.3141895
- Ericson, B. J., Foley, J. D., and Rick, J. (2018). ICER 2018, 60-68. Evaluating the efficiency and effectiveness of adaptive Parsons problems. https://dl.acm.org/doi/10.1145/3230977.3231000
- Du, Y., Luxton-Reilly, A., and Denny, P. (2020). Australasian Computing Education Conference (ACE). A review of research on Parsons problems. https://www.researchgate.net/publication/338785921_A_Review_of_Research_on_Parsons_Problems
- Ericson, B. J., et al. (2022). ITiCSE Working Group Reports. Parsons problems and beyond: Systematic literature review and empirical study designs. https://dl.acm.org/doi/10.1145/3571785.3574127
- Weinman, N., Fox, A., and Hearst, M. A. (2021). CHI 2021. Improving instruction of programming patterns with faded Parsons problems. https://dl.acm.org/doi/fullHtml/10.1145/3411764.3445228
- Sentance, S., and Waite, J. (2017). WiPSCE 2017. PRIMM: Exploring pedagogical approaches for teaching text-based programming in school. Project page: https://computingeducationresearch.org/projects/primm/
- Sentance, S., Waite, J., and Kallia, M. (2019). Computer Science Education, 29(2-3), 136-176. Teaching computer programming with PRIMM: A sociocultural perspective. https://www.tandfonline.com/doi/full/10.1080/08993408.2019.1608781 (author copy: https://suesentance.net/wp-content/uploads/2020/02/teaching_computer_programming_with_primm__a_sociocultural_perspective_author_copy.pdf)
- Lister, R., Adams, E. S., Fitzgerald, S., et al. (2004). SIGCSE Bulletin, 36(4), 119-150. A multi-national study of reading and tracing skills in novice programmers. https://dl.acm.org/doi/10.1145/1041624.1041673
- Lopez, M., Whalley, J., Robbins, P., and Lister, R. (2008). ICER 2008, 101-112. Relationships between reading, tracing and writing skills in introductory programming. https://dl.acm.org/doi/10.1145/1404520.1404531
- Venables, A., Tan, G., and Lister, R. (2009). ICER 2009. A closer look at tracing, explaining and code writing skills in the novice programmer. https://dl.acm.org/doi/10.1145/1584322.1584336
- Murphy, L., Fitzgerald, S., Lister, R., and McCauley, R. (2012). ICER 2012, 111-118. Ability to 'explain in plain English' linked to proficiency in computer-based programming. https://dl.acm.org/doi/10.1145/2361276.2361299
- Xie, B., Nelson, G. L., Ko, A. J., et al. (2019). Computer Science Education, 29(2-3), 205-253. A theory of instruction for introductory programming skills. https://www.tandfonline.com/doi/abs/10.1080/08993408.2019.1565235
- Margulieux, L. E., Guzdial, M., and Catrambone, R. (2012). ICER 2012. Subgoal-labeled instructional material improves performance and transfer in learning to develop mobile applications. https://www.cs1subgoals.org/publications/
- Morrison, B. B., Margulieux, L. E., and Guzdial, M. (2015). ICER 2015, 21-30. Subgoals, context, and worked examples in learning computing problem solving. https://dl.acm.org/doi/10.1145/2787622.2787733
- Margulieux, L. E., Morrison, B. B., and Decker, A. (2020). International Journal of STEM Education, 7, 19. Reducing withdrawal and failure rates in introductory programming with subgoal labeled worked examples. https://doi.org/10.1186/s40594-020-00222-7
- Vihavainen, A., Miller, C. S., and Settle, A. (2015). SIGCSE 2015. Benefits of self-explanation in introductory programming. https://dl.acm.org/doi/abs/10.1145/2676723.2677260
- Loksa, D., Ko, A. J., Jernigan, W., Oleson, A., Mendez, C. J., and Burnett, M. M. (2016). CHI 2016, 1449-1461. Programming, problem solving, and self-awareness: Effects of explicit guidance. https://dl.acm.org/doi/10.1145/2858036.2858252
- Authors not captured in the source notes (2024). arXiv preprint (Emerging). Investigating the use of productive failure as a design paradigm for learning introductory Python programming. https://arxiv.org/pdf/2411.11227

### AI assistance and learning

- Bastani, H., Bastani, O., Sungu, A., Ge, H., Kabakci, O., and Mariman, R. (2024). SSRN working paper 4895486. Generative AI can harm learning. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4895486
- Bastani, H., Bastani, O., Sungu, A., Ge, H., Kabakci, O., and Mariman, R. (2025). PNAS, 122(26), e2422633122. Generative AI without guardrails can harm learning: Evidence from high school mathematics. https://www.pnas.org/doi/10.1073/pnas.2422633122 (open access: https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/)
- Kosmyna, N., Hauptmann, E., Yuan, Y. T., Situ, J., Liao, X.-H., Beresnitzky, A. V., Braunstein, I., and Maes, P. (2025). arXiv:2506.08872 (preprint). Your brain on ChatGPT: Accumulation of cognitive debt when using an AI assistant for essay writing task. https://arxiv.org/abs/2506.08872 (methodological commentary: https://arxiv.org/abs/2601.00856)
- Kestin, G., Miller, K., Klales, A., Milbourne, T., and Ponti, G. (2025). Scientific Reports, 15, 17458. AI tutoring outperforms in-class active learning: An RCT introducing a novel research-based design in an authentic educational setting. https://www.nature.com/articles/s41598-025-97652-6
- Kazemitabaar, M., Chow, J., Ma, C. K. T., Ericson, B. J., Weintrop, D., and Grossman, T. (2023). CHI 2023. Studying the effect of AI code generators on supporting novice learners in introductory programming. https://dl.acm.org/doi/10.1145/3544548.3580919 (preprint: https://arxiv.org/abs/2302.07427)
- Prather, J., Reeves, B. N., Denny, P., Becker, B. A., Leinonen, J., Luxton-Reilly, A., Powell, G., Finnie-Ansley, J., and Santos, E. A. (2023). ACM Transactions on Computer-Human Interaction, 31(1), article 4. "It's weird that it knows what I want": Usability and interactions with Copilot for novice programmers. https://dl.acm.org/doi/10.1145/3617367 (preprint: https://arxiv.org/abs/2304.02491)
- Prather, J., Reeves, B., Leinonen, J., MacNeil, S., Randrianasolo, A. S., Becker, B., Kimmel, B., Wright, J., and Briggs, B. (2024). ICER 2024. The widening gap: The benefits and harms of generative AI for novice programmers. https://dl.acm.org/doi/10.1145/3632620.3671116 (preprint: https://arxiv.org/abs/2405.17739)
- Margulieux, L. E., Prather, J., Reeves, B. N., Becker, B. A., Cetin Uzun, G., Loksa, D., Leinonen, J., and Denny, P. (2024). ITiCSE 2024. Self-regulation, self-efficacy, and fear of failure interactions with how novices use LLMs to solve programming problems. https://dl.acm.org/doi/10.1145/3649217.3653621
- Prather, J., Denny, P., Leinonen, J., Becker, B. A., et al. (2023). ITiCSE Working Group Reports 2023. The robots are here: Navigating the generative AI revolution in computing education. https://dl.acm.org/doi/10.1145/3623762.3633499
- Denny, P., Prather, J., Becker, B. A., et al. (2024). Communications of the ACM, 67(2). Computing education in the era of generative AI. https://dl.acm.org/doi/10.1145/3624720
- Nie, A., Chandak, Y., Suzara, M., Ali, M., et al. (2025). ACM Learning at Scale 2025. The GPT surprise: Offering large language model chat in a massive coding class reduced engagement but may increase adopters' exam performances. https://dl.acm.org/doi/10.1145/3698205.3733960 (preprint 2024: https://arxiv.org/abs/2407.09975)
- Lehmann, M., Cornelius, P. B., and Sting, F. J. (2024). arXiv:2409.09047 and SSRN 4941259. AI meets the classroom: When do large language models harm learning? https://arxiv.org/abs/2409.09047
- Liffiton, M., Sheese, B., Savelka, J., and Denny, P. (2023). Koli Calling 2023. CodeHelp: Using large language models with guardrails for scalable support in programming classes. https://dl.acm.org/doi/10.1145/3631802.3631830
- Kazemitabaar, M., Ye, R., Wang, X., Henley, A. Z., Denny, P., Craig, M., and Grossman, T. (2024). CHI 2024. CodeAid: Evaluating a classroom deployment of an LLM-based programming assistant that balances student and educator needs. https://dl.acm.org/doi/10.1145/3613904.3642773
- Zamfirescu-Pereira, J. D., Qi, L., Hartmann, B., DeNero, J., and Norouzi, N. (2025). SIGCSE TS 2025. 61A Bot report: AI assistants in CS1 save students homework time and reduce demands on staff. (Now what?) https://dl.acm.org/doi/10.1145/3641554.3701864 (preprint: https://arxiv.org/abs/2406.05600)
- Kazemitabaar, M., Huang, O., Suh, S., Henley, A. Z., and Grossman, T. (2025). IUI 2025, 695-714. Exploring the design space of cognitive engagement techniques with AI-generated code for enhanced learning. https://arxiv.org/abs/2410.08922
- Bassner, P., Lenk-Ostendorf, B., Beinstingel, R., Wasner, T., and Krusche, S. (2025/2026). Computers and Education: Artificial Intelligence, 10, 100537. Less stress, better scores, same learning: The dissociation of performance and learning in AI-supported programming education. https://www.sciencedirect.com/science/article/pii/S2666920X25001778
- Barcaui, A. (2025). Social Sciences and Humanities Open. ChatGPT as a cognitive crutch: Evidence from a randomized controlled trial on knowledge retention. https://www.sciencedirect.com/science/article/pii/S2590291125010186
- Contractor, Z., and Reyes, G. (2026). arXiv:2607.08849 (preprint). Experimental evidence on the learning impact of generative AI. https://arxiv.org/abs/2607.08849
- Xiao, R., Ye, R., Hou, X., Wen, J., Kumar, H., Liut, M., and Stamper, J. (2026). arXiv:2602.16033 (preprint). Transforming GenAI policy to prompting instruction: An RCT of scalable prompting interventions in a CS1 course. https://arxiv.org/abs/2602.16033
- Clin Deffarges, A., Kosmyna, N., and Maes, P. (2026). arXiv:2609.00584 (preprint). Socrates went nuclear: Comparing interaction strategies for AI systems in a learning context using brain sensing. https://arxiv.org/abs/2609.00584
- Balepur, N., Baumler, C., Chen, V., Choi, E., Rudinger, R., and Boyd-Graber, J. L. (2026). arXiv:2607.26375 (preprint). (Im)Paired programming: Coding agents improve productivity but harm understanding. https://arxiv.org/abs/2607.26375
- Bo, J. Y., Kazemitabaar, M., Deng, M., Inzlicht, M., and Anderson, A. (2026). CHI 2026. Invisible saboteurs: Sycophantic LLMs mislead novices in problem-solving tasks. https://arxiv.org/abs/2510.03667
- Choi, H., Phung, T., Wu, M., Singla, A., and Brooks, C. (2025). arXiv:2512.04630 (preprint). Reflection-satisfaction tradeoff: Investigating impact of reflection on student engagement with AI-generated programming hints. https://arxiv.org/abs/2512.04630
- Akgun, M., and Toker, S. (2025). arXiv:2504.10249. Struggle first, prompt later: How task complexity shapes learning with GenAI-assisted pretesting. https://arxiv.org/abs/2504.10249
- Akgun, M., and Toker, S. (2026). arXiv:2606.22328. Do gains from generative AI-enabled adaptive pretesting persist? Evidence from a retention study. https://arxiv.org/abs/2606.22328
- Khurana, K., and Liew, A. (2026). arXiv:2606.26579 (exploratory; EEG differences not significant). An exploratory behavioral and electroencephalographic study of artificial intelligence-assisted learning modes in high school students. https://arxiv.org/abs/2606.26579
- LearnLM Team, Google and Eedi (2025). Technical report, 11 November 2025 (not peer reviewed). AI tutoring can safely and effectively support students: An exploratory RCT in UK classrooms. https://storage.googleapis.com/deepmind-media/LearnLM/learnLM_nov25.pdf
- Henkel, O., Horne-Robinson, H., Kozhakhmetova, N., and Lee, A. (2024). AIED 2024 (LNCS). Effective and scalable math support: Evidence on the impact of an AI-tutor on math achievement in Ghana. https://link.springer.com/chapter/10.1007/978-3-031-64315-6_34 (preprint: https://arxiv.org/abs/2402.09809)
- De Simone, M., Tiberti, F., Barron Rodriguez, M., Manolio, F., Mosuro, W., and Dikoru, E. J. (2025). World Bank Policy Research Working Paper 11125. From chalkboards to chatbots: Evaluating the impact of generative AI on learning outcomes in Nigeria. https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099548105192529324
- Deng, R., Jiang, M., Yu, X., Lu, Y., and Liu, S. (2025). Computers and Education, 227, 105224. Does ChatGPT enhance student learning? A systematic review and meta-analysis of experimental studies. https://www.sciencedirect.com/science/article/pii/S0360131524002380
- Wu, X., Zhu, P., Zhang, J., Yin, M., and Wang, Y. (2026). Humanities and Social Sciences Communications, 13, 684. ChatGPT's impact on student learning outcomes: A meta-analysis of 35 experimental studies. https://www.nature.com/articles/s41599-026-07019-z
- Huang, J., Wang, R. R., Liu, J.-H., Xia, B., Huang, Y., Sun, R., Xue, J. M., and Zou, J. (2025). arXiv:2509.22725 (preprint). A meta-analysis of LLM effects on students across qualification, socialisation, and subjectification. https://arxiv.org/abs/2509.22725
- Strohmaier, A., Boedefeld, S., Straser, O., and Reinhold, F. (2026). arXiv:2601.18685 (living preprint). LLAMA LIMA: A living meta-analysis on the effects of generative AI on learning mathematics. https://arxiv.org/abs/2601.18685
- Wang, J., and Fan, W. (2025). Humanities and Social Sciences Communications, 12, 621. The effect of ChatGPT on students' learning performance, learning perception, and higher-order thinking: Insights from a meta-analysis. RETRACTED 2026, do not cite: https://www.nature.com/articles/s41599-026-07310-z

### Resource discovery endpoints and example pages (tested 2026-09-25)

- Reddit (tested 2026-09-25). www.reddit.com. RSS routes `top.rss`, `search.rss`, thread `.rss`; example pattern. https://www.reddit.com/r/node/top.rss?t=year
- Arctic Shift (tested 2026-09-25). arctic-shift.photon-reddit.com. Comment search API with scores. https://arctic-shift.photon-reddit.com/api/comments/search
- Internet Archive (tested 2026-09-25). web.archive.org. Wayback `id_` captures of old.reddit wiki pages; example pattern. https://web.archive.org/web/2025id_/https://old.reddit.com/r/learnprogramming/wiki/index
- DuckDuckGo (tested 2026-09-25). html.duckduckgo.com. HTML search endpoint. https://html.duckduckgo.com/html/
- Algolia (tested 2026-09-25). hn.algolia.com. Hacker News search API. https://hn.algolia.com/api/v1/search
- dev.to (tested 2026-09-25). dev.to. Articles API. https://dev.to/api/articles
- Stack Exchange (tested 2026-09-25). api.stackexchange.com. Advanced search endpoint. https://api.stackexchange.com/2.3/search/advanced
- Express (accessed 2026-09-25). expressjs.com. Getting started: Installing. https://expressjs.com/en/starter/installing.html
- University of Helsinki (accessed 2026-09-25). fullstackopen.com. Full Stack Open, Part 3: Programming a server with Node.js and Express. https://fullstackopen.com/en/part3
- MDN (accessed 2026-09-25). developer.mozilla.org. Express web framework (Node.js/JavaScript). https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Express_Nodejs

### Token efficiency and writing style

- Betterclaw (2026). Skills that reduce token usage. https://www.betterclaw.io/blog/skills-that-reduce-token-usage
- Google Cloud (2026). A guide to AI tokenomics: eleven principles for token-efficient software engineering. https://cloud.google.com/blog/topics/developers-practitioners/guide-to-ai-tokenomics-eleven-principles-for-token-efficient-software-engineering
- Gao, Y., Li, Z., Yuan, Y., Ji, Z., Ma, P., Wang, S. (2026). SkillReducer: Optimizing LLM Agent Skills for Token Efficiency. arXiv:2603.29919. https://arxiv.org/html/2603.29919v1
- Pandya, H. (2025). stop-slop: a skill file for removing AI tells from prose. MIT. https://github.com/hardikpandya/stop-slop
- Wikipedia (accessed 2026-09-26). Wikipedia:Signs of AI writing. https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
- Wikipedia (accessed 2026-09-26). Wikipedia:WikiProject AI Cleanup. https://en.wikipedia.org/wiki/Wikipedia:WikiProject_AI_Cleanup
