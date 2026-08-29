// rate-limit — fixed-window in-memory rate limiter for API cost & abuse protection.
//
// WHY: STATUS.md open finding #4 — `/api/ai/*` (LLM cost protection) had no
// rate limiters. Each AI call can cost real money when the ZAI provider is
// enabled, and unauthenticated spam on write endpoints invites abuse.
//
// TRADEOFF (single-node, in-memory):
// - Buckets live in a module-level Map, so state is per-process. In the
//   sandbox/demo (one `next dev` node) that is exactly one instance — perfect.
// - On serverless/multi-instance production the window resets per instance
//   and per cold start, so the effective limit is `limit × instance count`.
//   That is acceptable for cost protection but NOT for hard security
//   guarantees. Swap this module for Upstash Redis (`@upstash/ratelimit`)
//   or an edge KV atomic counter in production — the exported signatures
//   (`rateLimit` / `clientKey` / `rateLimitResponse`) are intentionally small
//   so routes won't need to change.
// - No `setInterval` sweeper: that would hold an open handle, which breaks
//   serverless freeze/restore. Instead we sweep lazily inline (see below).
//
// Algorithm: fixed window. First hit in a window opens `{ count, resetAt }`;
// subsequent hits increment. `ok` is false once `count > limit`. Fixed window
// is marginally more burst-tolerant at window edges than sliding window, which
// is fine here — we are protecting LLM spend, not guarding a bank vault.

export type RateLimitResult = {
  /** true when the caller is still within the limit for this window */
  ok: boolean;
  /** requests remaining in this window (never negative) */
  remaining: number;
  /** seconds until the window resets (>= 0); use for the Retry-After header */
  retryAfterSec: number;
  /** the configured limit, echoed for logging/debugging */
  limit: number;
};

type Bucket = { count: number; resetAt: number };

/** Module-level store — shared across all requests in this process. */
const buckets = new Map<string, Bucket>();

/** Lazy-sweep triggers: map got large, or a minute has passed since last sweep. */
const MAX_ENTRIES = 5_000;
const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = 0;

/**
 * Delete every expired bucket. Called inline from `rateLimit` — never on a
 * timer — so the module holds no open handles (serverless-safe). O(n) but
 * throttled to at most once per `SWEEP_INTERVAL_MS` (plus a size trigger).
 */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
  lastSweepAt = now;
}

/**
 * Fixed-window rate limit check. Pure bookkeeping — no side effects beyond
 * the in-memory map, so it never throws and never blocks the event loop.
 *
 * @param key   stable caller identity (see {@link clientKey})
 * @param opts  `limit` requests allowed per `windowMs` milliseconds
 * @returns ok / remaining / retryAfterSec / limit
 *
 * @example
 * ```ts
 * const rl = rateLimit(clientKey(req, user.id), { limit: 10, windowMs: 60_000 });
 * if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);
 * ```
 */
export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now();

  // Memory hygiene: bounded map + stale-entry cleanup, both inline & lazy.
  if (buckets.size > MAX_ENTRIES || now - lastSweepAt > SWEEP_INTERVAL_MS) {
    sweep(now);
  }

  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    // No bucket yet, or the previous window has fully elapsed → open a new one.
    bucket = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const ok = bucket.count <= opts.limit;

  return {
    ok,
    remaining: Math.max(0, opts.limit - bucket.count),
    retryAfterSec: Math.max(0, Math.ceil((bucket.resetAt - now) / 1000)),
    limit: opts.limit,
  };
}

/**
 * Build a stable identity key for a request. Prefer the authenticated user id
 * (best signal — works behind shared NATs/proxies). Otherwise fall back to the
 * first IP in `x-forwarded-for` (set by the Caddy gateway in this project),
 * and finally to a shared "anonymous" bucket for local/direct requests with
 * no forwarding header. Route handlers call this AFTER auth so the user id is
 * available; the IP fallback only matters for unauthenticated endpoints.
 *
 * Prefixes (`u:` / `ip:`) keep user ids and IPs from colliding in one map.
 */
export function clientKey(req: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();
  return ip ? `ip:${ip}` : "anonymous";
}

/**
 * Standard 429 response for a throttled request: JSON body with a machine
 * `error` code and a human `message`, plus the RFC-correct `Retry-After`
 * header (in seconds). Shape mirrors `errorResponse()` in authz.ts so clients
 * can keep parsing `{ error: string }` uniformly.
 */
export function rateLimitResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({ error: "RATE_LIMITED", message: "Too many requests. Please try again shortly." }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "Retry-After": String(Math.max(0, Math.ceil(retryAfterSec))),
      },
    },
  );
}
