// Stack Overflow through the Stack Exchange API: a relevance-sorted search per keyword (vote
// sort surfaces famous unrelated questions), then the top answers of the questions found, in one
// batched call. Links in answers are stackexchange mentions ranked by answer score.
// Unauthenticated quota is 300 requests a day, so at most four requests per run.

import { GENERIC_RETRY, linkNeedles } from './context.ts';
import type { ScoutContext } from './context.ts';
import { parseSeAnswers, parseSeQuestions } from './parse-se.ts';
import type { SeQuestion } from './parse-se.ts';
import { excerptAround } from './text.ts';

const MAX_KEYWORDS = 3;
const MAX_QUESTIONS = 20;
const QUOTA_FLOOR = 20;

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'to', 'for', 'with', 'from', 'learn', 'learning', 'basics', 'basic', 'intro', 'introduction',
  'fundamentals', 'beginner', 'beginners', 'advanced', 'programming', 'development', 'dev', 'using', 'modern', 'course', 'tutorial',
]);

/** The topic's content words, lowercased, without punctuation such as the ".js" in Node.js. */
export function topicWords(topic: string): string[] {
  const words = topic
    .toLowerCase()
    .replace(/\.js\b/g, '')
    .replace(/[^a-z0-9+#\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return [...new Set(words)];
}

/** A Stack Overflow tag guess: only when the topic reduces to a single word. */
export function topicTag(topic: string): string | null {
  const words = topicWords(topic);
  return words.length === 1 ? words[0] : null;
}

export function seSearchUrl(keyword: string, tag: string | null): string {
  const params = new URLSearchParams({ site: 'stackoverflow', order: 'desc', sort: 'relevance', q: keyword, filter: 'withbody', pagesize: '10' });
  if (tag) params.set('tagged', tag);
  return `https://api.stackexchange.com/2.3/search/advanced?${params}`;
}

export function seAnswersUrl(questionIds: number[]): string {
  const params = new URLSearchParams({ site: 'stackoverflow', order: 'desc', sort: 'votes', filter: 'withbody', pagesize: '50' });
  return `https://api.stackexchange.com/2.3/questions/${questionIds.join(';')}/answers?${params}`;
}

export async function scoutStackExchange(ctx: ScoutContext, keywords: string[], topic: string): Promise<void> {
  const tag = topicTag(topic);
  const questions = new Map<number, SeQuestion>();
  for (const keyword of keywords.slice(0, MAX_KEYWORDS)) {
    const { res, json } = await ctx.http.json({ kind: 'stackexchange', url: seSearchUrl(keyword, tag), limiter: ctx.limiters.se, retry: GENERIC_RETRY, deadline: ctx.discoveryDeadline });
    if (res.skipped) return;
    const parsed = parseSeQuestions(json);
    if (!res.ok || parsed.error) {
      ctx.log(`[scout] stackexchange "${keyword}": ${parsed.error ?? res.error}`);
      continue;
    }
    for (const q of parsed.items) questions.set(q.id, q);
    ctx.log(`[scout] stackexchange "${keyword}"${tag ? ` [${tag}]` : ''}: ${parsed.items.length} questions, quota ${parsed.quotaRemaining ?? '?'}`);
    if (parsed.quotaRemaining !== null && parsed.quotaRemaining < QUOTA_FLOOR) {
      ctx.log('[scout] stackexchange: quota nearly spent, stopping');
      return;
    }
  }
  // Relevance order from the API, not a re-sort by score: vote counts surface famous
  // questions on other topics. A question also has to name the topic in its title.
  const words = topicWords(topic);
  const chosen = [...questions.values()].filter((q) => words.length === 0 || words.some((w) => q.title.toLowerCase().includes(w))).slice(0, MAX_QUESTIONS);
  ctx.log(`[scout] stackexchange: ${chosen.length} of ${questions.size} questions name the topic in their title`);
  if (chosen.length === 0) return;

  const { res, json } = await ctx.http.json({ kind: 'stackexchange', url: seAnswersUrl(chosen.map((q) => q.id)), limiter: ctx.limiters.se, retry: GENERIC_RETRY, deadline: ctx.discoveryDeadline });
  if (res.skipped) return;
  const answers = parseSeAnswers(json);
  if (!res.ok || answers.error) {
    ctx.log(`[scout] stackexchange answers: ${answers.error ?? res.error}`);
    return;
  }
  let links = 0;
  for (const a of answers.items) {
    const q = questions.get(a.questionId);
    if (!q || a.links.length === 0) continue;
    for (const link of a.links) {
      const draft = ctx.index.add(
        link.url,
        { source: 'stackexchange', thread_url: q.link, date: a.date, score: a.score, rank: a.rank, excerpt: excerptAround(a.text, linkNeedles(link)), author: a.owner ?? null },
        { key: `stackexchange:${a.id}`, title: link.text, titlePriority: 1 },
      );
      if (draft) links++;
    }
  }
  ctx.log(`[scout] stackexchange: ${answers.items.length} answers read, ${links} resource links`);
}
