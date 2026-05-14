import { Clock3 } from 'lucide-react';
import { LIVE_COPY_DE } from '../../../lib/live/copy.de';
import { formatLastUpdatedAbsolute } from '../../../lib/live/lastUpdated';
import { formatLocalDateTime } from '../../stats-core/format';

export type LiveBadgeVariant = 'ok' | 'stale' | 'rate_limit' | 'error';

const LABEL_BY_VARIANT: Record<LiveBadgeVariant, string> = {
  ok: LIVE_COPY_DE.ok_badge,
  stale: LIVE_COPY_DE.stale_badge,
  rate_limit: LIVE_COPY_DE.rate_limit_badge,
  error: LIVE_COPY_DE.error_badge,
};

const A11Y_TEXT_BY_VARIANT: Record<LiveBadgeVariant, string> = {
  ok: LIVE_COPY_DE.ok_status_a11y,
  stale: LIVE_COPY_DE.stale_status_a11y,
  rate_limit: LIVE_COPY_DE.rate_limit_status_a11y,
  error: LIVE_COPY_DE.error_status_a11y,
};

const TONE_BY_VARIANT: Record<LiveBadgeVariant, string> = {
  ok: 'bg-surface border-border text-muted',
  stale: 'bg-surface border-border text-muted',
  rate_limit: 'bg-accent/12 border-accent/35 text-fg/85',
  error: 'bg-surface-solid/55 border-border text-muted',
};

export function LiveBadge({
  variant,
  showStaleIcon = true,
  updatedAt = null,
  generatedIso = null,
}: {
  variant: LiveBadgeVariant;
  showStaleIcon?: boolean;
  updatedAt?: number | null;
  generatedIso?: string | null;
}) {
  const label = LABEL_BY_VARIANT[variant];
  const tone = TONE_BY_VARIANT[variant];
  const statusTitle =
    variant === 'ok'
      ? typeof generatedIso === 'string' && generatedIso
        ? `Stand: ${formatLocalDateTime(generatedIso)}`
        : typeof updatedAt === 'number'
          ? `Stand: ${formatLastUpdatedAbsolute(updatedAt)}`
          : undefined
      : undefined;

  return (
    <span
      className={[
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold tracking-[0.08em] uppercase',
        tone,
      ].join(' ')}
      aria-hidden="true"
      title={statusTitle}
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
  updatedAt = null,
  generatedIso = null,
}: {
  variant: LiveBadgeVariant | null;
  className?: string;
  showStaleIcon?: boolean;
  updatedAt?: number | null;
  generatedIso?: string | null;
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
          <LiveBadge
            variant={variant}
            showStaleIcon={showStaleIcon}
            updatedAt={updatedAt}
            generatedIso={generatedIso}
          />
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
