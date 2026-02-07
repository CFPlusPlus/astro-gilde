import { useCallback, useEffect, useMemo, useState } from 'react';

import { WELCOME_DISMISS_KEY, WELCOME_DISMISS_LEGACY_KEY, shouldShowWelcome } from '../welcome';
import { useQuerySync } from './useQuerySync';

export function useStatsState() {
  const querySync = useQuerySync('uebersicht');

  const [pageSize, setPageSizeState] = useState(10);
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
    setPageSizeState(Math.max(1, Math.min(100, Number(next) || 10)));
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
