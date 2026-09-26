---
name: dojo-build
description: Start your dojo course's local site again, with its done button, for example after a restart. /dojo-plan starts it the first time.
argument-hint: "[output directory]"
disable-model-invocation: true
allowed-tools: Bash(node *), Bash(bun *), Bash(curl *)
---

Render the **site** and serve it. Call the Skill tool with "dojo": it gives you the dojo root that the commands below run from. Find the workspace, the directory holding `profile.md` here or above, then:

```bash
node <dojo root>/scripts/serve.ts <workspace> --detach [--site <dir>]
```

It rebuilds the site, starts the server in its own process group so it outlives this session, and prints its URL, or the URL of the server already running for this workspace. Give the learner the URL, say that the done button updates `syllabus.md` through the server and that the site keeps running after this session closes, and that the files under `site/` also open directly as a static site, without the button. `serve.ts <workspace> --stop` stops it.

If `node` is missing or older than 24 and `bun` is absent, stop and point at the README's requirement.

Done when the URL is on screen and `curl` of it returns the index page.
