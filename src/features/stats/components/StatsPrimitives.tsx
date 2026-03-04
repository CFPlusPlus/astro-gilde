import React from 'react';
import { Info } from 'lucide-react';

/**
 * Kleine UI-Helfer fuer die Statistik-Seite.
 * Hinweis: Wir nutzen bewusst die vorhandenen Surface-Hilfsklassen (mg-surface-2, mg-notice, ...).
 */

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="mg-app-chip text-muted inline-flex items-center px-3 py-1 text-xs font-medium backdrop-blur-md">
      {children}
    </span>
  );
}

export function ApiAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mg-notice" data-variant="warning" role="alert">
      <span
        className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
        aria-hidden="true"
      >
        <Info size={14} />
      </span>
      <span className="text-fg/90">{message}</span>
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="space-y-2">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {subtitle ? <p className="text-muted text-sm leading-relaxed">{subtitle}</p> : null}
    </header>
  );
}
