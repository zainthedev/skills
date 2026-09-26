// Assembles and formats .dojo/scout.json. The file is compact but line friendly: one source,
// thread or resource per line, so a reader can skim it and a model can read it in pages.

import type { ResourceDraft } from './resources.ts';
import { finaliseResource, isThinEvidence, sortResources } from './score.ts';
import type { Budget, ScoutOutput, SourceRecord, Thread } from './types.ts';

export interface AssembleInput {
  topic: string;
  subreddits: string[];
  keywords: string[];
  budget: Budget;
  sources: SourceRecord[];
  threads: Thread[];
  drafts: ResourceDraft[];
  nowMs: number;
}

export function assembleOutput(input: AssembleInput): ScoutOutput {
  const generated = new Date(input.nowMs).toISOString();
  const checked = generated.slice(0, 10);
  const resources = sortResources(input.drafts.map((d) => finaliseResource(d, input.nowMs, checked)));
  return {
    dojo_scout: '0.1.0',
    topic: input.topic,
    generated,
    subreddits: input.subreddits,
    keywords: input.keywords,
    budget: input.budget,
    sources: input.sources,
    threads: input.threads,
    resources,
    thin_evidence: isThinEvidence(resources),
  };
}

function lineArray(items: unknown[]): string {
  if (items.length === 0) return '[]';
  return `[\n${items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')}\n  ]`;
}

/** JSON text with the three big arrays laid out one element per line. Parses back to the same object. */
export function formatOutput(out: ScoutOutput): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(out)) {
    if (key === 'sources' || key === 'threads' || key === 'resources') {
      parts.push(`  ${JSON.stringify(key)}: ${lineArray(value as unknown[])}`);
    } else {
      parts.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
    }
  }
  return `{\n${parts.join(',\n')}\n}\n`;
}
