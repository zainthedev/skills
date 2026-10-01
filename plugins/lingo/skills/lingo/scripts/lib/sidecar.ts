// The sidecar beside a lesson: numbered answers to its prediction questions
// and retrieval prompts. Read by lint (counts) and by the site builder
// (reveal controls).

import { existsSync, readFileSync } from "node:fs";
import { asString, type Frontmatter } from "./frontmatter.ts";
import { findSection, itemMarkdown, listItems, splitDoc, type ListItem } from "./sections.ts";

export interface Sidecar {
  data: Frontmatter;
  id: string;
  title: string | null;
  prediction: ListItem[];
  retrieval: ListItem[];
}

export function parseSidecar(text: string): Sidecar {
  const doc = splitDoc(text);
  const before = findSection(doc, "Before you start");
  const retrieval = findSection(doc, "Retrieval practice");
  return {
    data: doc.data,
    id: asString(doc.data.id),
    title: doc.title,
    prediction: before ? listItems(before).filter((it) => it.ordered) : [],
    retrieval: retrieval ? listItems(retrieval).filter((it) => it.ordered) : [],
  };
}

// Null when the file does not exist.
export function readSidecar(path: string): Sidecar | null {
  if (!existsSync(path)) return null;
  return parseSidecar(readFileSync(path, "utf8"));
}

// The Markdown of answer number n (1-based) in the given list, or null.
export function answerMarkdown(items: ListItem[], n: number): string | null {
  const item = items[n - 1];
  return item ? itemMarkdown(item) : null;
}
