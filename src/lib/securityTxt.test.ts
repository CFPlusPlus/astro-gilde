import { describe, expect, it } from 'vitest';

import {
  buildSecurityTxt,
  buildSecurityTxtCanonicalUrl,
  buildSecurityTxtExpires,
} from './securityTxt';

describe('securityTxt', () => {
  it('baut die kanonische URL auf die offizielle security.txt', () => {
    expect(buildSecurityTxtCanonicalUrl()).toBe(
      'https://minecraft-gilde.de/.well-known/security.txt',
    );
  });

  it('setzt Expires standardmaessig neun Monate in die Zukunft', () => {
    expect(buildSecurityTxtExpires(new Date('2026-04-18T08:15:00.000Z'))).toBe(
      '2027-01-18T08:15:00.000Z',
    );
  });

  it('rendert die erforderlichen Kernfelder RFC-konform', () => {
    expect(
      buildSecurityTxt({
        contactEmail: 'webmaster@minecraft-gilde.de',
        canonicalUrl: 'https://minecraft-gilde.de/.well-known/security.txt',
        preferredLanguages: ['de', 'en'],
        expiresAt: '2027-01-18T08:15:00.000Z',
      }),
    ).toBe(
      [
        'Contact: mailto:webmaster@minecraft-gilde.de',
        'Canonical: https://minecraft-gilde.de/.well-known/security.txt',
        'Preferred-Languages: de, en',
        'Expires: 2027-01-18T08:15:00.000Z',
      ].join('\n') + '\n',
    );
  });
});
