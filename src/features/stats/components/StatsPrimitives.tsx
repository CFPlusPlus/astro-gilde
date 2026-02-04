import React from 'react';

/**
 * Kleine UI-Helfer für die Statistik-Seite.
 * Hinweis: Wir nutzen bewusst die vorhandenen Tokens/Utilities (mg-card, bg-surface, border-border, ...).
 */

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-surface border-border text-muted inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md">
      {children}
    </span>
  );
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

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="space-y-2">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {subtitle ? <p className="text-muted text-sm leading-relaxed">{subtitle}</p> : null}
    </header>
  );
}
