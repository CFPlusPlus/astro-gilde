import React from 'react';

import { getStatsPanelId, getStatsTabId } from '../../components/StatsNavPills';
import type { TabKey } from '../../types-ui';

const MOBILE_TAB_ORDER: readonly TabKey[] = ['uebersicht', 'king', 'ranglisten', 'versus'];

const MOBILE_TAB_LABELS: Record<TabKey, string> = {
  uebersicht: '\u00dcbersicht',
  king: 'Server-K\u00f6nig',
  ranglisten: 'Ranglisten',
  versus: 'Versus',
};

export function StatsTabsScroller({
  activeTab,
  onTabChange,
  disabled = false,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  disabled?: boolean;
}) {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const focusTabAtIndex = (index: number): void => {
    const nextTab = MOBILE_TAB_ORDER[index];
    if (!nextTab) return;
    tabRefs.current[index]?.focus();
    onTabChange(nextTab);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (disabled) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusTabAtIndex((index + 1) % MOBILE_TAB_ORDER.length);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusTabAtIndex((index - 1 + MOBILE_TAB_ORDER.length) % MOBILE_TAB_ORDER.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusTabAtIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusTabAtIndex(MOBILE_TAB_ORDER.length - 1);
    }
  };

  return (
    <nav
      aria-label="Statistik Navigation"
      className="min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul
        className="flex w-max items-center gap-1 pr-1"
        role="tablist"
        aria-orientation="horizontal"
      >
        {MOBILE_TAB_ORDER.map((tab, index) => {
          const isActive = tab === activeTab;

          return (
            <li key={tab}>
              <button
                id={getStatsTabId(tab)}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={getStatsPanelId(tab)}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onTabChange(tab)}
                onKeyDown={(event) => onKeyDown(event, index)}
                disabled={disabled}
                className={[
                  'focus-visible:ring-offset-bg inline-flex min-h-10 shrink-0 snap-start items-center rounded-full border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                  isActive
                    ? 'bg-accent/14 border-accent/45 text-fg shadow-sm'
                    : 'bg-surface-solid/20 border-border/75 text-fg/80 hover:bg-surface-solid/32 hover:border-border hover:text-fg/95',
                ].join(' ')}
              >
                {MOBILE_TAB_LABELS[tab]}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
