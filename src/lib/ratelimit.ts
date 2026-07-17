// ===========================================================================
// Minimal in-memory fixed-window rate limiter. Per serverless instance only
// (no shared store), so treat it as an abuse speed bump, not a hard quota.
// ===========================================================================

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_KEYS = 10_000;

/**
 * Returns true if the call identified by `key` is allowed
 * (< `limit` calls per `windowMs`), false if it should be rejected.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now >= w.resetAt) {
    if (windows.size >= MAX_KEYS) prune(now);
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  w.count += 1;
  return w.count <= limit;
}

function prune(now: number) {
  const entries = Array.from(windows.entries());
  for (const [key, w] of entries) {
    if (now >= w.resetAt) windows.delete(key);
  }
  // Still full of live windows (attack) — drop everything rather than grow.
  if (windows.size >= MAX_KEYS) windows.clear();
}
