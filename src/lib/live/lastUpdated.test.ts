import { describe, expect, it } from 'vitest';

import {
  formatLastUpdatedAbsolute,
  formatLastUpdatedLabel,
  formatLastUpdatedRelative,
  resolveLastUpdatedTimestamp,
} from './lastUpdated';

describe('live/lastUpdated', () => {
  it('prefers updatedAt over fetchedAt', () => {
    expect(resolveLastUpdatedTimestamp({ updatedAt: 200, fetchedAt: 100 })).toBe(200);
  });

  it('falls back to fetchedAt when updatedAt is missing', () => {
    expect(resolveLastUpdatedTimestamp({ fetchedAt: 100 })).toBe(100);
  });

  it('returns null when no timestamp is present', () => {
    expect(resolveLastUpdatedTimestamp({})).toBeNull();
  });

  it('formats relative time without seconds', () => {
    const now = 10 * 60_000;

    expect(formatLastUpdatedRelative(now, now)).toBe('gerade eben');
    expect(formatLastUpdatedRelative(now - 59_999, now)).toBe('gerade eben');
    expect(formatLastUpdatedRelative(now - 60_000, now)).toBe('vor 1 Min');
    expect(formatLastUpdatedRelative(now - 59 * 60_000, now)).toBe('vor 59 Min');
    expect(formatLastUpdatedRelative(now - 60 * 60_000, now)).toBe('vor 1 Std');
    expect(formatLastUpdatedRelative(now - 23 * 60 * 60_000, now)).toBe('vor 23 Std');
    expect(formatLastUpdatedRelative(now - 24 * 60 * 60_000, now)).toBe('vor 1 Tag');
  });

  it('formats absolute timestamp in german date-time style', () => {
    const absolute = formatLastUpdatedAbsolute(Date.UTC(2026, 1, 19, 10, 24));
    expect(absolute).toMatch(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
  });

  it('builds a full last-updated label', () => {
    const now = 15 * 60_000;
    const label = formatLastUpdatedLabel(now - 5 * 60_000, now);
    expect(label).toBe('Zuletzt aktualisiert vor 5 Min');
  });
});
