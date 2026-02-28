import React from 'react';
import { Card } from '../../ui/Card';
import { StatValue, type StatValueState } from './StatValue';

export type KpiItem = {
  id: string;
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  state?: StatValueState;
  hint?: React.ReactNode;
  onRetry?: () => void;
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

  const content = (
    <>
      {/*
        Ziel: kein "4x einzelne Cards", sondern ein hochwertiger KPI-Strip mit Dividern.
        Passt optisch besser in den neuen Layout-Rhythmus.
      */}
      <div className="divide-border grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-y-0 sm:[&>*:nth-child(even)]:border-l sm:[&>*:nth-child(even)]:border-border lg:grid-cols-4 lg:[&>*:not(:first-child)]:border-l lg:[&>*:not(:first-child)]:border-border">
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
            <StatValue
              state={it.state || 'ok'}
              value={it.value}
              label={it.label}
              hint={it.hint}
              onRetry={it.onRetry}
              className="mt-2"
            />
            {it.meta ? <p className="text-muted mt-2 text-xs">{it.meta}</p> : null}
          </div>
        ))}
      </div>
    </>
  );

  if (isInline) {
    return <div className="border-border/70 overflow-hidden border-y">{content}</div>;
  }

  return <Card className="overflow-hidden">{content}</Card>;
}
