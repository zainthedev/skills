---
status: accepted
---
# Skills are self-contained and harness-neutral; the Claude Code plugin is one channel

Every dojo skill is a folder in the Agent Skills format that any supporting harness can load: Claude Code, Codex, Cursor, Copilot, Gemini CLI and the rest. The Claude Code plugin under `plugins/dojo` is one way to install the same folders; skills.sh is the other, and it copies skill folders only. So nothing a skill needs may live outside a skill folder. The scripts, the templates and the token table moved into the `dojo` skill, which the five command skills call first; it names its own directory as the **dojo root** and every command runs scripts from there by absolute path. The command skills are named `dojo-plan`, `dojo-next`, `dojo-quiz`, `dojo-coach` and `dojo-build` because outside a plugin there is no namespace, and a bare `plan` or `next` would collide or say nothing. Harness-specific mechanisms stay, but each has a stated fallback: the coach's tool guard is a Claude Code hook and the coach holds the rule by instruction elsewhere; the measure script reads Claude Code transcripts and says so when there are none; research passes go to a subagent where the harness has one and to the main session otherwise. Skill text names no harness tool except through Matt Pocock's convention, "Call the Skill tool with X", and no `${CLAUDE_*}` placeholder except the one the `dojo` skill shows with an instruction for harnesses that leave it literal.

## Considered options

- **One `dojo` skill with the verbs as arguments.** Simplest naming everywhere and fully self-contained. Rejected because the coach's hook registers on invocation, so a single skill would make every dojo invocation read-only, and a separate Claude-only coach skill would be needed anyway.
- **Sibling skills reaching the scripts through `../dojo/scripts`.** Rejected because Pocock's convention forbids cross-folder links, and because a relative path is only meaningful once the harness has said where the skill lives, at which point the `dojo` skill can say so itself.
- **Skills at the repo root as one plugin**, Pocock's layout. Rejected because the repo holds more than one plugin, teammates should be able to take one without the rest, and skills.sh finds SKILL.md files up to five directories deep, so the nested layout costs nothing.

## Consequences

- A teammate on Claude Code installs a plugin; on any other harness they pick skills, and a skill that depends on `dojo` says so in its README.
- Claude Code users type `/dojo-plan`, or the namespaced `/dojo:dojo-plan`; Codex users type `$dojo-plan`.
- Tests moved out of the skill to `plugins/dojo/tests/` so an install carries runtime code only.
- The coach guard command searches the plugin root, the project's `.claude/skills` and the home `.claude/skills` for its script, and denies the tool when it finds none, so a broken install fails closed.
- `docs/tokens.md` became `skills/dojo/TOKENS.md`, so the commands can quote it from the dojo root.
