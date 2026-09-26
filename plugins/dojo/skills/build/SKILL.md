---
name: build
description: Render your dojo workspace to a browsable local site with a done button, and serve it.
argument-hint: "[output directory]"
disable-model-invocation: true
---

Render the **site** and serve it. Find the workspace, the directory holding `profile.md` here or above, then:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/build-site.ts <workspace> [--out <dir>]
node ${CLAUDE_PLUGIN_ROOT}/scripts/serve.ts <workspace>
```

Run the server in the background. It prints its URL, or the URL of one already running. Give the learner the URL, say that the done button updates `syllabus.md` through the server, and that the files under `site/` also open directly as a static site, without the button.

If `node` is missing or older than 24 and `bun` is absent, stop and point at the README's requirement.

Done when the URL is on screen and `curl` of it returns the index page.
