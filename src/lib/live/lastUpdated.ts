export interface LastUpdatedSource {
  updatedAt?: number | null;
  fetchedAt?: number | null;
}

const ABSOLUTE_DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const isTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const resolveLastUpdatedTimestamp = (source: LastUpdatedSource): number | null => {
  if (isTimestamp(source.updatedAt)) return source.updatedAt;
  if (isTimestamp(source.fetchedAt)) return source.fetchedAt;
  return null;
};

export const formatLastUpdatedRelative = (timestamp: number, now = Date.now()): string => {
  const diffMs = Math.max(0, now - timestamp);
  if (diffMs < 60_000) return 'gerade eben';

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `vor ${diffMinutes} Min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `vor ${diffHours} Std`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'vor 1 Tag';
  return `vor ${diffDays} Tagen`;
};

export const formatLastUpdatedAbsolute = (timestamp: number): string =>
  ABSOLUTE_DATE_FORMATTER.format(new Date(timestamp));

export const formatLastUpdatedLabel = (timestamp: number, now = Date.now()): string =>
  `Zuletzt aktualisiert ${formatLastUpdatedRelative(timestamp, now)}`;
