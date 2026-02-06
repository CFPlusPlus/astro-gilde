import React from 'react';
import { ChevronDown, ChevronsUpDown, ChevronUp, SearchX } from 'lucide-react';

import type { SortDir } from './table-model';

export function fmtGenerated(iso: string) {
  try {
    const fmt = new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Berlin',
    });
    return `Stand: ${fmt.format(new Date(iso))}`;
  } catch {
    return `Stand: ${iso}`;
  }
}

export function ApiAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="bg-accent/10 border-accent/40 mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm"
      role="alert"
    >
      <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" aria-hidden="true" />
      <span className="text-fg/90">{message}</span>
    </div>
  );
}

export function NoResults() {
  return (
    <div className="bg-accent/10 border-accent/40 mt-3 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm shadow-sm">
      <SearchX size={18} className="text-accent mt-0.5 flex-none" aria-hidden="true" />
      <span className="text-fg/90">Keine Ergebnisse gefunden.</span>
    </div>
  );
}

export function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ChevronUp size={14} className="text-muted" aria-hidden="true" />;
  if (dir === 'desc') return <ChevronDown size={14} className="text-muted" aria-hidden="true" />;
  return <ChevronsUpDown size={14} className="text-muted" aria-hidden="true" />;
}
