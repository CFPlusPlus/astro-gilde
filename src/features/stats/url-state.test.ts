import { describe, expect, it } from 'vitest';

import { buildStatsUrlSearch, buildVersusShareUrlSearch, parseStatsUrlState } from './url-state';

describe('stats url-state', () => {
  it('parses all supported query values from url', () => {
    const parsed = parseStatsUrlState('?tab=versus&top=30&cat=playtime&q=Steve&a=uuid-a&b=uuid-b');

    expect(parsed.tab).toBe('versus');
    expect(parsed.pageSize).toBe(30);
    expect(parsed.rankMetricId).toBe('playtime');
    expect(parsed.searchQuery).toBe('Steve');
    expect(parsed.versus.playerA).toEqual({ uuid: 'uuid-a', name: 'uuid-a' });
    expect(parsed.versus.playerB).toEqual({ uuid: 'uuid-b', name: 'uuid-b' });
    expect(parsed.versus.shouldAutoCompare).toBe(true);
  });

  it('falls back to safe defaults for invalid values', () => {
    const parsed = parseStatsUrlState('?tab=abc&top=999&cat=');

    expect(parsed.tab).toBe('uebersicht');
    expect(parsed.pageSize).toBe(20);
    expect(parsed.rankMetricId).toBeNull();
    expect(parsed.searchQuery).toBe('');
    expect(parsed.versus.playerA).toBeNull();
    expect(parsed.versus.playerB).toBeNull();
    expect(parsed.versus.shouldAutoCompare).toBe(false);
  });

  it('builds deterministic url search params for rankings', () => {
    const search = buildStatsUrlSearch({
      activeTab: 'ranglisten',
      pageSize: 20,
      activeMetricId: 'hours',
      searchQuery: '',
      versusPlayerA: null,
      versusPlayerB: null,
    });

    expect(search).toBe('?tab=leaderboards&cat=hours');
  });

  it('builds deterministic url search params for versus with top and query', () => {
    const search = buildStatsUrlSearch({
      activeTab: 'versus',
      pageSize: 30,
      activeMetricId: null,
      searchQuery: ' Alex ',
      versusPlayerA: { uuid: 'uuid-a', name: 'Alice' },
      versusPlayerB: { uuid: 'uuid-b', name: 'Bob' },
    });

    expect(search).toBe('?tab=versus&top=30&q=Alex&a=uuid-a&b=uuid-b');
  });

  it('builds deterministic share url for versus', () => {
    const search = buildVersusShareUrlSearch({
      playerAUuid: 'uuid-a',
      playerBUuid: ' uuid-b ',
    });

    expect(search).toBe('?tab=versus&a=uuid-a&b=uuid-b');
  });

  it('builds minimal share url for versus without players', () => {
    const search = buildVersusShareUrlSearch({
      playerAUuid: null,
      playerBUuid: '',
    });

    expect(search).toBe('?tab=versus');
  });
});
