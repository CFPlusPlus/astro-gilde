import type { MetricDef } from './types';

export function fmtDateBerlin(iso: string): string {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Berlin',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function fmtNumber(value: number, decimals = 0): string {
  try {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return String(value);
  }
}

export function formatMetricValue(value: number, def?: MetricDef): string {
  const unit = def?.unit || '';

  // decimals aus metric_def – falls nicht gesetzt: heuristische Defaults
  let dec = def?.decimals;
  if (dec === null || dec === undefined) {
    if (unit === 'h' || unit === 'km') dec = 2;
    else dec = 0;
  }

  return unit ? `${fmtNumber(value, dec)} ${unit}` : fmtNumber(value, dec);
}

export function rankMedal(rank: number): string | null {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}
