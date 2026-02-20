import { STATS_DEFAULT_PAGE_SIZE, STATS_PAGE_SIZES } from './constants';
import type { PlayersSearchItem } from './types';
import type { TabKey } from './types-ui';

type UrlVersusPlayer = {
  uuid: string;
  name: string;
};

export const STATS_URL_QUERY_KEYS = {
  tab: 'tab',
  top: 'top',
  category: 'cat',
  search: 'q',
  versusPlayerA: 'a',
  versusPlayerB: 'b',
} as const;

type UrlTabKey = 'overview' | 'king' | 'leaderboards' | 'versus';

const TAB_FROM_URL: Record<UrlTabKey, TabKey> = {
  overview: 'uebersicht',
  king: 'king',
  leaderboards: 'ranglisten',
  versus: 'versus',
};

const TAB_TO_URL: Record<TabKey, UrlTabKey> = {
  uebersicht: 'overview',
  king: 'king',
  ranglisten: 'leaderboards',
  versus: 'versus',
};

export type ParsedStatsUrlState = {
  tab: TabKey;
  pageSize: number;
  rankMetricId: string | null;
  searchQuery: string;
  versus: {
    playerA: UrlVersusPlayer | null;
    playerB: UrlVersusPlayer | null;
    shouldAutoCompare: boolean;
  };
};

function cleanString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTab(value: string | null): TabKey {
  const safeTab = cleanString(value)?.toLowerCase();
  if (!safeTab) return 'uebersicht';

  if (
    safeTab === 'overview' ||
    safeTab === 'king' ||
    safeTab === 'leaderboards' ||
    safeTab === 'versus'
  ) {
    return TAB_FROM_URL[safeTab];
  }

  return 'uebersicht';
}

function parsePageSize(value: string | null): number {
  if (!value) return STATS_DEFAULT_PAGE_SIZE;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return STATS_DEFAULT_PAGE_SIZE;
  return STATS_PAGE_SIZES.includes(parsed as (typeof STATS_PAGE_SIZES)[number])
    ? parsed
    : STATS_DEFAULT_PAGE_SIZE;
}

function parseVersusPlayer(uuid: string | null): UrlVersusPlayer | null {
  const safeUuid = cleanString(uuid);
  if (!safeUuid) return null;
  return { uuid: safeUuid, name: safeUuid };
}

export function parseStatsUrlState(search: string): ParsedStatsUrlState {
  const params = new URLSearchParams(search);

  const tab = parseTab(params.get(STATS_URL_QUERY_KEYS.tab));
  const pageSize = parsePageSize(params.get(STATS_URL_QUERY_KEYS.top));
  const rankMetricId = cleanString(params.get(STATS_URL_QUERY_KEYS.category));
  const searchQuery = params.get(STATS_URL_QUERY_KEYS.search) || '';

  const playerA = parseVersusPlayer(params.get(STATS_URL_QUERY_KEYS.versusPlayerA));
  const playerB = parseVersusPlayer(params.get(STATS_URL_QUERY_KEYS.versusPlayerB));

  return {
    tab,
    pageSize,
    rankMetricId,
    searchQuery,
    versus: {
      playerA,
      playerB,
      shouldAutoCompare: tab === 'versus' && Boolean(playerA && playerB),
    },
  };
}

export function buildStatsUrlSearch({
  activeTab,
  pageSize,
  activeMetricId,
  searchQuery,
  versusPlayerA,
  versusPlayerB,
}: {
  activeTab: TabKey;
  pageSize: number;
  activeMetricId: string | null;
  searchQuery: string;
  versusPlayerA: PlayersSearchItem | null;
  versusPlayerB: PlayersSearchItem | null;
}): string {
  const params = new URLSearchParams();
  const urlTab = TAB_TO_URL[activeTab];

  if (urlTab !== 'overview') {
    params.set(STATS_URL_QUERY_KEYS.tab, urlTab);
  }

  if (
    STATS_PAGE_SIZES.includes(pageSize as (typeof STATS_PAGE_SIZES)[number]) &&
    pageSize !== STATS_DEFAULT_PAGE_SIZE
  ) {
    params.set(STATS_URL_QUERY_KEYS.top, String(pageSize));
  }

  const safeSearchQuery = searchQuery.trim();
  if (safeSearchQuery.length > 0) {
    params.set(STATS_URL_QUERY_KEYS.search, safeSearchQuery);
  }

  const cleanMetricId = cleanString(activeMetricId);
  if (activeTab === 'ranglisten' && cleanMetricId) {
    params.set(STATS_URL_QUERY_KEYS.category, cleanMetricId);
  }

  const playerAUuid = cleanString(versusPlayerA?.uuid || null);
  if (activeTab === 'versus' && playerAUuid) {
    params.set(STATS_URL_QUERY_KEYS.versusPlayerA, playerAUuid);
  }

  const playerBUuid = cleanString(versusPlayerB?.uuid || null);
  if (activeTab === 'versus' && playerBUuid) {
    params.set(STATS_URL_QUERY_KEYS.versusPlayerB, playerBUuid);
  }

  const query = params.toString();
  return query.length > 0 ? `?${query}` : '';
}

export function buildVersusShareUrlSearch({
  playerAUuid,
  playerBUuid,
}: {
  playerAUuid: string | null;
  playerBUuid: string | null;
}) {
  const params = new URLSearchParams();
  params.set(STATS_URL_QUERY_KEYS.tab, TAB_TO_URL.versus);

  const safePlayerAUuid = cleanString(playerAUuid);
  if (safePlayerAUuid) {
    params.set(STATS_URL_QUERY_KEYS.versusPlayerA, safePlayerAUuid);
  }

  const safePlayerBUuid = cleanString(playerBUuid);
  if (safePlayerBUuid) {
    params.set(STATS_URL_QUERY_KEYS.versusPlayerB, safePlayerBUuid);
  }

  return `?${params.toString()}`;
}
