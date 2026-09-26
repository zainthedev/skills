---
status: accepted
---
# The plan starts the site, and the server outlives the session

The site is the learner's main way through a course: they read lessons there, reveal answers there and mark items done there. `dojo-plan` therefore builds the site and starts its server as its last step, instead of leaving that to a `/dojo-build` every learner would run anyway. The server starts with `serve.ts --detach`, in its own process group with its output in `.dojo/serve.log`, because a server started as an agent session's background job dies with that session, and every command ends by telling the learner to close the session. `dojo-next` already rebuilds the site whenever it exists, so from then on each new item appears there without being asked. `/dojo-build` becomes the way to start the server again, for example after a restart of the computer.

## Considered options

- **Build only, and point at `site/index.html`.** Rejected: the done button, the one place progress is recorded from the browser, needs the server, so the main interface would start half working.
- **Serve as a background job of the plan session.** Rejected: it works only while the learner keeps the plan session open, against the close-the-session rule every command ends with.

## Consequences

- A long-lived process now belongs to each course. A PID file alone cannot identify it once a restart has handed the number to another program, so `serve.ts` trusts a PID file only when the server at its URL answers `/api/status` with the same PID and workspace. Otherwise the file is stale: the URL is not reported, the process is never sent a signal, and the file is removed.
- `serve.ts <workspace> --stop` stops a course's server; nothing stops it on its own.
- Where a harness forbids long-lived processes or the port cannot be bound, the plan reports the failure, gives the path of the static site, and names `/dojo-build` for later.
