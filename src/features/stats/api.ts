import type {
  LeaderboardResponse,
  MetricsResponse,
  PlayersSearchResponse,
  SummaryResponse,
} from './types';

/**
 * Einheitlicher JSON-Fetch mit sinnvollen Standardwerten.
 * - Accept: application/json
 * - Fehler werden als Exception geworfen
 */
export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function getMetrics(signal?: AbortSignal) {
  return fetchJson<MetricsResponse>('/api/metrics', signal);
}

export function getSummary(metrics: string[], signal?: AbortSignal) {
  const q = metrics.join(',');
  return fetchJson<SummaryResponse>(`/api/summary?metrics=${encodeURIComponent(q)}`, signal);
}

export function getLeaderboard(
  metricId: string,
  limit: number,
  cursor?: string | null,
  signal?: AbortSignal,
) {
  const base = `/api/leaderboard?metric=${encodeURIComponent(metricId)}&limit=${encodeURIComponent(
    String(limit),
  )}`;
  const url = cursor ? `${base}&cursor=${encodeURIComponent(cursor)}` : base;
  return fetchJson<LeaderboardResponse>(url, signal);
}

export function searchPlayers(query: string, limit = 6, signal?: AbortSignal) {
  const url = `/api/players?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`;
  return fetchJson<PlayersSearchResponse>(url, signal);
}
