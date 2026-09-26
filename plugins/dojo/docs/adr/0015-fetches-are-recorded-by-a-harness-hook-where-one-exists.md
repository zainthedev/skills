---
status: accepted
---
# Fetches are recorded by a harness hook where one exists

Lint's rule that every citation was fetched before it was used checked `.dojo/fetched.jsonl`, a file the research pass wrote itself. That showed the pass was consistent, not that the fetch happened. The Claude Code plugin now carries a PostToolUse hook on WebFetch (`hooks/hooks.json`) that runs `scripts/fetch-log.ts`, which appends the URL to the workspace's log when the hook's working directory is inside one, and otherwise, once `fetch-log.ts --arm` has marked the directory, to a temp file that `fetch-log.ts --collect <workspace>` merges before lint runs. Lines with `"item": "hook"` are evidence the harness produced. The pass still appends its own line everywhere, because skills.sh installs carry no plugin hooks and other harnesses have none; a duplicate is harmless, since lint reads the file as a set. This is the same pattern as the coach guard (ADR 0002, ADR 0011): a harness mechanism where one exists, the instruction as the fallback.

## Considered options

- **A hook in the skill's frontmatter**, like the coach guard. Tried first and measured on 2026-09-26: a frontmatter hook fires for the main session's tool calls and not for a subagent's, and the research pass runs in a subagent, so the log stayed empty. Settings-level hooks, which plugin hooks are, fired in both, which matches the hooks documentation: hooks from settings files, managed policy and plugins run inside subagents, and skill frontmatter hooks are not on that list (https://code.claude.com/docs/en/hooks, "Hooks in subagents"). The coach guard stays in frontmatter because the coach runs in the main session and denies the agent tool.
- **Keep the pass's own log only.** Rejected: bookkeeping the pass does for itself cannot be evidence about the pass.
- **Have lint fetch the cited URLs itself.** Rejected: it doubles the network cost of every lint run and proves reachability, not that the pass read the page.

## Consequences

- The hook never blocks: any failure exits 0 with a note on stderr, since a lost record is a lint error later and a blocked fetch is a worse lesson now.
- A plugin hook fires in every session where the plugin is enabled, so outside a workspace it writes nothing unless the directory was armed; `dojo-plan` arms it before the scout and `--collect` disarms it.
- Frontmatter hooks are main-session only. Any future guard that must cover a subagent goes in `hooks/hooks.json`.
