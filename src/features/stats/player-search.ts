import { normalizeUmlauts } from './normalizeUmlauts';
import type { PlayersSearchItem } from './types';

function normalizeSearchText(input: string): string {
  return normalizeUmlauts(input).trim().toLowerCase();
}

function damerauLevenshtein(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const dp: number[][] = Array.from({ length: aLen + 1 }, () => Array<number>(bLen + 1).fill(0));

  for (let i = 0; i <= aLen; i += 1) dp[i][0] = i;
  for (let j = 0; j <= bLen; j += 1) dp[0][j] = j;

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, dp[i - 2][j - 2] + 1);
      }

      dp[i][j] = best;
    }
  }

  return dp[aLen][bLen];
}

function bestWindowDistance(query: string, name: string): number {
  if (!query || !name) return Number.POSITIVE_INFINITY;
  if (name.includes(query)) return 0;

  const qLen = query.length;
  const minWindow = Math.max(2, qLen - 1);
  const maxWindow = Math.min(name.length, qLen + 1);
  if (minWindow > maxWindow) return damerauLevenshtein(query, name);

  let best = Number.POSITIVE_INFINITY;
  for (let len = minWindow; len <= maxWindow; len += 1) {
    for (let start = 0; start + len <= name.length; start += 1) {
      const part = name.slice(start, start + len);
      const dist = damerauLevenshtein(query, part);
      if (dist < best) best = dist;
      if (best === 0) return 0;
    }
  }

  return best;
}

type RankedItem = {
  item: PlayersSearchItem;
  rank: number;
  distance: number;
  apiIndex: number;
};

function classifyMatch(
  query: string,
  normalizedName: string,
  apiIndex: number,
): { rank: number; distance: number } | null {
  if (!normalizedName) return null;
  if (normalizedName === query) return { rank: 0, distance: 0 };
  if (normalizedName.startsWith(query)) return { rank: 1, distance: 0 };
  if (normalizedName.includes(query)) return { rank: 2, distance: 0 };

  if (query.length >= 4) {
    const maxDistance = query.length >= 6 ? 2 : 1;
    const distance = bestWindowDistance(query, normalizedName);
    if (distance <= maxDistance) return { rank: 3, distance };
  }

  if (apiIndex >= 0) return { rank: 4, distance: apiIndex };
  return null;
}

export function rankPlayersForQuery(
  query: string,
  apiItems: PlayersSearchItem[],
  knownItems: Iterable<PlayersSearchItem>,
  limit: number,
): PlayersSearchItem[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2 || limit <= 0) return [];

  const merged = new Map<string, { item: PlayersSearchItem; apiIndex: number }>();
  apiItems.forEach((item, index) => {
    if (!item?.uuid || !item?.name) return;
    merged.set(item.uuid, { item, apiIndex: index });
  });

  for (const item of knownItems) {
    if (!item?.uuid || !item?.name || merged.has(item.uuid)) continue;
    merged.set(item.uuid, { item, apiIndex: -1 });
  }

  const ranked: RankedItem[] = [];
  for (const { item, apiIndex } of merged.values()) {
    const normalizedName = normalizeSearchText(item.name);
    const match = classifyMatch(normalizedQuery, normalizedName, apiIndex);
    if (!match) continue;
    ranked.push({ item, rank: match.rank, distance: match.distance, apiIndex });
  }

  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.apiIndex !== b.apiIndex) {
      if (a.apiIndex < 0) return 1;
      if (b.apiIndex < 0) return -1;
      return a.apiIndex - b.apiIndex;
    }
    return a.item.name.localeCompare(b.item.name, 'de');
  });

  return ranked.slice(0, limit).map((entry) => entry.item);
}
