import { describe, expect, it } from 'vitest';
import { consumeFixedWindowRateLimit, type FixedWindowRateLimitStore } from './rateLimit';

describe('consumeFixedWindowRateLimit', () => {
  it('allows requests up to the configured limit', () => {
    const store: FixedWindowRateLimitStore = new Map();
    const config = { limit: 2, windowMs: 60_000 };

    expect(consumeFixedWindowRateLimit(store, 'ip:test', config, 1_000)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(consumeFixedWindowRateLimit(store, 'ip:test', config, 2_000)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it('blocks further requests until the fixed window resets', () => {
    const store: FixedWindowRateLimitStore = new Map();
    const config = { limit: 2, windowMs: 60_000 };

    consumeFixedWindowRateLimit(store, 'ip:test', config, 1_000);
    consumeFixedWindowRateLimit(store, 'ip:test', config, 2_000);

    expect(consumeFixedWindowRateLimit(store, 'ip:test', config, 3_000)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 57,
    });
    expect(consumeFixedWindowRateLimit(store, 'ip:test', config, 60_000)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it('tracks keys independently', () => {
    const store: FixedWindowRateLimitStore = new Map();
    const config = { limit: 1, windowMs: 60_000 };

    consumeFixedWindowRateLimit(store, 'ip:a', config, 1_000);

    expect(consumeFixedWindowRateLimit(store, 'ip:a', config, 2_000).allowed).toBe(false);
    expect(consumeFixedWindowRateLimit(store, 'ip:b', config, 2_000).allowed).toBe(true);
  });
});
