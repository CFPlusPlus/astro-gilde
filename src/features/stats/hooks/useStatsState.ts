import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { STATS_DEFAULT_PAGE_SIZE, STATS_PAGE_SIZES } from '../constants';
import { WELCOME_DISMISS_KEY, WELCOME_DISMISS_LEGACY_KEY, shouldShowWelcome } from '../welcome';
import type { TabKey } from '../types-ui';

function sanitizePageSize(next: number): number {
  return STATS_PAGE_SIZES.includes(next as (typeof STATS_PAGE_SIZES)[number])
    ? next
    : STATS_DEFAULT_PAGE_SIZE;
}

export function useStatsState({
  initialPageSize = STATS_DEFAULT_PAGE_SIZE,
  initialTab = 'uebersicht',
}: {
  initialPageSize?: number;
  initialTab?: TabKey;
} = {}) {
  const scrollRestoreRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

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

  const setTab = useCallback((tab: TabKey) => {
    setActiveTab((current) => {
      if (current === tab) return current;
      scrollRestoreRef.current = window.scrollY;
      return tab;
    });
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(sanitizePageSize(Number(next)));
  }, []);

  const markScrollForRestore = useCallback(() => {
    scrollRestoreRef.current = window.scrollY;
  }, []);

  const consumeScrollToRestore = useCallback(() => {
    const y = scrollRestoreRef.current;
    if (y === null) return null;
    scrollRestoreRef.current = null;
    return y;
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
    () => activeTab === 'king' || activeTab === 'ranglisten',
    [activeTab],
  );

  return {
    activeTab,
    setTab,
    markScrollForRestore,
    consumeScrollToRestore,
    pageSize,
    setPageSize,
    metricFilter,
    setMetricFilter,
    showWelcome,
    dismissWelcome,
    showPageSize,
  };
}
