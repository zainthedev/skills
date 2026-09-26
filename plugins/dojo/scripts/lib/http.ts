// The scout's HTTP layer, polite by construction. Every request goes through a rate limiter for
// its source, retries a bounded number of times with a backoff when the server pushes back, and
// refuses to start once its deadline has passed. The clock and fetch are injectable so the tests
// run against a fake clock and a fake fetch with no network and no real timers.

import { gunzipSync } from 'node:zlib';
import type { SourceKind, SourceRecord } from './scout/types.ts';

export const USER_AGENT = 'dojo-scout/0.1 (+https://github.com/zainthedev/skills)';

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms))),
};

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface RetryPolicy {
  /** Statuses that trigger a backoff and retry, such as 429. */
  statuses: number[];
  backoffMs: number;
  maxRetries: number;
}

/** Spaces requests to one source at least minIntervalMs apart, and pauses all of them on a backoff. */
export class RateLimiter {
  readonly name: string;
  readonly minIntervalMs: number;
  private clock: Clock;
  private nextFree = 0;
  private pausedUntil = 0;

  constructor(name: string, minIntervalMs: number, clock: Clock) {
    this.name = name;
    this.minIntervalMs = minIntervalMs;
    this.clock = clock;
  }

  /** Waits for the next slot. Returns false, taking no slot, when the slot would start after the deadline. */
  async acquire(deadline?: number): Promise<boolean> {
    for (;;) {
      const now = this.clock.now();
      const start = Math.max(now, this.nextFree, this.pausedUntil);
      if (deadline !== undefined && start > deadline) return false;
      this.nextFree = start + this.minIntervalMs;
      if (start > now) await this.clock.sleep(start - now);
      if (this.clock.now() >= this.pausedUntil) return true;
      // A backoff began while this request slept: queue again behind it.
    }
  }

  /** Holds every pending request on this limiter until now plus ms. */
  backoff(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, this.clock.now() + ms);
  }

  /** When the next request may start, for planning messages. */
  nextSlot(): number {
    return Math.max(this.clock.now(), this.nextFree, this.pausedUntil);
  }
}

export interface HttpRequest {
  kind: SourceKind;
  url: string;
  limiter?: RateLimiter;
  retry?: RetryPolicy;
  method?: 'GET' | 'HEAD';
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Epoch ms after which the request is skipped instead of started. Defaults to the Http deadline. */
  deadline?: number;
  /** false discards the body without reading it. */
  readBody?: boolean;
}

export interface HttpResponse {
  ok: boolean;
  status: number;
  /** The final URL after redirects. */
  url: string;
  headers: Record<string, string>;
  text: string;
  skipped: boolean;
  error: string | null;
}

export interface HttpOptions {
  fetch?: FetchLike;
  clock?: Clock;
  userAgent?: string;
  deadline?: number;
  log?: (line: string) => void;
}

function decodeBody(bytes: Uint8Array): string {
  if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try {
      return gunzipSync(bytes).toString('utf8');
    } catch {
      // Not gzip after all: fall through to a plain decode.
    }
  }
  return new TextDecoder('utf-8').decode(bytes);
}

function retryAfterMs(res: Response): number {
  const header = res.headers.get('retry-after');
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const when = Date.parse(header);
  return Number.isNaN(when) ? 0 : Math.max(0, when - Date.now());
}

export class Http {
  readonly sources: SourceRecord[] = [];
  /** Set once any request was skipped because its deadline had passed. */
  budgetExhausted = false;
  private fetchImpl: FetchLike;
  private clock: Clock;
  private userAgent: string;
  private deadline: number | undefined;
  private log: (line: string) => void;

  constructor(opts: HttpOptions = {}) {
    this.fetchImpl = opts.fetch ?? ((url, init) => fetch(url, init));
    this.clock = opts.clock ?? realClock;
    this.userAgent = opts.userAgent ?? USER_AGENT;
    this.deadline = opts.deadline;
    this.log = opts.log ?? (() => {});
  }

  limiter(name: string, minIntervalMs: number): RateLimiter {
    return new RateLimiter(name, minIntervalMs, this.clock);
  }

  now(): number {
    return this.clock.now();
  }

  private record(req: HttpRequest, status: SourceRecord['status'], note: string): void {
    this.sources.push({ kind: req.kind, url: req.url, status, note });
  }

  private skipped(req: HttpRequest, note: string): HttpResponse {
    this.budgetExhausted = true;
    this.record(req, 'skipped', note);
    this.log(`[scout] skipped ${req.kind} ${req.url}: ${note}`);
    return { ok: false, status: 0, url: req.url, headers: {}, text: '', skipped: true, error: note };
  }

  async request(req: HttpRequest): Promise<HttpResponse> {
    const deadline = req.deadline ?? this.deadline;
    const maxRetries = req.retry?.maxRetries ?? 0;
    const history: string[] = [];
    const method = req.method ?? 'GET';
    for (let attempt = 0; ; attempt++) {
      if (req.limiter) {
        const got = await req.limiter.acquire(deadline);
        if (!got) return this.skipped(req, history.length ? `${history.join(', ')}, then budget exhausted` : 'budget exhausted');
      } else if (deadline !== undefined && this.clock.now() > deadline) {
        return this.skipped(req, history.length ? `${history.join(', ')}, then budget exhausted` : 'budget exhausted');
      }

      const started = this.clock.now();
      // A request may run a little past the deadline, but not by more than a few seconds.
      const wanted = req.timeoutMs ?? 20000;
      const timeoutMs = deadline === undefined ? wanted : Math.max(2000, Math.min(wanted, deadline + 5000 - started));
      let res: Response;
      try {
        res = await this.fetchImpl(req.url, {
          method,
          headers: { 'user-agent': this.userAgent, ...(req.headers ?? {}) },
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        const message = err instanceof Error ? (err.name === 'TimeoutError' ? `timeout after ${timeoutMs}ms${timeoutMs < wanted ? ' (budget)' : ''}` : err.message) : String(err);
        const note = history.length ? `${history.join(', ')}, then ${message}` : message;
        this.record(req, 'error', note);
        this.log(`[scout] ${req.kind} ${req.url}: ${message}`);
        return { ok: false, status: 0, url: req.url, headers: {}, text: '', skipped: false, error: message };
      }

      const status = res.status;
      if (req.retry && req.retry.statuses.includes(status) && attempt < maxRetries) {
        history.push(String(status));
        const wait = Math.max(req.retry.backoffMs, retryAfterMs(res));
        await res.body?.cancel().catch(() => {});
        if (deadline !== undefined && this.clock.now() + wait > deadline) {
          return this.skipped(req, `${history.join(', ')}, backoff of ${Math.round(wait / 1000)}s would exceed the budget`);
        }
        this.log(`[scout] ${req.kind} ${status} from ${req.url}: backing off ${Math.round(wait / 1000)}s (retry ${attempt + 1} of ${maxRetries})`);
        if (req.limiter) {
          req.limiter.backoff(wait);
        } else {
          await this.clock.sleep(wait);
        }
        continue;
      }

      let text = '';
      if (req.readBody !== false && method !== 'HEAD') {
        try {
          text = decodeBody(new Uint8Array(await res.arrayBuffer()));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.record(req, 'error', `${status} then body read failed: ${message}`);
          return { ok: false, status, url: res.url || req.url, headers: {}, text: '', skipped: false, error: message };
        }
      } else {
        await res.body?.cancel().catch(() => {});
      }
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      const ok = status >= 200 && status < 300;
      const elapsed = this.clock.now() - started;
      const note = `${history.length ? `${history.join(', ')}, then ` : ''}${status} in ${elapsed}ms`;
      this.record(req, ok ? 'ok' : 'error', note);
      return { ok, status, url: res.url || req.url, headers, text, skipped: false, error: ok ? null : `HTTP ${status}` };
    }
  }

  /** GET a JSON document. Returns null (and records the error) when the body is not JSON. */
  async json(req: HttpRequest): Promise<{ res: HttpResponse; json: unknown }> {
    const res = await this.request({ ...req, headers: { accept: 'application/json', ...(req.headers ?? {}) } });
    if (!res.text) return { res, json: null };
    try {
      return { res, json: JSON.parse(res.text) };
    } catch {
      this.log(`[scout] ${req.kind} ${req.url}: response is not JSON`);
      return { res, json: null };
    }
  }
}
