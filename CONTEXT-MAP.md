# Context Map

## Contexts

- [Dojo](./plugins/dojo/CONTEXT.md): generates Odin-Project-style curricula that a learner works through mostly without AI
- [Mentor](./plugins/mentor/CONTEXT.md): a senior's code review that makes a junior developer find each fix

## Relationships

- Mentor's reviewer and dojo's coach share one guard, the ladder and micro-actions, and the style word lists, as byte-identical copies in each plugin.
- Inside a dojo workspace the reviewer follows dojo's rule, never giving an answer, and writes its reviews to the workspace's `reviews/`, which dojo's site lists.
- Neither plugin needs the other installed.
