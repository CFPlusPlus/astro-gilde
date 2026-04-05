import React from 'react';
import { CircleAlert } from 'lucide-react';

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

export function Notice({
  children,
  variant = 'neutral',
  role = 'status',
  icon,
  iconPosition,
  className,
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'warning';
  role?: 'status' | 'alert';
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  className?: string;
}) {
  const resolvedIconPosition = iconPosition ?? (variant === 'warning' ? 'start' : 'end');

  return (
    <div
      className={['mg-notice', className].filter(Boolean).join(' ')}
      data-variant={variant}
      role={role}
    >
      {icon && resolvedIconPosition === 'start' ? (
        <span className="mg-notice__icon mg-notice__icon--start" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="mg-notice__content">{children}</div>
      {icon && resolvedIconPosition === 'end' ? (
        <span className="mg-notice__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </div>
  );
}

export function ApiAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Notice variant="warning" role="alert" icon={<CircleAlert size={16} />}>
      {message}
    </Notice>
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
