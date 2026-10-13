import { isIP } from 'node:net';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = (() => {
  const rateLimitGlobal = globalThis as typeof globalThis & { __rateLimitStore?: Map<string, RateLimitEntry> };
  if (!rateLimitGlobal.__rateLimitStore) {
    rateLimitGlobal.__rateLimitStore = new Map<string, RateLimitEntry>();
  }
  return rateLimitGlobal.__rateLimitStore;
})();

const MAX_ENTRIES = 10_000;
let nextCleanupAt = 0;

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || '';
  return candidate.length <= 64 && isIP(candidate) ? candidate : "unknown";
}

export function rateLimit(request: Request, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  if (now >= nextCleanupAt) {
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
    nextCleanupAt = now + 60_000;
  }
  const key = `${options.keyPrefix || "global"}:${getClientIp(request)}`;
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + options.windowMs;
    if (!entry && store.size >= MAX_ENTRIES) {
      return { ok: false, remaining: 0, resetAt, retryAfter: Math.ceil(options.windowMs / 1000) };
    }
    store.set(key, { count: 1, resetAt });
    return {
      ok: true,
      remaining: Math.max(0, options.max - 1),
      resetAt,
      retryAfter: Math.ceil(options.windowMs / 1000),
    };
  }

  entry.count += 1;
  store.set(key, entry);

  const remaining = Math.max(0, options.max - entry.count);
  const retryAfter = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));

  return {
    ok: entry.count <= options.max,
    remaining,
    resetAt: entry.resetAt,
    retryAfter,
  };
}
