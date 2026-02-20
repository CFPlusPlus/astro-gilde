import React from 'react';
import { Crown, ListOrdered, Sparkles, Swords } from 'lucide-react';
import type { TabKey } from '../types-ui';

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

  return (
    <nav aria-label="Statistik Navigation">
      <div
        className={[
          layout === 'one-row' ? 'px-1 py-1' : 'overflow-x-auto px-3 py-2',
          surface ? 'mg-surface-2' : 'bg-surface-solid/35 rounded-[var(--radius)]',
        ].join(' ')}
      >
        <ul
          className={
            layout === 'one-row' ? 'grid grid-cols-4 gap-2' : 'flex w-max items-center gap-1'
          }
          role="list"
        >
          {items.map((it) => {
            const isActive = it.key === active;
            const Icon = it.Icon;
            return (
              <li key={it.key} className={layout === 'one-row' ? 'min-w-0' : undefined}>
                <button
                  type="button"
                  onClick={() => onChange(it.key)}
                  disabled={disabled}
                  className={[
                    layout === 'one-row'
                      ? 'focus-visible:ring-offset-bg inline-flex min-h-11 w-full items-center gap-2 rounded-[0.8rem] border px-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm'
                      : 'focus-visible:ring-offset-bg inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    isActive
                      ? layout === 'one-row'
                        ? 'bg-accent/14 border-accent/45 text-fg shadow-sm'
                        : 'bg-accent/15 border-accent/40 text-fg shadow-sm'
                      : layout === 'one-row'
                        ? 'bg-surface-solid/20 text-fg/88 border-border/80 hover:text-fg hover:border-accent/40 hover:bg-surface-solid/35'
                        : 'text-fg/85 hover:text-fg hover:bg-surface/50 border-transparent',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                  aria-disabled={disabled ? 'true' : undefined}
                >
                  <Icon
                    size={16}
                    className={['shrink-0', isActive ? 'text-accent' : 'text-muted'].join(' ')}
                  />
                  <span className={layout === 'one-row' ? 'truncate leading-tight' : undefined}>
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
