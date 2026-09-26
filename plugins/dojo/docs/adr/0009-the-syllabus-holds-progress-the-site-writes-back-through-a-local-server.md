---
status: accepted
---
# The syllabus holds progress; the site writes back through a local server

Progress lives inline in the syllabus as each item's status and completion date, edited only through one small mark-done script that `next`, the site's done button and manual edits all go through. A static page cannot write to disk, so `build` writes the static site and then starts a zero-dependency local server that serves it and accepts the done button's request. Opened directly as a file, the button explains that it needs the served version.

## Considered options

- A progress JSON file rendered into the syllabus. Rejected: two sources of truth, and the user's own words were "mark the syllabus file".
- The browser File System Access API. Rejected: Chromium only.
- A separate `serve` command. Rejected: one more verb for no gain, since `build` can serve when it is able to.
