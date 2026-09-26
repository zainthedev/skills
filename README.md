# skills

Zain Hill's agent skills. Each folder under `plugins/` bundles the skills that belong together, and the repo is also a Claude Code marketplace, so you install a bundle on Claude Code or pick individual skills on any other agent. Nothing installs unless you ask for it.

## Install

Pick one route; installing both leaves you with every skill twice.

**Claude Code**: add the marketplace once, then install only the plugins you want.

```bash
claude plugin marketplace add zainthedev/skills
claude plugin install dojo@zainhill
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

A skill is one folder with a `SKILL.md`, in the Agent Skills format every listed agent reads. A plugin is the folder that groups related skills for a single Claude Code install. Skills that share scripts name one of their number as the root, so take that one along when you pick.

Each plugin's README opens with a Quick start.

## Maintaining

`scripts/link-skills.sh` symlinks every skill in the repo into `~/.claude/skills` and `~/.agents/skills`, so a `git pull` updates them. It is for working on the skills, not an installer.

Each plugin keeps its own vocabulary in a `CONTEXT.md`, its decisions in `docs/adr/`, and its design in `docs/spec.md`. The map of contexts is [CONTEXT-MAP.md](CONTEXT-MAP.md).

MIT, see [LICENSE](LICENSE).
