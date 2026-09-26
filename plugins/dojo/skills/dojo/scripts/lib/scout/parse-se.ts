// Parsers for the Stack Exchange API: search results (questions) and answers, both requested
// with filter=withbody so links can be read out of the HTML bodies.

import { extractLinksFromHtml, htmlToText, toDay } from './text.ts';
import type { ExtractedLink } from './types.ts';

export interface SeQuestion {
  id: number;
  title: string;
  link: string;
  score: number;
  date: string | null;
  tags: string[];
  answer_count: number;
  text: string;
}

export interface SeAnswer {
  id: number;
  questionId: number;
  score: number;
  accepted: boolean;
  /** The answerer's display name or id, for the self-promotion check. */
  owner: string | null;
  date: string | null;
  text: string;
  links: ExtractedLink[];
  /** 1-based rank by score among the answers of the same question in this response. */
  rank: number;
}

export interface SeEnvelope<T> {
  items: T[];
  quotaRemaining: number | null;
  error: string | null;
}

function envelope(json: unknown): { rows: Record<string, unknown>[]; quota: number | null; error: string | null } {
  if (!json || typeof json !== 'object') return { rows: [], quota: null, error: 'not an object' };
  const obj = json as Record<string, unknown>;
  const quota = typeof obj.quota_remaining === 'number' ? obj.quota_remaining : null;
  if (typeof obj.error_message === 'string') return { rows: [], quota, error: `${obj.error_name ?? obj.error_id ?? 'error'}: ${obj.error_message}` };
  const rows = Array.isArray(obj.items) ? (obj.items as Record<string, unknown>[]) : [];
  return { rows, quota, error: null };
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function parseSeQuestions(json: unknown): SeEnvelope<SeQuestion> {
  const { rows, quota, error } = envelope(json);
  const items: SeQuestion[] = [];
  for (const row of rows) {
    if (typeof row.question_id !== 'number') continue;
    items.push({
      id: row.question_id,
      title: htmlToText(String(row.title ?? '')),
      link: String(row.link ?? ''),
      score: num(row.score),
      date: toDay(typeof row.creation_date === 'number' ? row.creation_date : null),
      tags: Array.isArray(row.tags) ? (row.tags as unknown[]).map(String) : [],
      answer_count: num(row.answer_count),
      text: htmlToText(String(row.body ?? '')),
    });
  }
  return { items, quotaRemaining: quota, error };
}

export function parseSeAnswers(json: unknown): SeEnvelope<SeAnswer> {
  const { rows, quota, error } = envelope(json);
  const items: SeAnswer[] = [];
  for (const row of rows) {
    if (typeof row.answer_id !== 'number' || typeof row.question_id !== 'number') continue;
    const body = String(row.body ?? '');
    items.push({
      id: row.answer_id,
      questionId: row.question_id,
      score: num(row.score),
      accepted: row.is_accepted === true,
      owner: (() => {
        const owner = row.owner && typeof row.owner === 'object' ? (row.owner as Record<string, unknown>) : null;
        const name = owner?.display_name ?? owner?.user_id;
        return name === undefined || name === null ? null : String(name);
      })(),
      date: toDay(typeof row.creation_date === 'number' ? row.creation_date : null),
      text: htmlToText(body),
      links: extractLinksFromHtml(body),
      rank: 0,
    });
  }
  const byQuestion = new Map<number, SeAnswer[]>();
  for (const a of items) {
    const list = byQuestion.get(a.questionId) ?? [];
    list.push(a);
    byQuestion.set(a.questionId, list);
  }
  for (const list of byQuestion.values()) {
    list.sort((a, b) => b.score - a.score || Number(b.accepted) - Number(a.accepted) || a.id - b.id);
    list.forEach((a, i) => {
      a.rank = i + 1;
    });
  }
  return { items, quotaRemaining: quota, error };
}
