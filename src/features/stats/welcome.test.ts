import { describe, expect, it } from 'vitest';

import {
  shouldShowWelcome,
  WELCOME_DISMISS_KEY,
  WELCOME_DISMISS_LEGACY_KEY,
  WELCOME_DISMISS_TTL_MS,
} from './welcome';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
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

describe('shouldShowWelcome', () => {
  it('returns false while dismiss timestamp is still within TTL', () => {
    const storage = new MemoryStorage();
    const now = Date.now();
    storage.setItem(WELCOME_DISMISS_KEY, String(now - 10_000));

    expect(shouldShowWelcome(storage, now)).toBe(false);
  });

  it('returns true and cleans expired timestamps', () => {
    const storage = new MemoryStorage();
    const now = Date.now();
    storage.setItem(WELCOME_DISMISS_KEY, String(now - WELCOME_DISMISS_TTL_MS - 1));

    expect(shouldShowWelcome(storage, now)).toBe(true);
    expect(storage.getItem(WELCOME_DISMISS_KEY)).toBeNull();
  });

  it('removes legacy key once and still shows welcome', () => {
    const storage = new MemoryStorage();
    storage.setItem(WELCOME_DISMISS_LEGACY_KEY, '1');

    expect(shouldShowWelcome(storage, Date.now())).toBe(true);
    expect(storage.getItem(WELCOME_DISMISS_LEGACY_KEY)).toBeNull();
  });
});
