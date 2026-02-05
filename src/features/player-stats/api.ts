import type { PlayerApiResponse, PlayerTranslations } from './types';

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function getPlayer(uuid: string, signal?: AbortSignal) {
  return fetchJson<PlayerApiResponse>(`/api/player?uuid=${encodeURIComponent(uuid)}`, signal);
}

export async function getTranslations(signal?: AbortSignal) {
  // Übersetzungen bewusst als statisches Asset laden (spart Bundle, lädt nur auf dieser Seite).
  return fetchJson<PlayerTranslations>('/js/translations.de.json', signal);
}
