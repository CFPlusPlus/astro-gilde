import { fetchJsonOrThrow } from '../../lib/http/fetchJson';
import { toApiUrl } from '../../lib/http/apiUrl';
import type { PlayerApiResponse, PlayerTranslations } from './types';

export function getPlayer(uuid: string, signal?: AbortSignal) {
  return fetchJsonOrThrow<PlayerApiResponse>(
    toApiUrl(`/api/player?uuid=${encodeURIComponent(uuid)}`),
    {
      signal,
      cache: 'no-store',
    },
  );
}

export function getTranslations(signal?: AbortSignal) {
  return fetchJsonOrThrow<PlayerTranslations>('/i18n/translations.de.json', {
    signal,
  });
}
