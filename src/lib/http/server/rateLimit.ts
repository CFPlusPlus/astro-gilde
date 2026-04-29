export type FixedWindowRateLimitConfig = {
  limit: number;
  windowMs: number;
};

export type FixedWindowRateLimitBucket = {
  windowStartMs: number;
  count: number;
};

export type FixedWindowRateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSeconds: number;
};

export type FixedWindowRateLimitStore = Map<string, FixedWindowRateLimitBucket>;

export const BAN_STATUS_RATE_LIMIT: FixedWindowRateLimitConfig = {
  limit: 8,
  windowMs: 60_000,
};

const DEFAULT_MAX_BUCKETS = 2_048;
const defaultFixedWindowRateLimitStore: FixedWindowRateLimitStore = new Map();

function cleanupExpiredBuckets(
  store: FixedWindowRateLimitStore,
  nowMs: number,
  windowMs: number,
): void {
  if (store.size <= DEFAULT_MAX_BUCKETS) return;

  const oldestActiveWindowMs = nowMs - windowMs;
  for (const [key, bucket] of store) {
    if (bucket.windowStartMs < oldestActiveWindowMs) {
      store.delete(key);
    }
  }
}

export function consumeFixedWindowRateLimit(
  store: FixedWindowRateLimitStore,
  key: string,
  config: FixedWindowRateLimitConfig,
  nowMs = Date.now(),
): FixedWindowRateLimitDecision {
  cleanupExpiredBuckets(store, nowMs, config.windowMs);

  const windowStartMs = Math.floor(nowMs / config.windowMs) * config.windowMs;
  const resetAtMs = windowStartMs + config.windowMs;
  const existing = store.get(key);
  const bucket =
    existing && existing.windowStartMs === windowStartMs
      ? existing
      : {
          windowStartMs,
          count: 0,
        };

  if (bucket.count >= config.limit) {
    store.set(key, bucket);
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      resetAtMs,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - nowMs) / 1_000)),
    };
  }

  bucket.count += 1;
  store.set(key, bucket);

  return {
    allowed: true,
    limit: config.limit,
    remaining: Math.max(0, config.limit - bucket.count),
    resetAtMs,
    retryAfterSeconds: 0,
  };
}

export function consumeDefaultFixedWindowRateLimit(
  key: string,
  config: FixedWindowRateLimitConfig,
  nowMs = Date.now(),
): FixedWindowRateLimitDecision {
  return consumeFixedWindowRateLimit(defaultFixedWindowRateLimitStore, key, config, nowMs);
}
