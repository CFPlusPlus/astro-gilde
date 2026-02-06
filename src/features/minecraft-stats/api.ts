import { fetchJson } from '../../lib/http/fetchJson';
import type { PlayerApiResponse, PlayerTranslations } from './types';

export function getPlayer(uuid: string, signal?: AbortSignal) {
  return fetchJson<PlayerApiResponse>(`/api/player?uuid=${encodeURIComponent(uuid)}`, {
    signal,
    cache: 'no-store',
  });
}

export function getTranslations(signal?: AbortSignal) {
  return fetchJson<PlayerTranslations>('/js/translations.de.json', {
    signal,
    cache: 'no-store',
  });
}
