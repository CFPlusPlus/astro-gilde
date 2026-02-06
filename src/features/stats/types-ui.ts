import type { LeaderboardRow } from './types';

export type TabKey = 'uebersicht' | 'king' | 'ranglisten' | 'versus';

export type LeaderboardState = {
  loaded: boolean;
  loading: boolean;
  pages: LeaderboardRow[][];
  currentPage: number;
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number | null;
};
