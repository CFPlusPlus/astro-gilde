import { describe, expect, it } from 'vitest';

import { formatLocalDateTime } from './format';

describe('stats-core/format', () => {
  it('formats UTC ISO timestamps as a local german date-time', () => {
    const formatted = formatLocalDateTime('2026-05-13T12:00:00Z');

    expect(formatted).not.toBe('2026-05-13T12:00:00Z');
    expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('keeps invalid timestamps unchanged', () => {
    expect(formatLocalDateTime('kein-datum')).toBe('kein-datum');
  });
});
