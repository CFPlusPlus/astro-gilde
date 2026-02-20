import { LIVE_COPY_DE } from './copy.de';

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
  if (diffMs < 60_000) return LIVE_COPY_DE.last_updated_just_now;

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return LIVE_COPY_DE.last_updated_minutes(diffMinutes);

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return LIVE_COPY_DE.last_updated_hours(diffHours);

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return LIVE_COPY_DE.last_updated_day_one;
  return LIVE_COPY_DE.last_updated_days(diffDays);
};

export const formatLastUpdatedAbsolute = (timestamp: number): string =>
  ABSOLUTE_DATE_FORMATTER.format(new Date(timestamp));

export const formatLastUpdatedLabel = (timestamp: number, now = Date.now()): string =>
  LIVE_COPY_DE.last_updated_with_relative(formatLastUpdatedRelative(timestamp, now));
