const LOCALE_DE = 'de-DE';

const LOCAL_DATE_TIME_FORMATTER = new Intl.DateTimeFormat(LOCALE_DE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
  hour12: false,
});

export function formatLocalDateTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return iso;

    return LOCAL_DATE_TIME_FORMATTER.format(date);
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
