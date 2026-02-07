const LOCALE_DE = 'de-DE';
const BERLIN_TZ = 'Europe/Berlin';

export function formatBerlinDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(LOCALE_DE, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: BERLIN_TZ,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDeNumber(value: number, decimals = 0): string {
  try {
    return new Intl.NumberFormat(LOCALE_DE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return String(value);
  }
}

export function formatDeNumber2(value: number): string {
  return formatDeNumber(value, 2);
}
