const LOCALE_DE = 'de-DE';
const BERLIN_TZ = 'Europe/Berlin';
const ISO_LOCALE = 'en-CA';

const BERLIN_DATE_TIME_PARTS = new Intl.DateTimeFormat(ISO_LOCALE, {
  timeZone: BERLIN_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const BERLIN_OFFSET_PARTS = new Intl.DateTimeFormat(ISO_LOCALE, {
  timeZone: BERLIN_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
});

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

function normalizeOffset(value: string): string {
  const cleaned = value.trim().replace(/^GMT/i, '');
  if (/^[+-]\d{2}:\d{2}$/.test(cleaned)) return cleaned;
  if (/^[+-]\d{1,2}$/.test(cleaned)) {
    const sign = cleaned.startsWith('-') ? '-' : '+';
    const hours = cleaned.slice(1).padStart(2, '0');
    return `${sign}${hours}:00`;
  }
  if (/^[+-]\d{3,4}$/.test(cleaned)) {
    const sign = cleaned.startsWith('-') ? '-' : '+';
    const digits = cleaned.slice(1).padStart(4, '0');
    return `${sign}${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
  return '+00:00';
}

export function formatBerlinDateTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return iso;

    const dateTimeParts = BERLIN_DATE_TIME_PARTS.formatToParts(date);
    const year = readPart(dateTimeParts, 'year');
    const month = readPart(dateTimeParts, 'month');
    const day = readPart(dateTimeParts, 'day');
    const hour = readPart(dateTimeParts, 'hour');
    const minute = readPart(dateTimeParts, 'minute');
    const second = readPart(dateTimeParts, 'second');

    if (!year || !month || !day || !hour || !minute || !second) return iso;

    const offsetParts = BERLIN_OFFSET_PARTS.formatToParts(date);
    const timeZoneName = readPart(offsetParts, 'timeZoneName');
    const offset = normalizeOffset(timeZoneName);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
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
