import React from 'react';
import { Crown, ListOrdered, Sparkles, Swords } from 'lucide-react';
import type { TabKey } from '../types-ui';

export function StatsNavPills({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const items: {
    key: TabKey;
    label: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>;
  }[] = [
    { key: 'uebersicht', label: 'Übersicht', Icon: Sparkles },
    { key: 'king', label: 'Server-König', Icon: Crown },
    { key: 'ranglisten', label: 'Ranglisten', Icon: ListOrdered },
    { key: 'versus', label: 'Versus', Icon: Swords },
  ];

  return (
    <nav aria-label="Statistik Navigation">
      <div className="border-border bg-surface/70 md:bg-surface/55 overflow-x-auto rounded-[var(--radius)] border px-3 py-2">
        <ul className="flex w-max items-center gap-1" role="list">
          {items.map((it) => {
            const isActive = it.key === active;
            const Icon = it.Icon;
            return (
              <li key={it.key}>
                <button
                  type="button"
                  onClick={() => onChange(it.key)}
                  className={[
                    'focus-visible:ring-offset-bg inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-accent/15 border-accent/40 text-fg shadow-sm'
                      : 'text-fg/85 hover:text-fg hover:bg-surface/50 border-transparent',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={16} className={isActive ? 'text-accent' : 'text-muted'} />
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
