import React from 'react';
import { ChevronDown, ChevronsUpDown, ChevronUp, SearchX } from 'lucide-react';

import { formatBerlinDateTime } from '../stats-core/format';
import type { SortDir } from './table-model';

export function fmtGenerated(iso: string) {
  return `Stand: ${formatBerlinDateTime(iso)}`;
}

export function DataSurface({
  header,
  content,
  footer,
}: {
  header?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="mg-surface-2">
      <div className="divide-border/70 flex flex-col divide-y">
        {header ? (
          <header className="flex items-center justify-between gap-2 px-4 py-3">{header}</header>
        ) : null}
        {content ? <div>{content}</div> : null}
        {footer ? <footer className="text-muted px-4 py-3 text-sm">{footer}</footer> : null}
      </div>
    </section>
  );
}

export function NoResults({ className = 'mt-3' }: { className?: string }) {
  return (
    <div className={['mg-notice', className].filter(Boolean).join(' ')} data-variant="warning">
      <SearchX size={18} className="text-accent mt-0.5 flex-none" aria-hidden="true" />
      <span className="text-fg/90">Keine Ergebnisse gefunden.</span>
    </div>
  );
}

export function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ChevronUp size={14} className="text-accent" aria-hidden="true" />;
  if (dir === 'desc') return <ChevronDown size={14} className="text-accent" aria-hidden="true" />;
  return <ChevronsUpDown size={14} className="text-muted" aria-hidden="true" />;
}
