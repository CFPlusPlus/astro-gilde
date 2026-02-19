import { Clock3 } from 'lucide-react';

export type LiveBadgeVariant = 'stale' | 'rate_limit' | 'error';

const LABEL_BY_VARIANT: Record<LiveBadgeVariant, string> = {
  stale: 'veraltet',
  rate_limit: 'zu viele anfragen',
  error: 'nicht verfuegbar',
};

const A11Y_TEXT_BY_VARIANT: Record<LiveBadgeVariant, string> = {
  stale: 'Status: veraltet. Es wird der letzte erfolgreiche Stand angezeigt.',
  rate_limit: 'Status: zu viele Anfragen. Bitte spaeter erneut versuchen.',
  error: 'Status: nicht verfuegbar. Daten konnten nicht geladen werden.',
};

const TONE_BY_VARIANT: Record<LiveBadgeVariant, string> = {
  stale: 'bg-surface border-border text-muted',
  rate_limit: 'bg-accent/12 border-accent/35 text-fg/85',
  error: 'bg-surface-solid/55 border-border text-muted',
};

export function LiveBadge({
  variant,
  showStaleIcon = true,
}: {
  variant: LiveBadgeVariant;
  showStaleIcon?: boolean;
}) {
  const label = LABEL_BY_VARIANT[variant];
  const tone = TONE_BY_VARIANT[variant];

  return (
    <span
      className={[
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold tracking-[0.08em] uppercase',
        tone,
      ].join(' ')}
      aria-hidden="true"
    >
      {variant === 'stale' && showStaleIcon ? <Clock3 size={12} aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  );
}

export function LiveBadgeSlot({
  variant,
  className,
  showStaleIcon = true,
}: {
  variant: LiveBadgeVariant | null;
  className?: string;
  showStaleIcon?: boolean;
}) {
  return (
    <div
      className={['inline-flex min-h-6 items-center justify-end', className || ''].join(' ').trim()}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {variant ? (
        <>
          <LiveBadge variant={variant} showStaleIcon={showStaleIcon} />
          <span className="sr-only">{A11Y_TEXT_BY_VARIANT[variant]}</span>
        </>
      ) : (
        <span className="pointer-events-none opacity-0" aria-hidden="true">
          <LiveBadge variant="rate_limit" showStaleIcon={false} />
        </span>
      )}
    </div>
  );
}
