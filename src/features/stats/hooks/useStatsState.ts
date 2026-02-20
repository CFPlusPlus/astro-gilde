import { useCallback, useEffect, useMemo, useState } from 'react';

import { STATS_DEFAULT_PAGE_SIZE, STATS_PAGE_SIZES } from '../constants';
import { WELCOME_DISMISS_KEY, WELCOME_DISMISS_LEGACY_KEY, shouldShowWelcome } from '../welcome';
import { useQuerySync } from './useQuerySync';

function sanitizePageSize(next: number): number {
  return STATS_PAGE_SIZES.includes(next as (typeof STATS_PAGE_SIZES)[number])
    ? next
    : STATS_DEFAULT_PAGE_SIZE;
}

export function useStatsState(initialPageSize: number = STATS_DEFAULT_PAGE_SIZE) {
  const querySync = useQuerySync('uebersicht');

  const [pageSize, setPageSizeState] = useState(() => sanitizePageSize(initialPageSize));
  const [metricFilter, setMetricFilter] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    try {
      setShowWelcome(shouldShowWelcome(localStorage));
    } catch {
      // Unkritisch: localStorage kann blockiert sein.
    }
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(sanitizePageSize(Number(next)));
  }, []);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    try {
      localStorage.setItem(WELCOME_DISMISS_KEY, String(Date.now()));
      localStorage.removeItem(WELCOME_DISMISS_LEGACY_KEY);
    } catch {
      // Unkritisch: localStorage kann blockiert sein.
    }
  }, []);

  const showPageSize = useMemo(
    () => querySync.activeTab === 'king' || querySync.activeTab === 'ranglisten',
    [querySync.activeTab],
  );

  return {
    activeTab: querySync.activeTab,
    setTab: querySync.setTab,
    markScrollForRestore: querySync.markScrollForRestore,
    consumeScrollToRestore: querySync.consumeScrollToRestore,
    pageSize,
    setPageSize,
    metricFilter,
    setMetricFilter,
    showWelcome,
    dismissWelcome,
    showPageSize,
  };
}
