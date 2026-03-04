import React from 'react';
import { Crown, ListOrdered, Sparkles, Swords } from 'lucide-react';
import type { TabKey } from '../types-ui';

const STATS_TAB_ORDER: readonly TabKey[] = ['uebersicht', 'king', 'ranglisten', 'versus'];

export function getStatsTabId(tab: TabKey): string {
  return `stats-tab-${tab}`;
}

export function getStatsPanelId(tab: TabKey): string {
  return `stats-panel-${tab}`;
}

export function StatsNavPills({
  active,
  onChange,
  disabled = false,
  surface = true,
  layout = 'scroll',
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  disabled?: boolean;
  surface?: boolean;
  layout?: 'scroll' | 'one-row';
}) {
  const items: {
    key: TabKey;
    label: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>;
  }[] = [
    { key: 'uebersicht', label: '\u00dcbersicht', Icon: Sparkles },
    { key: 'king', label: 'Server-K\u00f6nig', Icon: Crown },
    { key: 'ranglisten', label: 'Ranglisten', Icon: ListOrdered },
    { key: 'versus', label: 'Versus', Icon: Swords },
  ];
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const orderedItems = STATS_TAB_ORDER.map((key) => items.find((item) => item.key === key)).filter(
    (item): item is (typeof items)[number] => Boolean(item),
  );
  const isOneRow = layout === 'one-row';

  const focusTabAtIndex = (index: number): void => {
    const nextTab = orderedItems[index];
    if (!nextTab) return;
    tabRefs.current[index]?.focus();
    onChange(nextTab.key);
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (disabled) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusTabAtIndex((index + 1) % orderedItems.length);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusTabAtIndex((index - 1 + orderedItems.length) % orderedItems.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusTabAtIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusTabAtIndex(orderedItems.length - 1);
    }
  };

  return (
    <nav aria-label="Statistik Navigation" className={isOneRow ? 'min-w-0' : undefined}>
      <div
        className={[
          isOneRow
            ? surface
              ? 'border-border/70 rounded-[var(--radius)] border px-1 py-1'
              : 'min-w-0'
            : 'mg-scrollbar overflow-x-auto px-3 py-2',
          isOneRow ? '' : surface ? 'mg-surface-2' : 'bg-surface-solid/35 rounded-[var(--radius)]',
        ].join(' ')}
      >
        <ul
          className={
            isOneRow
              ? 'grid grid-cols-2 gap-1 sm:grid-cols-4 sm:items-center'
              : 'flex w-max items-center gap-1'
          }
          role="tablist"
          aria-orientation="horizontal"
        >
          {orderedItems.map((it, index) => {
            const isActive = it.key === active;
            const Icon = it.Icon;
            return (
              <li key={it.key} className={layout === 'one-row' ? 'min-w-0' : undefined}>
                <button
                  id={getStatsTabId(it.key)}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={getStatsPanelId(it.key)}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onChange(it.key)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  disabled={disabled}
                  className={[
                    isOneRow
                      ? 'focus-visible:ring-offset-bg relative flex w-full min-w-0 items-center gap-2 rounded-[0.7rem] border border-transparent px-3 py-2.5 text-sm leading-tight font-semibold transition-colors after:pointer-events-none after:absolute after:bottom-0 after:hidden after:h-0.5 after:rounded-full focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:justify-center sm:rounded-[0.7rem] sm:px-2.5 sm:text-sm sm:after:inset-x-3 sm:after:block'
                      : 'focus-visible:ring-offset-bg inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                    isActive
                      ? isOneRow
                        ? 'text-fg border-border/75 bg-surface-solid/32 sm:after:bg-accent'
                        : 'bg-accent/15 border-accent/40 text-fg shadow-sm'
                      : isOneRow
                        ? 'text-fg/75 hover:text-fg hover:bg-surface-solid/22 sm:after:bg-transparent'
                        : 'text-fg/85 hover:text-fg hover:bg-surface/50 border-transparent',
                  ].join(' ')}
                >
                  <Icon
                    size={16}
                    className={['shrink-0', isActive ? 'text-accent' : 'text-muted'].join(' ')}
                  />
                  <span className={isOneRow ? 'min-w-0 text-left sm:text-center' : undefined}>
                    {it.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
