import { describe, expect, it } from 'vitest';

import { buildStatsUrlSearch, parseStatsUrlState } from './url-state';

describe('stats url-state', () => {
  it('parses rankings and versus query values from url', () => {
    const parsed = parseStatsUrlState(
      '?rm=diamond&va=uuid-a&van=Alice&vb=uuid-b&vbn=Bob&vf=farm&vm=kills,deaths',
    );

    expect(parsed.rankMetricId).toBe('diamond');
    expect(parsed.versus.playerA).toEqual({ uuid: 'uuid-a', name: 'Alice' });
    expect(parsed.versus.playerB).toEqual({ uuid: 'uuid-b', name: 'Bob' });
    expect(parsed.versus.metricFilter).toBe('farm');
    expect(parsed.versus.metricIds).toEqual(['kills', 'deaths']);
    expect(parsed.versus.shouldAutoCompare).toBe(true);
  });

  it('falls back to safe defaults for invalid values', () => {
    const parsed = parseStatsUrlState('?rm=&vm=,');

    expect(parsed.rankMetricId).toBeNull();
    expect(parsed.versus.playerA).toBeNull();
    expect(parsed.versus.playerB).toBeNull();
    expect(parsed.versus.metricIds).toEqual([]);
    expect(parsed.versus.shouldAutoCompare).toBe(false);
  });

  it('builds deterministic url search params', () => {
    const search = buildStatsUrlSearch({
      activeMetricId: 'hours',
      versusMetricFilter: 'abc',
      versusMetricIds: ['m1', 'm2'],
      versusPlayerA: { uuid: 'uuid-a', name: 'Alice' },
      versusPlayerB: { uuid: 'uuid-b', name: 'Bob' },
    });

    expect(search).toBe('?rm=hours&va=uuid-a&van=Alice&vb=uuid-b&vbn=Bob&vf=abc&vm=m1%2Cm2');
  });
});
