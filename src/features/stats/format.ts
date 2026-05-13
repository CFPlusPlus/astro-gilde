import { formatDeNumber, formatLocalDateTime } from '../stats-core/format';
import type { MetricDef } from './types';

export function fmtDateLocal(iso: string): string {
  return formatLocalDateTime(iso);
}

export function fmtNumber(value: number, decimals = 0): string {
  return formatDeNumber(value, decimals);
}

export function formatMetricValue(value: number, def?: MetricDef): string {
  const unit = def?.unit || '';

  // Nachkommastellen aus metric_def; sonst Standard-Heuristik.
  let dec = def?.decimals;
  if (dec === null || dec === undefined) {
    if (unit === 'h' || unit === 'km') dec = 2;
    else dec = 0;
  }

  return unit ? `${fmtNumber(value, dec)} ${unit}` : fmtNumber(value, dec);
}
