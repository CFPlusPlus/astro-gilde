import type {
  LeaderboardResponse,
  MetricsResponse,
  PlayersSearchResponse,
  SummaryResponse,
} from './types';
import { fetchJson } from '../../lib/http/fetchJson';
import { toApiUrl } from '../../lib/http/apiUrl';

export function getMetrics(signal?: AbortSignal) {
  return fetchJson<MetricsResponse>(toApiUrl('/api/metrics'), { signal });
}

export function getSummary(metrics: string[], signal?: AbortSignal) {
  const q = metrics.join(',');
  return fetchJson<SummaryResponse>(toApiUrl(`/api/summary?metrics=${encodeURIComponent(q)}`), {
    signal,
  });
}

export function getLeaderboard(
  metricId: string,
  limit: number,
  cursor?: string | null,
  signal?: AbortSignal,
) {
  const base = toApiUrl(
    `/api/leaderboard?metric=${encodeURIComponent(metricId)}&limit=${encodeURIComponent(String(limit))}`,
  );
  const url = cursor ? `${base}&cursor=${encodeURIComponent(cursor)}` : base;
  return fetchJson<LeaderboardResponse>(url, { signal });
}

export function searchPlayers(query: string, limit = 6, signal?: AbortSignal) {
  const url = toApiUrl(
    `/api/players?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`,
  );
  return fetchJson<PlayersSearchResponse>(url, { signal });
}
