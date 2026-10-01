// Shared constants for the lingo scripts.

export const LINGO_VERSION = "0.1.0";

export const REPO_URL = "https://github.com/zainthedev/skills";

export const EVIDENCE_URL = REPO_URL + "/blob/main/plugins/lingo/docs/evidence.md";

// The learner's placement on the CEFR scale at intake. A0 is no prior study.
export const LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1"] as const;
export type Level = (typeof LEVELS)[number];

// What a course can aim for: always above the placement.
export const TARGET_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

// Every CEFR band, in order, for the ledger's Level column.
export const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

// Placements that start each section with a guided task before the independent one.
export const GUIDED_LEVELS: readonly string[] = ["A0", "A1"];

export const ITEM_TYPES = ["lesson", "guided-task", "task", "capstone", "checkpoint"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const STATUSES = ["planned", "generated", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const TASK_KINDS = ["guided", "independent", "capstone"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

// The four skills; the profile places each one, and a task names the ones it exercises.
export const LANGUAGE_SKILLS = ["listening", "reading", "speaking", "writing"] as const;
export type LanguageSkill = (typeof LANGUAGE_SKILLS)[number];

// Which language each authored part of a lesson or task is written in, by the
// overall placement: the learner's native language at first, the target
// language from B2. At B1 the introduction and core idea stay native.
export type AuthoredPart = "introduction" | "overview" | "core" | "assignment" | "retrieval" | "sidecar" | "task";
export function authoredLanguage(level: string, part: AuthoredPart): "native" | "target" {
  if (level === "B2" || level === "C1") return "target";
  if (level === "B1") return part === "introduction" || part === "core" ? "native" : "target";
  return "native";
}

// Labels a retrieval prompt opens with. Each lesson has at least one Explain and one Say.
export const PROMPT_LABELS = ["Explain", "Say", "Recall"] as const;

// Authored word budget for Introduction + Lesson overview + Core idea, by
// placement. Explicit explanation helps most at the start, and input carries
// more of the load as the learner climbs.
export const WORD_BUDGET: Record<Level, number> = {
  A0: 800,
  A1: 700,
  A2: 600,
  B1: 500,
  B2: 400,
  C1: 300,
};

// Rows in a lesson's Words table.
export const WORDS_MIN = 8;
export const WORDS_MAX = 20;
export const WORDS_COLUMNS = ["Word", "Reading", "Meaning", "Example"];

// Fixed lines the lesson format requires verbatim.
export const BEFORE_YOU_START_LINE =
  "Answer these from what you already know. Check them in the sidecar after the assignment.";
export const RETRIEVAL_PRACTICE_LINE =
  "Attempt each from memory, out loud or on paper, then move on. These return at checkpoints.";

// The fixed Rules block every task carries verbatim.
export const TASK_RULES_LINES = [
  "- Produce it yourself. A sentence a translator or a model wrote for you is a sentence you did not practise.",
  "- Dictionaries, conjugation tables and grammar references are open book. Machine translation and AI writing are not: `/lingo-coach` asks you questions and points at resources, `/lingo-talk` practises with you, and neither writes this for you.",
  "- Show the result to a person when you can, such as a tutor or an exchange partner, and note what they corrected.",
];

// Codes a writing review marks an error with. The review names the code and a
// hint; it never gives the corrected form.
export const ERROR_CODES = [
  "agreement",
  "verb-form",
  "tense",
  "mood",
  "word-order",
  "word-choice",
  "article",
  "preposition",
  "spelling",
  "accent",
  "missing-word",
  "extra-word",
  "register",
  "punctuation",
] as const;
export const REVIEW_MAX_MARKS = 8;
export const REVIEW_COLUMNS = ["#", "Where", "Code", "Hint", "Status"];
export const REVIEW_STATUSES = ["open", "fixed", "wontfix"];

// A talk record's corrections table, and how many it may hold.
export const TALK_COLUMNS = ["You wrote", "Better", "Why", "Lesson"];
export const TALK_MAX_CORRECTIONS = 5;
export const MISTAKES_COLUMNS = ["#", "Date", "Lesson", "You wrote", "Better", "Why", "Cleared"];

export const SYLLABUS_COLUMNS = ["ID", "Type", "Title", "Hours", "Status", "Done"];
export const LEDGER_COLUMNS = ["Resource", "Type", "Score", "Endorsements", "Freshness", "Level", "Used in"];
export const LEDGER_TYPES = [
  "course",
  "guide",
  "book",
  "reader",
  "podcast",
  "video",
  "channel",
  "interactive",
  "reference",
  "dictionary",
  "article",
  "deck",
  "community",
];

export const ID_PATTERN = /^[LTC]\d{2}$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// The hidden directory a workspace keeps machine files in.
export const DATA_DIR = ".lingo";

// The logs a new workspace starts with; quiz-log.ts and talk-log.ts append one row per session.
export const QUIZ_LOG_HEADER = "# Quiz log\n\n| Date | Scope | Predicted | Actual | Notes |\n|------|-------|-----------|--------|-------|\n";
export const TALK_LOG_HEADER =
  "# Talk log\n\n| Date | Scope | Turns | Corrections | Focus next |\n|------|-------|-------|-------------|------------|\n";
export const MISTAKES_HEADER =
  "# Mistakes\n\nCorrections from `/lingo-talk`, recycled by `/lingo-quiz` until you get them right.\n\n| # | Date | Lesson | You wrote | Better | Why | Cleared |\n|---|------|--------|-----------|--------|-----|---------|\n";
