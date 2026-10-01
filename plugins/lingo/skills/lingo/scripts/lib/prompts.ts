// A retrieval prompt is one line: a label, then one link whose text is the
// prompt and whose target is the place that answers it.
//   Say: [Tell a friend what you ate yesterday.](#core-idea)
// Lint, the checkpoint writer and the quiz all read prompts through here.

import { PROMPT_LABELS } from "./constants.ts";

export interface Prompt {
  label: string;
  text: string;
  target: string;
}

const PROMPT = /^([A-Z][a-z]+):\s+\[(.+)\]\(([^)\s]+)\)\s*$/;

export function parsePrompt(line: string): Prompt | null {
  const m = PROMPT.exec(line.trim());
  if (!m) return null;
  return { label: m[1], text: m[2], target: m[3] };
}

export function isPromptLabel(label: string): boolean {
  return (PROMPT_LABELS as readonly string[]).includes(label);
}

// "Say: <text>", the form a quiz or checkpoint shows.
export function promptLine(p: { label: string; text: string }): string {
  return `${p.label}: ${p.text}`;
}
