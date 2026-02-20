import { describe, expect, it } from 'vitest';

import { normalizeUmlauts } from './normalizeUmlauts';

describe('normalizeUmlauts', () => {
  it('replaces common umlaut transcriptions after consonants', () => {
    expect(normalizeUmlauts('fuer Oel Aepfel')).toBe('für Öl Äpfel');
    expect(normalizeUmlauts('Muenchen')).toBe('München');
  });

  it('keeps vowel combinations untouched', () => {
    expect(normalizeUmlauts('Spieldauer')).toBe('Spieldauer');
    expect(normalizeUmlauts('blaue Wolle')).toBe('blaue Wolle');
    expect(normalizeUmlauts('Treue')).toBe('Treue');
  });
});
