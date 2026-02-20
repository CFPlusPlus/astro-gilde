import type { LiveDataErrorKind, LiveDataStatus } from './types';

export const LIVE_COPY_DE = {
  loading: 'Lade Live-Daten ...',
  error_generic: 'Live-Daten sind aktuell nicht erreichbar. Bitte versuche es später erneut.',
  error_network: 'Netzwerkfehler beim Laden der Live-Daten.',
  error_timeout: 'Zeitlimit der Live-Abfrage erreicht.',
  rate_limit: 'Zu viele Anfragen an die Live-Datenquelle. Bitte versuche es später erneut.',
  stale_hint: 'Es wird der letzte erfolgreiche Stand angezeigt.',
  rate_limit_retry_in: (seconds: number): string => `Zu viele Anfragen - erneut in ${seconds}s`,
  retry_in: (seconds: number): string => `Erneut in ${seconds}s.`,
  retry_wait: (seconds: number): string => `Bitte warten ... erneut in ${seconds}s.`,
  retry_action: 'Neu laden',
  status_page: 'Statusseite',
  ok_badge: 'aktuell',
  stale_badge: 'veraltet',
  rate_limit_badge: 'zu viele anfragen',
  error_badge: 'nicht verfügbar',
  ok_status_a11y: 'Status: aktuell. Live-Daten sind verfügbar.',
  stale_status_a11y: 'Status: veraltet. Es wird der letzte erfolgreiche Stand angezeigt.',
  rate_limit_status_a11y: 'Status: zu viele Anfragen. Bitte später erneut versuchen.',
  error_status_a11y: 'Status: nicht verfügbar. Daten konnten nicht geladen werden.',
  error_card_title: 'Daten konnten nicht geladen werden',
  empty_card_title: 'Noch keine Daten verfügbar',
  empty_metric_hint: 'Diese Kennzahl wurde bisher nicht vom Server geliefert.',
  stale_metric_hint: (label: string): string =>
    `${label} zeigt den letzten erfolgreich geladenen Stand.`,
  table_updating: 'Aktualisiere...',
  table_loading: 'Rangliste wird geladen...',
  table_loading_next: 'Neue Rangliste wird geladen...',
  rankings_loading: 'Lade Ranglisten...',
  no_data_available: 'Keine Daten verfügbar.',
  summary_error_hint: 'Die Statistik-API war nicht erreichbar.',
  summary_stale_refreshing: 'Aktualisierung läuft. Es wird der letzte Stand angezeigt.',
  summary_stale_failed: 'Aktualisierung fehlgeschlagen. Es wird der letzte Stand angezeigt.',
  summary_missing_metric: (label: string): string =>
    `${label} wurde vom Server noch nicht geliefert.`,
  live_nobody_online: 'Gerade niemand online',
  live_unknown: 'unbekannt',
  live_error_value: 'n/v',
  last_updated_prefix: 'Zuletzt aktualisiert',
  last_updated_missing: 'Zuletzt aktualisiert',
  last_updated_just_now: 'gerade eben',
  last_updated_minutes: (minutes: number): string => `vor ${minutes} Min`,
  last_updated_hours: (hours: number): string => `vor ${hours} Std`,
  last_updated_day_one: 'vor 1 Tag',
  last_updated_days: (days: number): string => `vor ${days} Tagen`,
  last_updated_with_relative: (relative: string): string => `Zuletzt aktualisiert ${relative}`,
  stats_generated_prefix: 'Zuletzt aktualisiert:',
} as const;

export function getLiveMessage({
  status,
  errorKind,
}: {
  status: LiveDataStatus;
  errorKind?: LiveDataErrorKind | null;
}): string | null {
  if (status === 'loading') return LIVE_COPY_DE.loading;
  if (status === 'stale') return LIVE_COPY_DE.stale_hint;
  if (status !== 'error') return null;

  if (errorKind === 'rate_limit') return LIVE_COPY_DE.rate_limit;
  if (errorKind === 'network') return LIVE_COPY_DE.error_network;
  if (errorKind === 'timeout') return LIVE_COPY_DE.error_timeout;
  return LIVE_COPY_DE.error_generic;
}
