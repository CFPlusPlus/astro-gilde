import React from 'react';
import type { LiveDataStatus } from '../../../lib/live/types';

export type StatValueState = LiveDataStatus;

export function StatValue({
  state,
  value,
  label,
  hint,
  onRetry,
  className,
  valueClassName,
}: {
  state: StatValueState;
  value?: React.ReactNode;
  label: string;
  hint?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
  valueClassName?: string;
}) {
  const resolvedValueClassName = valueClassName || 'text-fg text-2xl font-semibold tracking-tight';

  if (state === 'loading') {
    return (
      <div className={className}>
        <span
          className="bg-surface-solid/45 inline-block h-8 w-24 animate-pulse rounded-md"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={className}>
        <p className="text-fg text-lg leading-tight font-semibold">
          Daten konnten nicht geladen werden
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {onRetry ? (
            <button type="button" onClick={onRetry} className="mg-btn mg-btn--xs mg-btn--surface">
              Erneut laden
            </button>
          ) : null}
          {hint ? <p className="text-muted text-xs">{hint}</p> : null}
        </div>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className={className}>
        <p className="text-fg text-lg leading-tight font-semibold">Noch keine Daten verfuegbar</p>
        <p className="text-muted mt-1 text-xs">
          {hint || 'Diese Kennzahl wurde bisher nicht vom Server geliefert.'}
        </p>
      </div>
    );
  }

  if (state === 'stale') {
    return (
      <div className={className}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={resolvedValueClassName}>{value}</span>
          <span className="bg-surface border-border text-muted inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase">
            veraltet
          </span>
        </div>
        <p className="text-muted mt-1 text-xs">
          {hint || `${label} zeigt den letzten erfolgreich geladenen Stand.`}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <span className={resolvedValueClassName}>{value}</span>
      {hint ? <p className="text-muted mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}
