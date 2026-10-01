# Context Map

## Contexts

- [Dojo](./plugins/dojo/CONTEXT.md): generates Odin-Project-style curricula that a learner works through mostly without AI
- [Mentor](./plugins/mentor/CONTEXT.md): a senior's code review and a coach for any project, both making a junior developer find each fix
- [Lingo](./plugins/lingo/CONTEXT.md): dojo's model for learning a human language, with a conversation partner and writing reviews that make the learner repair their own errors

## Relationships

- Mentor's coach and reviewer and dojo's coach share one guard, the ladder and micro-actions, and the style word lists, as byte-identical copies in each plugin.
- Inside a dojo workspace the reviewer follows dojo's rule, never giving an answer, and writes its reviews to the workspace's `reviews/`, which dojo's site lists.
- Lingo carries byte-identical copies of dojo's format-free scripts (markdown, frontmatter, style lists, scout, measure and others), and the same guard, which also lets lingo's talk and review sessions write their own records.
- Lingo shares dojo's vocabulary where the concept is the same and defines its own where a language course differs: tasks for projects, CEFR placement for levels, talk and writing reviews.
- No plugin needs another installed.
