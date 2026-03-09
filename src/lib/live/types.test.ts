import { describe, expect, it } from 'vitest';

import { isLiveOfflineError, resolveLiveIndicatorState } from './types';

describe('resolveLiveIndicatorState', () => {
  it('maps loading and stale to loading', () => {
    expect(resolveLiveIndicatorState({ status: 'loading' })).toBe('loading');
    expect(resolveLiveIndicatorState({ status: 'stale' })).toBe('loading');
  });

  it('maps offline errors to error even with stale snapshots', () => {
    expect(
      resolveLiveIndicatorState({
        status: 'stale',
        error: { kind: 'offline' },
      }),
    ).toBe('error');
  });

  it('maps empty and ok to ok', () => {
    expect(resolveLiveIndicatorState({ status: 'empty' })).toBe('ok');
    expect(resolveLiveIndicatorState({ status: 'ok' })).toBe('ok');
  });
});

describe('isLiveOfflineError', () => {
  it('detects offline errors reliably', () => {
    expect(isLiveOfflineError({ kind: 'offline' })).toBe(true);
    expect(isLiveOfflineError({ kind: 'network' })).toBe(false);
    expect(isLiveOfflineError(null)).toBe(false);
  });
});
