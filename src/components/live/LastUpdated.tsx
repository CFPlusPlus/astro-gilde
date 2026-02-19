import { useEffect, useMemo, useState } from 'react';

import {
  formatLastUpdatedAbsolute,
  formatLastUpdatedLabel,
  resolveLastUpdatedTimestamp,
} from '../../lib/live/lastUpdated';

const DEFAULT_REFRESH_MS = 30_000;

export function LastUpdated({
  updatedAt,
  fetchedAt,
  className = 'text-muted text-xs',
  fallbackText = 'Zuletzt aktualisiert',
  refreshMs = DEFAULT_REFRESH_MS,
  showWhenMissing = true,
}: {
  updatedAt?: number | null;
  fetchedAt?: number | null;
  className?: string;
  fallbackText?: string;
  refreshMs?: number;
  showWhenMissing?: boolean;
}) {
  const timestamp = useMemo(
    () =>
      resolveLastUpdatedTimestamp({
        updatedAt,
        fetchedAt,
      }),
    [fetchedAt, updatedAt],
  );
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (timestamp == null) {
      setNow(null);
      return;
    }

    const tick = (): void => {
      setNow(Date.now());
    };

    tick();
    const timer = window.setInterval(tick, refreshMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [refreshMs, timestamp]);

  if (timestamp == null) {
    if (!showWhenMissing) return null;
    return (
      <p className={className} suppressHydrationWarning>
        {fallbackText}
      </p>
    );
  }

  const absolute = formatLastUpdatedAbsolute(timestamp);
  const text = now == null ? fallbackText : formatLastUpdatedLabel(timestamp, now);

  return (
    <p
      className={className}
      title={absolute}
      aria-label={`${text}. ${absolute}`}
      suppressHydrationWarning
    >
      {text}
    </p>
  );
}
