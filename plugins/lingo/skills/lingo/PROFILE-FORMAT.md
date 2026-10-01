# Profile format

The **profile** is the marker file that makes a directory a workspace, and the record of intake. Commands find the workspace by looking for `profile.md` with a `lingo` frontmatter key in the current directory or its parents.

File: `profile.md` at the workspace root. Written by the init-workspace script from the intake answers; edited by the learner whenever the goal moves or a skill climbs.

```md
---
lingo: 0.1.0
language: Spanish
language_code: es-MX
native_language: English
slug: spanish
level: A2
listening: A2
reading: B1
speaking: A1
writing: A2
target_level: B1
exam: none
research_model: inherit
hours_per_week: 5
target_date: 2027-06-30
created: 2026-10-01
---
# Profile

## Goal

Talk with my partner's family in Guadalajara for an evening without switching to English, and follow the conversation at the table.

## Prior experience

Two years of school Spanish ten years ago. Reads simple news with a dictionary. Has never spoken it outside class.

## Focus

Speaking and listening first. Reading is fine for now.

## Notes

Mexican Spanish: ustedes, no vosotros. Prefers podcasts to video.
```

## Placement

Place each of the four skills from what the learner says they can do, using these short descriptors (adapted from the CEFR self-assessment grid, `docs/evidence.md` section 4). A0 means no study yet.

| Level | Listening | Reading | Speaking | Writing |
|-------|-----------|---------|----------|---------|
| A1 | Familiar words and phrases about yourself, said slowly | Names, signs, simple notices | Simple questions and answers on familiar topics, with help | A postcard, a form with your details |
| A2 | Phrases on everyday matters; the point of short, clear announcements | Short simple texts: ads, menus, timetables, personal letters | Routine exchanges on familiar topics; a short social chat | Short notes and messages; a simple thank-you letter |
| B1 | The main points of clear speech on work, school, leisure; many radio or TV programmes on familiar topics | Everyday texts; descriptions of events and feelings in letters | Most travel situations; join a conversation on familiar topics unprepared | Connected text on familiar topics; letters describing experiences |
| B2 | Extended speech and lectures; most TV news and films in the standard variety | Articles on current problems; contemporary prose | Interact with native speakers without strain; argue a view | Clear, detailed text on many subjects; an essay or report |
| C1 | Extended speech without clear structure; TV and films without effort | Long, complex texts, noticing style; specialised articles | Express yourself fluently without searching for words | Well-structured text on complex subjects, in a chosen style |

## Rules

- `level` is the overall placement, `A0`, `A1`, `A2`, `B1`, `B2` or `C1`: the median of the four skills, rounded down. Lessons size their authored text and choose its language from it (LESSON-FORMAT.md). Each skill key defaults to it.
- `target_level` is above `level`, chosen from the goal and the hours. A CEFR step takes a few hundred hours of study for most learners and more for a language far from the native one (`docs/evidence.md` section 4); when the target does not fit the hours, say so at intake and offer a nearer target.
- `language_code` is a BCP 47 tag for the variety, such as `es-MX`, `pt-PT` or `ja`. Research picks resources in that variety.
- `exam` names an exam the goal points at, such as `DELE B1` or `JLPT N4`, or `none`. When set, the exam's official specification and free sample papers become structure sources, and the capstone is a timed mock built from a free official sample.
- `research_model` is `inherit` or a model name the harness accepts for a subagent; research passes run on it where the harness allows a choice.
- The Goal is in the learner's words and concrete enough to become the capstone. "Learn Spanish" is not a goal; "an evening with the family without switching to English" is.
- Focus orders the skills; the syllabus gives more task hours to the first.
- Notes holds the variety, preferences, and the answer to any language-specific fork asked at intake.
