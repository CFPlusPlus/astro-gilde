import { useEffect, useMemo, useRef } from 'react';

import type { PlayersSearchItem } from '../types';
import type { TabKey } from '../types-ui';
import {
  STATS_URL_QUERY_KEYS,
  buildStatsUrlSearch,
  parseStatsUrlState,
  type ParsedStatsUrlState,
} from '../url-state';

const DEFAULT_URL_SYNC_DEBOUNCE_MS = 260;

function shouldReplaceHistoryEntry(currentSearch: string, nextSearch: string): boolean {
  const currentParams = new URLSearchParams(currentSearch);
  const nextParams = new URLSearchParams(nextSearch);
  const keys = new Set<string>([...currentParams.keys(), ...nextParams.keys()]);

  for (const key of keys) {
    if (key === STATS_URL_QUERY_KEYS.search) continue;
    if (currentParams.get(key) !== nextParams.get(key)) return false;
  }

  return true;
}

export function useStatsUrlState({
  activeTab,
  pageSize,
  activeMetricId,
  searchQuery,
  versusPlayerA,
  versusPlayerB,
  onPopState,
  debounceMs = DEFAULT_URL_SYNC_DEBOUNCE_MS,
}: {
  activeTab: TabKey;
  pageSize: number;
  activeMetricId: string | null;
  searchQuery: string;
  versusPlayerA: PlayersSearchItem | null;
  versusPlayerB: PlayersSearchItem | null;
  onPopState: (state: ParsedStatsUrlState) => void;
  debounceMs?: number;
}) {
  const initialState = useMemo(
    () =>
      typeof window === 'undefined'
        ? parseStatsUrlState('')
        : parseStatsUrlState(window.location.search),
    [],
  );
  const timerRef = useRef<number | null>(null);
  const onPopStateRef = useRef(onPopState);

  onPopStateRef.current = onPopState;

  const nextSearch = useMemo(
    () =>
      buildStatsUrlSearch({
        activeTab,
        pageSize,
        activeMetricId,
        searchQuery,
        versusPlayerA,
        versusPlayerB,
      }),
    [activeMetricId, activeTab, pageSize, searchQuery, versusPlayerA, versusPlayerB],
  );

  useEffect(() => {
    const onPop = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      onPopStateRef.current(parseStatsUrlState(window.location.search));
    };

    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;

      if (window.location.search === nextSearch) return;

      try {
        const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
        if (shouldReplaceHistoryEntry(window.location.search, nextSearch)) {
          window.history.replaceState({}, '', nextUrl);
        } else {
          window.history.pushState({}, '', nextUrl);
        }
      } catch {
        // Unkritisch: History-API kann blockiert sein.
      }
    }, debounceMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [debounceMs, nextSearch]);

  return { initialState };
}
