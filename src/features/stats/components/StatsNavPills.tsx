import React from 'react';
import type { TabKey } from '../types-ui';

export function StatsNavPills({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const items: { key: TabKey; label: string }[] = [
    { key: 'uebersicht', label: 'Übersicht' },
    { key: 'king', label: 'Server-König' },
    { key: 'ranglisten', label: 'Ranglisten' },
    { key: 'versus', label: 'Versus' },
  ];

  return (
    <nav aria-label="Statistik Navigation">
      <div className="border-border bg-surface/70 md:bg-surface/55 overflow-x-auto rounded-[var(--radius)] border px-3 py-2">
        <ul className="flex w-max items-center gap-1" role="list">
          {items.map((it) => {
            const isActive = it.key === active;
            return (
              <li key={it.key}>
                <button
                  type="button"
                  onClick={() => onChange(it.key)}
                  className={[
                    'focus-visible:ring-offset-bg inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-surface/55 text-fg'
                      : 'text-fg/85 hover:text-fg hover:bg-surface/50',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {it.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
