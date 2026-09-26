---
status: accepted
---
# dojo is independent of Matt Pocock's `teach` skill

`teach` already ships a stateful learning workspace with the same learning-science vocabulary, so the obvious paths were to fork it or to reuse its file conventions. dojo does neither. It follows Matt Pocock's writing and packaging conventions but shares no files, formats or names with `teach`, because the two encode opposite models of where the AI stands, and a shared workspace format would tie each one's evolution to the other's.

## How they differ

| | `teach` | dojo |
|---|---|---|
| Who teaches | The agent; every lesson ends with "ask the agent" | Free primary resources; the agent orients, curates and coaches |
| Lesson form | Authored, hand-crafted HTML | Curated Markdown with a level-scaled soft landing; HTML derived |
| Plan | One lesson per invocation, chosen on the fly | Syllabus of sections, projects and checkpoints first; items on demand |
| Projects | Interactive in-lesson tasks | Odin-style projects without walkthroughs, plus a capstone from the goal |
| Prior knowledge | Inferred; no assessment step (an open request) | Placed at intake |
| Retention | Principles only; no review scheduling (an open request) | Retrieval prompts, checkpoints with calibration, on-demand quiz |
| Quizzes | Multiple choice; the correct answer reported always in slot A | Open-ended free recall with sidecar answers |
| Workspace location | Current directory; a known bug writes into the skill folder | Explicit directory with a marker file |
| Token cost | Unmeasured | Estimated up front from a measured token table, actual reported after |
| Topics | Any, including non-technical | Technical topics in v1 |

Reach for `teach` when you want an agent to teach you interactively, one session at a time. Reach for dojo when you want a course you work through yourself, with the agent kept at arm's length.
