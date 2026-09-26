// Shared constants for the dojo scripts.

export const DOJO_VERSION = "0.1.0";

// Placeholder until the marketplace repository has a settled public URL.
export const REPO_URL = "https://github.com/zainthedev/skills";

export const EVIDENCE_URL = REPO_URL + "/blob/main/plugins/dojo/docs/evidence.md";

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

export const ITEM_TYPES = ["lesson", "project", "completion-project", "capstone", "checkpoint"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const STATUSES = ["planned", "generated", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const PROJECT_KINDS = ["completion", "independent", "capstone"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

// Authored word budget for Introduction + Lesson overview + Core idea, by level.
export const WORD_BUDGET: Record<Level, number> = {
  beginner: 800,
  intermediate: 400,
  advanced: 200,
};

// Fixed lines the lesson format requires verbatim.
export const BEFORE_YOU_START_LINE =
  "Answer these from what you already know. Check them in the sidecar after the assignment.";
export const RETRIEVAL_PRACTICE_LINE =
  "Attempt each from memory, then move on. These return at checkpoints.";

// The fixed Rules block every project carries verbatim.
export const PROJECT_RULES_LINES = [
  "- Reconstruct, never copy. If you paste a solution you found, you have skipped the part that changes you.",
  "- Do not look at other people's finished solutions until yours works. Compare afterwards.",
  "- Search engines and official docs are open book. AI is not: `/dojo-coach` will ask you questions and point you at resources, and will not write this for you.",
];

export const SYLLABUS_COLUMNS = ["ID", "Type", "Title", "Hours", "Status", "Done"];
export const LEDGER_COLUMNS = ["Resource", "Type", "Score", "Endorsements", "Freshness", "Version", "Used in"];
export const LEDGER_TYPES = ["docs", "guide", "course", "book", "video", "interactive", "article", "reference"];

export const ID_PATTERN = /^[LPC]\d{2}$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// The quiz log a new workspace starts with; quiz-log.ts appends one row per session.
export const QUIZ_LOG_HEADER = "# Quiz log\n\n| Date | Scope | Predicted | Actual | Notes |\n|------|-------|-----------|--------|-------|\n";
