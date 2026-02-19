import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLiveResource, resetLiveResourceCache } from './cache';
import type { LiveDataState } from './types';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const BASE_OPTIONS = {
  staleAfterMs: 1_000,
  maxCacheAgeMs: 10_000,
  cachePrefix: 'test-live:',
} as const;

describe('live/cache', () => {
  afterEach(() => {
    resetLiveResourceCache();
    vi.restoreAllMocks();
  });

  it('returns cached data immediately and revalidates in background', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'test-live:counter',
      JSON.stringify({
        status: 'ok',
        data: '12',
        updatedAt: 4_000,
        fetchedAt: 4_000,
      }),
    );

    const fetcher = vi.fn(
      async (): Promise<LiveDataState<string>> => ({
        status: 'ok',
        data: '13',
        updatedAt: 5_000,
        fetchedAt: 5_000,
      }),
    );

    const resource = getLiveResource('counter', fetcher, {
      ...BASE_OPTIONS,
      storage,
      now: () => 4_500,
    });

    expect(resource.state).toEqual({
      status: 'ok',
      data: '12',
      updatedAt: 4_000,
      fetchedAt: 4_000,
      error: undefined,
    });

    const latest = await resource.revalidate;

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(latest).toEqual({
      status: 'ok',
      data: '13',
      updatedAt: 5_000,
      fetchedAt: 5_000,
      error: undefined,
    });
  });

  it('returns stale cached data when refresh fails but cache is still valid', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'test-live:counter',
      JSON.stringify({
        status: 'ok',
        data: '12',
        updatedAt: 4_000,
        fetchedAt: 4_000,
      }),
    );

    const resource = getLiveResource(
      'counter',
      async (): Promise<LiveDataState<string>> => ({
        status: 'error',
        fetchedAt: 5_000,
        error: {
          kind: 'network',
          message: 'offline',
        },
      }),
      {
        ...BASE_OPTIONS,
        storage,
        now: () => 6_500,
      },
    );

    expect(resource.state.status).toBe('stale');

    const latest = await resource.revalidate;

    expect(latest).toEqual({
      status: 'stale',
      data: '12',
      updatedAt: 4_000,
      fetchedAt: 5_000,
      error: {
        kind: 'network',
        message: 'offline',
      },
    });
  });

  it('returns stale cached data when refresh has invalid response but cache is still valid', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'test-live:counter',
      JSON.stringify({
        status: 'ok',
        data: '12',
        updatedAt: 4_000,
        fetchedAt: 4_000,
      }),
    );

    const resource = getLiveResource(
      'counter',
      async (): Promise<LiveDataState<string>> => ({
        status: 'error',
        fetchedAt: 5_000,
        error: {
          kind: 'invalid',
          message: 'schema mismatch',
        },
      }),
      {
        ...BASE_OPTIONS,
        storage,
        now: () => 6_500,
      },
    );

    expect(resource.state.status).toBe('stale');

    const latest = await resource.revalidate;

    expect(latest).toEqual({
      status: 'stale',
      data: '12',
      updatedAt: 4_000,
      fetchedAt: 5_000,
      error: {
        kind: 'invalid',
        message: 'schema mismatch',
      },
    });
  });

  it('returns error when cache is too old and refresh fails', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'test-live:counter',
      JSON.stringify({
        status: 'ok',
        data: '12',
        updatedAt: 1_000,
        fetchedAt: 1_000,
      }),
    );

    const resource = getLiveResource(
      'counter',
      async (): Promise<LiveDataState<string>> => ({
        status: 'error',
        fetchedAt: 20_000,
        error: {
          kind: 'network',
          message: 'offline',
        },
      }),
      {
        ...BASE_OPTIONS,
        storage,
        now: () => 20_000,
      },
    );

    expect(resource.state).toEqual({
      status: 'error',
      fetchedAt: 20_000,
      error: {
        kind: 'invalid',
        message: 'Zwischengespeicherte Daten sind zu alt.',
      },
    });
    expect(storage.getItem('test-live:counter')).toBeNull();

    const latest = await resource.revalidate;

    expect(latest).toEqual({
      status: 'error',
      fetchedAt: 20_000,
      error: {
        kind: 'network',
        message: 'offline',
      },
    });
  });

  it('dedupes revalidation requests for the same key', async () => {
    const storage = new MemoryStorage();
    const fetcher = vi.fn(
      async (): Promise<LiveDataState<string>> => ({
        status: 'ok',
        data: '7',
        updatedAt: 8_000,
        fetchedAt: 8_000,
      }),
    );

    const first = getLiveResource('shared', fetcher, {
      ...BASE_OPTIONS,
      storage,
      now: () => 7_000,
    });
    const second = getLiveResource('shared', fetcher, {
      ...BASE_OPTIONS,
      storage,
      now: () => 7_000,
    });

    expect(first.revalidate).toBe(second.revalidate);

    const [one, two] = await Promise.all([first.revalidate, second.revalidate]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(one).toEqual(two);
  });

  it('reads legacy cache payload format', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'test-live:legacy',
      JSON.stringify({
        kind: 'empty',
        value: '0',
        timestamp: 5_000,
      }),
    );

    const resource = getLiveResource('legacy', async () => ({ status: 'loading' }), {
      ...BASE_OPTIONS,
      storage,
      now: () => 5_500,
      revalidate: false,
    });

    expect(resource.state).toEqual({
      status: 'empty',
      data: '0',
      updatedAt: 5_000,
      fetchedAt: 5_000,
      error: undefined,
    });
    expect(resource.revalidate).toBeNull();
  });
});
