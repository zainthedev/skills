# skills

Zain Hill's agent skills. Each folder under `plugins/` bundles the skills that belong together, and the repo is also a Claude Code marketplace, so you install a bundle on Claude Code or pick individual skills on any other agent. Nothing installs unless you ask for it.

## Install

On Claude Code, use the plugin: it carries hooks that skills.sh cannot install. On every other agent, use skills.sh. Using both for different agents is fine, but do not point skills.sh at Claude Code as well, or every skill shows up twice.

**Claude Code**: add the marketplace once, then install only the plugins you want.

```bash
claude plugin marketplace add zainthedev/skills
claude plugin install dojo@zainhill
claude plugin install mentor@zainhill
```

**Codex, Cursor, Copilot and other agents**: [skills.sh](https://skills.sh) copies the skill folders you choose into your project, for the agents you choose.

```bash
npx skills@latest add zainthedev/skills
```

Add `--skill <name>` to skip the picker, or `--list` to see what is here.

## Plugins

| Plugin | Skills | What it is |
|--------|--------|------------|
| [dojo](plugins/dojo) | `dojo`, `dojo-plan`, `dojo-next`, `dojo-quiz`, `dojo-coach`, `dojo-build` | Odin-Project-style learning courses for technical topics: curated free resources, projects, retrieval practice, and a coach that never gives the answer |
| [mentor](plugins/mentor) | `mentor-review` | A senior's code review of a branch, pull request or files that flags bugs, hand-rolled code and antipatterns, then makes you find each fix |

A skill is one folder with a `SKILL.md`, in the Agent Skills format every listed agent reads. A plugin is the folder that groups related skills for a single Claude Code install. Skills that share scripts name one of their number as the root, so take that one along when you pick.

Each plugin's README opens with a Quick start.

## Maintaining

`scripts/link-skills.sh` symlinks every skill in the repo into `~/.claude/skills` and `~/.agents/skills`, so a `git pull` updates them. It is for working on the skills, not an installer: it links skills only, so plugin hooks do not come with it, and with the plugin also installed Claude Code lists every skill twice.

Each plugin keeps its own vocabulary in a `CONTEXT.md` and its decisions in `docs/adr/`; dojo also has its design in `docs/spec.md`. A plugin installs alone, so a file two plugins need is copied into both, and a test in the plugin that owns the copy fails when a pair drifts. The map of contexts is [CONTEXT-MAP.md](CONTEXT-MAP.md).

MIT, see [LICENSE](LICENSE).
