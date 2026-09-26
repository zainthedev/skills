// Rubric tests for the scout-owned parts: each scoring part on its own, the sum, the ordering
// and the thin-evidence flag.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ResourceDraft } from '../skills/dojo/scripts/lib/scout/resources.ts';
import {
  MAX_OBJECTIVE,
  finaliseResource,
  isThinEvidence,
  monthsBetween,
  scoreBreadth,
  scoreCurated,
  scoreDepth,
  scoreFreshness,
  scoreIndependent,
  sortResources,
  uncheckedFreshness,
} from '../skills/dojo/scripts/lib/scout/score.ts';
import type { Freshness, Mention, Resource } from '../skills/dojo/scripts/lib/scout/types.ts';

const NOW = Date.parse('2026-09-25T00:00:00Z');

const mention = (source: Mention['source'], thread: string, rank: number | null = null, score: number | null = null): Mention => ({
  source,
  thread_url: thread,
  date: '2024-01-01',
  score,
  rank,
  excerpt: 'x',
});

const draft = (overrides: Partial<ResourceDraft> = {}): ResourceDraft => ({
  url: 'https://example.com/guide',
  domain: 'example.com',
  title: null,
  titlePriority: 0,
  mentions: [],
  keys: new Set(),
  hnItems24m: new Set(),
  curated: new Set(),
  freshness: null,
  ...overrides,
});

const fresh = (lastModified: string | null, method: Freshness['method'] = 'last-modified'): Freshness => ({ checked: '2026-09-25', last_modified: lastModified, method });

test('breadth: three points per distinct thread with a reply, full marks at five', () => {
  assert.equal(scoreBreadth([]), 0);
  assert.equal(scoreBreadth([mention('reddit-comment', 't1')]), 3);
  assert.equal(scoreBreadth([mention('reddit-comment', 't1'), mention('reddit-comment', 't1')]), 3, 'same thread counts once');
  assert.equal(scoreBreadth([mention('reddit-comment', 't1'), mention('hn-comment', 'h1'), mention('stackexchange', 's1')]), 9);
  assert.equal(scoreBreadth(['t1', 't2', 't3', 't4', 't5', 't6'].map((t) => mention('reddit-comment', t))), 15);
  assert.equal(scoreBreadth([mention('reddit-wiki', 'w'), mention('devto', 'd'), mention('hn-story', 'h'), mention('reddit-thread', 't')]), 0, 'pages, articles and posts are not replies');
});

test('depth: top reply 15, top three 10, any reply 5, nothing else 0', () => {
  assert.equal(scoreDepth([]), 0);
  assert.equal(scoreDepth([mention('reddit-thread', 't1', 1)]), 0, 'the post itself is not a reply');
  assert.equal(scoreDepth([mention('reddit-comment', 't1', 1, 9)]), 15);
  assert.equal(scoreDepth([mention('reddit-comment', 't1', 2, 3)]), 10);
  assert.equal(scoreDepth([mention('stackexchange', 's1', 3, 3)]), 10);
  assert.equal(scoreDepth([mention('reddit-comment', 't1', 7, 1)]), 5);
  assert.equal(scoreDepth([mention('hn-comment', 'h1', null)]), 5, 'a reply with an unknown rank still counts');
  assert.equal(scoreDepth([mention('reddit-comment', 't1', 7, 1), mention('reddit-comment', 't2', 1, 12)]), 15, 'the best thread decides');
});

test('curated: any wiki or large list inclusion is full marks', () => {
  assert.equal(scoreCurated([]), 0);
  assert.equal(scoreCurated(['r/learnjavascript wiki/index']), 10);
  assert.equal(scoreCurated(['github:sindresorhus/awesome-nodejs (66923 stars)', 'r/node sidebar']), 10);
});

test('freshness: 20 within twelve months, 14 within 24, 7 within 48, else 0; unknown is 0 and marked', () => {
  assert.equal(scoreFreshness(fresh('2026-09-11'), NOW), 20);
  assert.equal(scoreFreshness(fresh('2025-10-01', 'github'), NOW), 20);
  assert.equal(scoreFreshness(fresh('2025-03-16T00:00:00Z', 'youtube'), NOW), 14);
  assert.equal(scoreFreshness(fresh('2023-06-01'), NOW), 7);
  assert.equal(scoreFreshness(fresh('2021-04-01'), NOW), 0);
  assert.equal(scoreFreshness(fresh('2026-09-11', 'none'), NOW), 0, 'a date without a verified method scores nothing');
  assert.equal(scoreFreshness(fresh(null, 'last-modified'), NOW), 0);
  assert.equal(scoreFreshness(fresh('not a date'), NOW), 0);
  const unknown = uncheckedFreshness('2026-09-25', 'not checked: budget exhausted');
  assert.deepEqual(unknown, { checked: '2026-09-25', last_modified: null, method: 'none', note: 'not checked: budget exhausted' });
  assert.equal(scoreFreshness(unknown, NOW), 0);
  assert.ok(Math.abs((monthsBetween('2025-09-25', NOW) ?? 0) - 12) < 0.1);
  assert.equal(monthsBetween('garbage', NOW), null);
});

test('independent signal: steps on HN mentions in the last 24 months', () => {
  const table: [number, number][] = [
    [0, 0],
    [1, 2],
    [2, 4],
    [3, 6],
    [5, 6],
    [6, 8],
    [9, 8],
    [10, 10],
    [48, 10],
  ];
  for (const [mentions, expected] of table) assert.equal(scoreIndependent(mentions), expected, `${mentions} mentions`);
});

test('finalise: objective score sums the parts against a maximum of 70', () => {
  const d = draft({
    title: 'Express guide',
    mentions: [mention('reddit-comment', 't1', 1, 12), mention('reddit-comment', 't2', 2, 4), mention('reddit-wiki', 'w')],
    curated: new Set(['r/node wiki/index']),
    freshness: fresh('2026-09-11'),
    hnItems24m: new Set(['1', '2', '3']),
    stars: 12,
  });
  const r = finaliseResource(d, NOW, '2026-09-25');
  assert.equal(r.breadth, 6);
  assert.equal(r.depth, 15);
  assert.deepEqual(r.curated, ['r/node wiki/index']);
  assert.equal(r.hn_mentions_24m, 3);
  assert.equal(r.objective_score, 6 + 15 + 10 + 20 + 6);
  assert.equal(r.max_objective, 70);
  assert.equal(MAX_OBJECTIVE, 70);
  assert.equal(r.stars, 12);
  assert.equal('views' in r, false);
  assert.equal(r.title, 'Express guide');

  const bare = finaliseResource(draft({ mentions: [mention('devto', 'd')] }), NOW, '2026-09-25');
  assert.equal(bare.objective_score, 0);
  assert.equal(bare.freshness.method, 'none');
  assert.equal(bare.freshness.note, 'not checked');
  assert.equal(bare.freshness.checked, '2026-09-25');

  const full = finaliseResource(
    draft({
      mentions: ['t1', 't2', 't3', 't4', 't5'].map((t) => mention('reddit-comment', t, 1, 10)),
      curated: new Set(['r/node wiki/index']),
      freshness: fresh('2026-09-01', 'github'),
      hnItems24m: new Set(Array.from({ length: 12 }, (_, i) => String(i))),
    }),
    NOW,
    '2026-09-25',
  );
  assert.equal(full.objective_score, 70);
});

test('sorting: objective score, then breadth, then mention count, then url', () => {
  const make = (url: string, objective: number, breadth: number, mentions: number): Resource => ({
    url,
    domain: 'x',
    title: null,
    mentions: Array.from({ length: mentions }, () => mention('reddit-comment', 't')),
    breadth,
    depth: 0,
    curated: [],
    freshness: fresh(null, 'none'),
    hn_mentions_24m: 0,
    objective_score: objective,
    max_objective: 70,
  });
  const sorted = sortResources([make('https://c', 10, 3, 1), make('https://b', 30, 6, 2), make('https://a', 30, 6, 2), make('https://d', 30, 9, 1), make('https://e', 10, 3, 4)]);
  assert.deepEqual(
    sorted.map((r) => r.url),
    ['https://d', 'https://a', 'https://b', 'https://e', 'https://c'],
  );
});

test('thin evidence: fewer than five resources with two or more mentions', () => {
  const withMentions = (n: number): Resource => finaliseResource(draft({ url: `https://x/${n}`, mentions: Array.from({ length: n }, (_, i) => mention('devto', `d${i}`)) }), NOW, '2026-09-25');
  assert.equal(isThinEvidence([]), true);
  assert.equal(isThinEvidence([2, 2, 2, 2, 1, 1, 1].map(withMentions)), true);
  assert.equal(isThinEvidence([2, 2, 2, 2, 3].map(withMentions)), false);
});
