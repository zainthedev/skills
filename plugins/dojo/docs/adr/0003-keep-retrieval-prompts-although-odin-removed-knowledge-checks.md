---
status: accepted
---
# Keep retrieval prompts although The Odin Project removed knowledge checks

On 22 and 23 September 2026 The Odin Project removed the Knowledge check section from its template and from all live lessons (curriculum pull requests 31411 and 31412, issue 31390), citing an accessibility problem, learners taking the questions as a bar to clear before moving on, and overlap with the lesson overview. Retrieval practice has the strongest evidence in the field (testing effect g about 0.5 to 0.6, free recall over recognition), so dojo keeps it as a "Retrieval practice" section that answers each objection: it opens with "attempt each from memory, then move on; these return at checkpoints", every prompt links to the section or resource that answers it, answers live in a sidecar and are revealed only after an attempt, and the site's reveal control is keyboard and screen-reader accessible.

## Considered options

- Drop them and rely on projects and quiz only. Rejected: the first retrieval attempt right after reading is the cheapest one to get.
- Keep them only in the sidecar for quiz. Rejected for the same reason.

## Consequences

- Prompts are open-ended, never multiple choice, which also avoids the answer-position bug reported against `teach`.
- Prompts target concepts and "why", never API details. See ADR 0004.
