import React from 'react';

export type KpiItem = {
  id: string;
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
};

export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="mg-card overflow-hidden">
      {/*
        Ziel: kein "4x einzelne Cards", sondern ein hochwertiger KPI-Strip mit Dividern.
        Passt optisch besser in den neuen Layout-Rhythmus.
      */}
      <div className="divide-border grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.id} className="p-4 sm:p-5">
            <p className="text-muted text-xs font-semibold">{it.label}</p>
            <p className="text-fg mt-2 text-2xl font-semibold tracking-tight">{it.value}</p>
            {it.meta ? <p className="text-muted mt-2 text-xs">{it.meta}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
