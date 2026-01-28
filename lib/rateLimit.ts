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
  const globalAny = globalThis as any;
  if (!globalAny.__rateLimitStore) {
    globalAny.__rateLimitStore = new Map<string, RateLimitEntry>();
  }
  return globalAny.__rateLimitStore as Map<string, RateLimitEntry>;
})();

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  const realIp = request.headers.get("x-real-ip");
  return realIp || "unknown";
}

export function rateLimit(request: Request, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const key = `${options.keyPrefix || "global"}:${getClientIp(request)}`;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + options.windowMs;
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
