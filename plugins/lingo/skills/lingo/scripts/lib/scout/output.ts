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
  error?: string;
}

/** Worth keeping in the file: any objective signal, or more than one mention. */
export function isWorthKeeping(r: Resource): boolean {
  return r.objective_score > 0 || r.mentions.length >= 2;
}

export function assembleOutput(input: AssembleInput): ScoutOutput {
  const generated = new Date(input.nowMs).toISOString();
  const checked = generated.slice(0, 10);
  const all = sortResources(input.drafts.map((d) => finaliseResource(d, input.nowMs, checked)));
  const resources = all.filter(isWorthKeeping);
  const requests = { ok: 0, error: 0, skipped: 0 };
  for (const s of input.sources) requests[s.status]++;
  const out: ScoutOutput = {
    dojo_scout: '0.1.0',
    topic: input.topic,
    generated,
    subreddits: input.subreddits,
    keywords: input.keywords,
    budget: input.budget,
    requests,
    sources: input.sources.filter((s) => s.status !== 'ok'),
    threads: input.threads,
    resources,
    resources_dropped: all.length - resources.length,
    thin_evidence: isThinEvidence(all),
  };
  if (input.error) out.error = input.error;
  return out;
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
