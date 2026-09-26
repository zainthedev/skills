// The shared state one scout run threads through its fetchers: the HTTP layer, the resource
// index, the rate limiters per source, and the two deadlines (discovery, then verification).

import type { Http, RateLimiter, RetryPolicy } from '../http.ts';
import type { ResourceIndex } from './resources.ts';
import type { Thread } from './types.ts';

export interface Limiters {
  reddit: RateLimiter;
  arctic: RateLimiter;
  wayback: RateLimiter;
  hn: RateLimiter;
  se: RateLimiter;
  devto: RateLimiter;
  github: RateLimiter;
  head: RateLimiter;
  youtube: RateLimiter;
}

export interface ScoutContext {
  http: Http;
  index: ResourceIndex;
  /** Threads whose replies were read, keyed by `${source}:${id}`. */
  threads: Map<string, Thread>;
  limiters: Limiters;
  /** Epoch ms after which no discovery request starts. */
  discoveryDeadline: number;
  /** Epoch ms after which no request at all starts. */
  finalDeadline: number;
  /** Epoch ms of the run's start. */
  nowMs: number;
  /** YYYY-MM-DD of the run. */
  today: string;
  log: (line: string) => void;
  githubToken: string | null;
}

/** Reddit feeds: one request per 30 seconds, 60 second backoff on 429, at most three retries. */
export const REDDIT_RETRY: RetryPolicy = { statuses: [429], backoffMs: 60_000, maxRetries: 3 };
/** Arctic Shift answers 422 "Timeout. Maybe slow down a bit" under load: one retry after a pause. */
export const ARCTIC_RETRY: RetryPolicy = { statuses: [429, 422], backoffMs: 12_000, maxRetries: 1 };
export const GENERIC_RETRY: RetryPolicy = { statuses: [429, 503], backoffMs: 5_000, maxRetries: 1 };

export const REDDIT_INTERVAL_MS = 30_000;
export const ARCTIC_INTERVAL_MS = 6_000;

export function createLimiters(http: Http): Limiters {
  return {
    reddit: http.limiter('reddit', REDDIT_INTERVAL_MS),
    arctic: http.limiter('arctic-shift', ARCTIC_INTERVAL_MS),
    wayback: http.limiter('wayback', 2_500),
    hn: http.limiter('hn', 400),
    se: http.limiter('stackexchange', 1_000),
    devto: http.limiter('devto', 1_000),
    github: http.limiter('github', 1_500),
    head: http.limiter('head', 500),
    youtube: http.limiter('youtube', 1_500),
  };
}

/** True when the day is within the given number of months before nowMs. Unknown dates are false. */
export function withinMonths(day: string | null, nowMs: number, months: number): boolean {
  if (!day) return false;
  const t = new Date(day).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t <= months * 30.4375 * 24 * 3600 * 1000;
}

/** Excerpt needles for a link: its text when that is not the URL itself, then the URL forms. */
export function linkNeedles(link: { url: string; text: string }): string[] {
  const needles: string[] = [];
  if (link.text && link.text !== link.url && !/^https?:\/\//i.test(link.text)) needles.push(link.text);
  needles.push(link.url, link.url.replace(/^https?:\/\/(www\.)?/i, ''));
  return needles;
}
