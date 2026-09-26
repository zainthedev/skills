---
status: accepted
---
# Markdown is the source of truth; the site is derived by a bundled converter

Every lesson, project, checkpoint and the syllabus is Markdown. The site is produced from it by a zero-dependency TypeScript converter that runs natively on Node 24 or Bun, with no build step and no package to install or publish. Format therefore costs no tokens, and the token estimate is keyed on depth and level only. This is the opposite of `teach`, which hand-crafts one HTML file per lesson.

## Considered options

- A Markdown library via npx. Rejected: plugin directories are read-only when installed, so a clean run would need a published npm package.
- Python or pandoc. Rejected: not guaranteed on a teammate's machine, while Node is for this audience.

## Consequences

- The converter supports only the Markdown subset dojo generates, and the lint enforces that subset.
- Node 24 or Bun is a documented requirement for the scripts only. Nothing else needs a runtime.
