import React from 'react';

export type KpiItem = {
  id: string;
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
};

type KpiStripVariant = 'card' | 'inline';

export function KpiStrip({
  items,
  variant = 'card',
}: {
  items: KpiItem[];
  variant?: KpiStripVariant;
}) {
  const isInline = variant === 'inline';

  return (
    <div
      className={isInline ? 'border-border/70 overflow-hidden border-y' : 'mg-card overflow-hidden'}
    >
      {/*
        Ziel: kein "4x einzelne Cards", sondern ein hochwertiger KPI-Strip mit Dividern.
        Passt optisch besser in den neuen Layout-Rhythmus.
      */}
      <div className="divide-border grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.id} className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              {it.icon ? (
                <span
                  className={
                    isInline
                      ? 'text-accent inline-flex h-7 w-7 items-center justify-center'
                      : 'bg-accent/15 text-accent inline-flex h-8 w-8 items-center justify-center rounded-xl'
                  }
                >
                  {it.icon}
                </span>
              ) : null}
              <p className="text-muted text-xs font-semibold">{it.label}</p>
            </div>
            <p className="text-fg mt-2 text-2xl font-semibold tracking-tight">{it.value}</p>
            {it.meta ? <p className="text-muted mt-2 text-xs">{it.meta}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
