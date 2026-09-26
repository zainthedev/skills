// Rate limiter and backoff tests for the scout's HTTP layer, against an injected clock and an
// injected fetch. No network and no real timers: the fake clock drives virtual time forward.
// The one live test runs only when SCOUT_LIVE=1 is set.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { Http, RateLimiter, USER_AGENT } from '../lib/http.ts';
import type { Clock, FetchLike } from '../lib/http.ts';
import { ARCTIC_RETRY, REDDIT_RETRY } from '../lib/scout/context.ts';
import { parseHnSearch } from '../lib/scout/parse-hn.ts';

class FakeClock implements Clock {
  t = 0;
  private timers: { at: number; resolve: () => void }[] = [];

  now(): number {
    return this.t;
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timers.push({ at: this.t + ms, resolve });
    });
  }

  /** Advances virtual time, earliest timer first, until the work settles. */
  async run<T>(work: Promise<T>): Promise<T> {
    let settled = false;
    const guarded = work.then(
      (value) => {
        settled = true;
        return value;
      },
      (err: unknown) => {
        settled = true;
        throw err;
      },
    );
    let idle = 0;
    while (!settled) {
      await new Promise((resolve) => setImmediate(resolve));
      if (settled) break;
      if (this.timers.length === 0) {
        if (++idle > 2000) throw new Error('fake clock: nothing is pending but the work never settled');
        continue;
      }
      idle = 0;
      this.timers.sort((a, b) => a.at - b.at);
      const next = this.timers.shift()!;
      this.t = Math.max(this.t, next.at);
      next.resolve();
    }
    return guarded;
  }
}

interface Scripted {
  status: number;
  body?: string | Uint8Array;
  headers?: Record<string, string>;
}

interface Call {
  url: string;
  at: number;
  init: RequestInit;
}

function harness(script: Scripted[] = []) {
  const clock = new FakeClock();
  const calls: Call[] = [];
  const queue = [...script];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, at: clock.now(), init: init ?? {} });
    const next = queue.shift() ?? { status: 200, body: 'ok' };
    return new Response(next.body ?? '', { status: next.status, headers: next.headers });
  };
  const logs: string[] = [];
  const http = new Http({ fetch: fetchImpl, clock, log: (line) => logs.push(line) });
  return { clock, calls, http, logs };
}

test('one limiter spaces sequential requests by its interval', async () => {
  const { clock, calls, http } = harness();
  const reddit = http.limiter('reddit', 30_000);
  await clock.run(
    (async () => {
      for (let i = 0; i < 4; i++) {
        const res = await http.request({ kind: 'reddit-search', url: `https://www.reddit.com/r/node/search.rss?q=${i}`, limiter: reddit });
        assert.equal(res.status, 200);
      }
    })(),
  );
  assert.deepEqual(
    calls.map((c) => c.at),
    [0, 30_000, 60_000, 90_000],
  );
  assert.equal(http.sources.length, 4);
  assert.ok(http.sources.every((s) => s.status === 'ok'));
});

test('concurrent requests on one limiter are serialised, other limiters run alongside', async () => {
  const { clock, calls, http } = harness();
  const reddit = http.limiter('reddit', 30_000);
  const arctic = http.limiter('arctic', 6_000);
  await clock.run(
    Promise.all([
      http.request({ kind: 'reddit-search', url: 'https://www.reddit.com/a.rss', limiter: reddit }),
      http.request({ kind: 'reddit-search', url: 'https://www.reddit.com/b.rss', limiter: reddit }),
      http.request({ kind: 'reddit-search', url: 'https://www.reddit.com/c.rss', limiter: reddit }),
      http.request({ kind: 'arctic-shift', url: 'https://arctic-shift.photon-reddit.com/1', limiter: arctic }),
      http.request({ kind: 'arctic-shift', url: 'https://arctic-shift.photon-reddit.com/2', limiter: arctic }),
    ]),
  );
  const at = (url: string): number => calls.find((c) => c.url === url)!.at;
  const redditTimes = ['a', 'b', 'c'].map((n) => at(`https://www.reddit.com/${n}.rss`)).sort((x, y) => x - y);
  assert.deepEqual(redditTimes, [0, 30_000, 60_000]);
  const arcticTimes = [at('https://arctic-shift.photon-reddit.com/1'), at('https://arctic-shift.photon-reddit.com/2')].sort((x, y) => x - y);
  assert.deepEqual(arcticTimes, [0, 6_000]);
});

test('a 429 backs off for 60 seconds on the reddit policy and then succeeds', async () => {
  const { clock, calls, http } = harness([{ status: 429 }, { status: 200, body: '<feed/>' }]);
  const reddit = http.limiter('reddit', 30_000);
  const res = await clock.run(http.request({ kind: 'reddit-search', url: 'https://www.reddit.com/r/node/search.rss', limiter: reddit, retry: REDDIT_RETRY }));
  assert.equal(res.ok, true);
  assert.equal(res.text, '<feed/>');
  assert.equal(calls.length, 2);
  assert.ok(calls[1].at - calls[0].at >= 60_000, `retry waited ${calls[1].at - calls[0].at}ms`);
  assert.equal(http.sources.length, 1);
  assert.equal(http.sources[0].status, 'ok');
  assert.ok(http.sources[0].note.startsWith('429, then 200'));
});

test('a backoff holds every pending request on the limiter', async () => {
  const { clock, calls, http } = harness([{ status: 429 }, { status: 200 }, { status: 200 }]);
  const reddit = http.limiter('reddit', 30_000);
  await clock.run(
    Promise.all([
      http.request({ kind: 'reddit-search', url: 'https://www.reddit.com/first.rss', limiter: reddit, retry: REDDIT_RETRY }),
      http.request({ kind: 'reddit-search', url: 'https://www.reddit.com/second.rss', limiter: reddit, retry: REDDIT_RETRY }),
    ]),
  );
  assert.equal(calls.length, 3);
  assert.equal(calls[0].at, 0);
  assert.ok(calls.slice(1).every((c) => c.at >= 60_000), 'nothing runs during the backoff');
  const times = calls.slice(1).map((c) => c.at).sort((a, b) => a - b);
  assert.ok(times[1] - times[0] >= 30_000, 'spacing still applies after the backoff');
});

test('at most three retries, then the 429 is reported as an error', async () => {
  const { clock, calls, http } = harness([{ status: 429 }, { status: 429 }, { status: 429 }, { status: 429 }, { status: 200 }]);
  const reddit = http.limiter('reddit', 30_000);
  const res = await clock.run(http.request({ kind: 'reddit-comments', url: 'https://www.reddit.com/r/node/comments/x/.rss', limiter: reddit, retry: REDDIT_RETRY }));
  assert.equal(calls.length, 4, 'one attempt plus three retries');
  assert.equal(res.ok, false);
  assert.equal(res.status, 429);
  assert.equal(res.error, 'HTTP 429');
  assert.equal(http.sources[0].status, 'error');
  assert.ok(http.sources[0].note.startsWith('429, 429, 429, then 429'));
});

test('the arctic policy retries a 422 once after a short pause', async () => {
  const { clock, calls, http } = harness([{ status: 422, body: '{"data":null,"error":"Timeout. Maybe slow down a bit"}' }, { status: 200, body: '{"data":[]}' }]);
  const arctic = http.limiter('arctic', 6_000);
  const { res, json } = await clock.run(http.json({ kind: 'arctic-shift', url: 'https://arctic-shift.photon-reddit.com/api/comments/search?link_id=x', limiter: arctic, retry: ARCTIC_RETRY }));
  assert.equal(res.ok, true);
  assert.deepEqual(json, { data: [] });
  assert.equal(calls.length, 2);
  assert.ok(calls[1].at - calls[0].at >= 12_000);
});

test('requests whose slot would start after the deadline are skipped without a fetch', async () => {
  const { clock, calls, http } = harness();
  const reddit = http.limiter('reddit', 30_000);
  const deadline = 10_000;
  const results = await clock.run(
    (async () => [
      await http.request({ kind: 'reddit-search', url: 'https://www.reddit.com/a.rss', limiter: reddit, deadline }),
      await http.request({ kind: 'reddit-search', url: 'https://www.reddit.com/b.rss', limiter: reddit, deadline }),
    ])(),
  );
  assert.equal(results[0].ok, true);
  assert.equal(results[1].skipped, true);
  assert.equal(results[1].status, 0);
  assert.equal(calls.length, 1, 'the skipped request never reached fetch');
  assert.equal(http.budgetExhausted, true);
  assert.deepEqual(http.sources[1], { kind: 'reddit-search', url: 'https://www.reddit.com/b.rss', status: 'skipped', note: 'budget exhausted' });
});

test('a backoff that would run past the deadline gives up instead', async () => {
  const { clock, calls, http } = harness([{ status: 429 }, { status: 200 }]);
  const reddit = http.limiter('reddit', 30_000);
  const res = await clock.run(http.request({ kind: 'reddit-search', url: 'https://www.reddit.com/a.rss', limiter: reddit, retry: REDDIT_RETRY, deadline: 30_000 }));
  assert.equal(res.skipped, true);
  assert.equal(calls.length, 1);
  assert.equal(http.sources[0].status, 'skipped');
  assert.ok(http.sources[0].note.includes('429'));
  assert.ok(http.sources[0].note.includes('budget'));
});

test('an Http-level deadline applies when the request names none', async () => {
  const clock = new FakeClock();
  const calls: Call[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, at: clock.now(), init: init ?? {} });
    return new Response('ok', { status: 200 });
  };
  const http = new Http({ fetch: fetchImpl, clock, deadline: 5_000 });
  clock.t = 6_000;
  const res = await clock.run(http.request({ kind: 'hn', url: 'https://hn.algolia.com/api/v1/search?query=x' }));
  assert.equal(res.skipped, true);
  assert.equal(calls.length, 0);
});

test('every request carries the scout User-Agent and merges custom headers', async () => {
  const { clock, calls, http } = harness();
  await clock.run(http.request({ kind: 'github', url: 'https://api.github.com/repos/x/y', headers: { accept: 'application/vnd.github+json' } }));
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers['user-agent'], USER_AGENT);
  assert.equal(USER_AGENT, 'dojo-scout/0.1 (+https://github.com/zainthedev/skills)');
  assert.equal(headers.accept, 'application/vnd.github+json');
  assert.equal(calls[0].init.redirect, 'follow');
});

test('gzip bodies are decoded and json() parses them', async () => {
  const { clock, http } = harness([{ status: 200, body: gzipSync('{"data":[{"id":"a"}]}') }]);
  const { res, json } = await clock.run(http.json({ kind: 'reddit-wiki', url: 'https://web.archive.org/web/2026id_/https://old.reddit.com/r/node/wiki/index' }));
  assert.equal(res.ok, true);
  assert.deepEqual(json, { data: [{ id: 'a' }] });
});

test('HEAD requests read no body and expose lowercase headers', async () => {
  const { clock, calls, http } = harness([{ status: 200, body: 'ignored', headers: { 'Last-Modified': 'Fri, 11 Sep 2026 18:18:19 GMT' } }]);
  const res = await clock.run(http.request({ kind: 'head', url: 'https://expressjs.com/en/guide/routing.html', method: 'HEAD' }));
  assert.equal(calls[0].init.method, 'HEAD');
  assert.equal(res.text, '');
  assert.equal(res.headers['last-modified'], 'Fri, 11 Sep 2026 18:18:19 GMT');
});

test('network errors are recorded, not thrown, and not retried', async () => {
  const clock = new FakeClock();
  let attempts = 0;
  const fetchImpl: FetchLike = async () => {
    attempts++;
    throw new TypeError('fetch failed');
  };
  const http = new Http({ fetch: fetchImpl, clock });
  const res = await clock.run(http.request({ kind: 'devto', url: 'https://dev.to/api/articles?tag=node', retry: REDDIT_RETRY }));
  assert.equal(res.ok, false);
  assert.equal(res.status, 0);
  assert.equal(res.error, 'fetch failed');
  assert.equal(attempts, 1);
  assert.deepEqual(http.sources[0], { kind: 'devto', url: 'https://dev.to/api/articles?tag=node', status: 'error', note: 'fetch failed' });
});

test('the limiter reports its next slot and honours a deadline before reserving', async () => {
  const clock = new FakeClock();
  const limiter = new RateLimiter('x', 1_000, clock);
  assert.equal(await limiter.acquire(), true);
  assert.equal(limiter.nextSlot(), 1_000);
  assert.equal(await limiter.acquire(500), false, 'no slot is taken when the deadline is earlier');
  assert.equal(limiter.nextSlot(), 1_000, 'a refused acquire leaves the schedule untouched');
});

test('live: Hacker News Algolia answers and parses', { skip: !process.env.SCOUT_LIVE }, async () => {
  const http = new Http({ deadline: Date.now() + 30_000 });
  const { res, json } = await http.json({ kind: 'hn', url: 'https://hn.algolia.com/api/v1/search?query=express&tags=story&hitsPerPage=3' });
  assert.equal(res.ok, true);
  assert.ok(parseHnSearch(json).stories.length > 0);
});
