import type { LeaderboardRow } from './types';
import type { LiveDataErrorKind } from '../../lib/live/types';

export type TabKey = 'uebersicht' | 'king' | 'ranglisten' | 'versus';

export type LeaderboardState = {
  loaded: boolean;
  loading: boolean;
  liveStatus: 'ok' | 'stale' | 'error';
  liveErrorKind: LiveDataErrorKind | null;
  lastAttemptedPageSize: number | null;
  pages: LeaderboardRow[][];
  currentPage: number;
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number | null;
};
