import { useCallback, useEffect, useRef, useState } from 'react';

import type { TabKey } from '../types-ui';

function parseHashTab(): TabKey | null {
  const hash = String(window.location.hash || '')
    .replace('#', '')
    .trim();
  if (hash === 'king' || hash === 'ranglisten' || hash === 'versus' || hash === 'uebersicht') {
    return hash;
  }
  return null;
}

export function useQuerySync(defaultTab: TabKey = 'uebersicht') {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const scrollRestoreRef = useRef<number | null>(null);

  useEffect(() => {
    const hashTab = parseHashTab();
    if (hashTab) setActiveTab(hashTab);
  }, []);

  const setTab = useCallback(
    (tab: TabKey) => {
      if (tab === activeTab) return;
      scrollRestoreRef.current = window.scrollY;
      setActiveTab(tab);
      try {
        window.history.replaceState({}, '', `#${tab}`);
      } catch {
        // Unkritisch: History-API kann blockiert sein.
      }
    },
    [activeTab],
  );

  const markScrollForRestore = useCallback(() => {
    scrollRestoreRef.current = window.scrollY;
  }, []);

  const consumeScrollToRestore = useCallback(() => {
    const y = scrollRestoreRef.current;
    if (y === null) return null;
    scrollRestoreRef.current = null;
    return y;
  }, []);

  return {
    activeTab,
    setTab,
    markScrollForRestore,
    consumeScrollToRestore,
  };
}
