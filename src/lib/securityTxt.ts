import { site } from '../config/site';

const SECURITY_TXT_PATH = '/.well-known/security.txt';
const DEFAULT_EXPIRES_IN_MONTHS = 9;

export const buildSecurityTxtCanonicalUrl = (): string =>
  new URL(SECURITY_TXT_PATH, site).toString();

export const buildSecurityTxtExpires = (
  now: Date = new Date(),
  expiresInMonths: number = DEFAULT_EXPIRES_IN_MONTHS,
): string => {
  const expiresAt = new Date(now);
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + expiresInMonths);
  return expiresAt.toISOString();
};

export const buildSecurityTxt = (args: {
  contactEmail: string;
  canonicalUrl?: string;
  preferredLanguages?: string[];
  expiresAt?: string;
}): string => {
  const {
    contactEmail,
    canonicalUrl = buildSecurityTxtCanonicalUrl(),
    preferredLanguages = ['de', 'en'],
    expiresAt = buildSecurityTxtExpires(),
  } = args;

  return (
    [
      `Contact: mailto:${contactEmail}`,
      `Canonical: ${canonicalUrl}`,
      `Preferred-Languages: ${preferredLanguages.join(', ')}`,
      `Expires: ${expiresAt}`,
    ].join('\n') + '\n'
  );
};
