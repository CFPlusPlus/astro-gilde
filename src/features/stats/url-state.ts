import { VERSUS_MAX_METRICS } from './constants';
import type { PlayersSearchItem } from './types';

type UrlVersusPlayer = {
  uuid: string;
  name: string;
};

export type ParsedStatsUrlState = {
  rankMetricId: string | null;
  versus: {
    playerA: UrlVersusPlayer | null;
    playerB: UrlVersusPlayer | null;
    metricFilter: string;
    metricIds: string[];
    shouldAutoCompare: boolean;
  };
};

function cleanString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseMetricIds(value: string | null): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  ).slice(0, VERSUS_MAX_METRICS);
}

function parseVersusPlayer(uuid: string | null, name: string | null): UrlVersusPlayer | null {
  const safeUuid = cleanString(uuid);
  if (!safeUuid) return null;
  const safeName = cleanString(name) || safeUuid;
  return { uuid: safeUuid, name: safeName };
}

export function parseStatsUrlState(search: string): ParsedStatsUrlState {
  const params = new URLSearchParams(search);

  const rankMetricId = cleanString(params.get('rm'));

  const playerA = parseVersusPlayer(params.get('va'), params.get('van'));
  const playerB = parseVersusPlayer(params.get('vb'), params.get('vbn'));
  const metricFilter = params.get('vf') || '';
  const metricIds = parseMetricIds(params.get('vm'));

  return {
    rankMetricId,
    versus: {
      playerA,
      playerB,
      metricFilter,
      metricIds,
      shouldAutoCompare: Boolean(playerA && playerB),
    },
  };
}

export function buildStatsUrlSearch({
  activeMetricId,
  versusMetricFilter,
  versusMetricIds,
  versusPlayerA,
  versusPlayerB,
}: {
  activeMetricId: string | null;
  versusMetricFilter: string;
  versusMetricIds: string[];
  versusPlayerA: PlayersSearchItem | null;
  versusPlayerB: PlayersSearchItem | null;
}): string {
  const params = new URLSearchParams();

  const cleanMetricId = cleanString(activeMetricId);
  if (cleanMetricId) params.set('rm', cleanMetricId);

  const playerAUuid = cleanString(versusPlayerA?.uuid || null);
  const playerAName = cleanString(versusPlayerA?.name || null);
  if (playerAUuid) {
    params.set('va', playerAUuid);
    if (playerAName) params.set('van', playerAName);
  }

  const playerBUuid = cleanString(versusPlayerB?.uuid || null);
  const playerBName = cleanString(versusPlayerB?.name || null);
  if (playerBUuid) {
    params.set('vb', playerBUuid);
    if (playerBName) params.set('vbn', playerBName);
  }

  const filter = versusMetricFilter.trim();
  if (filter.length > 0) params.set('vf', filter);

  const metricIds = Array.from(
    new Set(versusMetricIds.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  ).slice(0, VERSUS_MAX_METRICS);
  if (metricIds.length > 0) params.set('vm', metricIds.join(','));

  const query = params.toString();
  return query.length > 0 ? `?${query}` : '';
}
