import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getPlayer, getTranslations } from '../../stats-core/api';
import { VERSUS_MAX_METRICS } from '../constants';
import type { PlayersSearchItem } from '../types';
import { usePlayerAutocomplete } from '../usePlayerAutocomplete';
import {
  sanitizeVersusMetricIds,
  summarizeVersusRows,
  syncVersusMetricIdsWithCatalog,
} from './versus-helpers';
import {
  buildVersusCatalog,
  filterVersusCatalog,
  getVersusValue,
  groupVersusCatalog,
  type VersusGroupedMetrics,
  type VersusMetricDef,
} from '../versus';

export type VersusRow = {
  id: string;
  def: VersusMetricDef;
  valueA: number | null;
  valueB: number | null;
};

type InitialVersusState = {
  playerA?: PlayersSearchItem | null;
  playerB?: PlayersSearchItem | null;
  metricFilter?: string;
  metricIds?: string[];
  autoCompare?: boolean;
};

type UrlVersusSelection = {
  playerAUuid: string | null;
  playerBUuid: string | null;
  autoCompare?: boolean;
};

function cleanUuid(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function useVersusState({
  onGeneratedIso,
  initialState,
}: {
  onGeneratedIso: (iso: string) => void;
  initialState?: InitialVersusState;
}) {
  const [versusMetricFilter, setVersusMetricFilter] = useState(initialState?.metricFilter || '');
  const [versusMetricIds, setVersusMetricIds] = useState<string[]>(
    sanitizeVersusMetricIds(initialState?.metricIds),
  );
  const [versusPlayerA, setVersusPlayerA] = useState<PlayersSearchItem | null>(
    initialState?.playerA || null,
  );
  const [versusPlayerB, setVersusPlayerB] = useState<PlayersSearchItem | null>(
    initialState?.playerB || null,
  );
  const [versusStatsA, setVersusStatsA] = useState<Record<string, unknown> | null>(null);
  const [versusStatsB, setVersusStatsB] = useState<Record<string, unknown> | null>(null);
  const [versusCatalog, setVersusCatalog] = useState<VersusMetricDef[]>([]);
  const [versusLoading, setVersusLoading] = useState(false);
  const [versusError, setVersusError] = useState<string | null>(null);
  const [versusNotice, setVersusNotice] = useState<string | null>(null);
  const [versusSwapFx, setVersusSwapFx] = useState(false);

  const versusAbortRef = useRef<AbortController | null>(null);
  const versusRequestIdRef = useRef(0);
  const versusSwapFxTimeoutRef = useRef<number | null>(null);
  const initializedSearchRef = useRef(false);
  const shouldAutoCompareRef = useRef(Boolean(initialState?.autoCompare));
  const playerNamesRef = useRef<Record<string, string>>({});

  const searchA = usePlayerAutocomplete({
    onGeneratedIso,
    onError: setVersusError,
  });

  const searchB = usePlayerAutocomplete({
    onGeneratedIso,
    onError: setVersusError,
  });

  useEffect(() => {
    if (initializedSearchRef.current) return;
    initializedSearchRef.current = true;

    if (versusPlayerA) {
      searchA.setValueWithoutAutoOpen(versusPlayerA.name);
      playerNamesRef.current[versusPlayerA.uuid] = versusPlayerA.name;
    }

    if (versusPlayerB) {
      searchB.setValueWithoutAutoOpen(versusPlayerB.name);
      playerNamesRef.current[versusPlayerB.uuid] = versusPlayerB.name;
    }
  }, [searchA, searchB, versusPlayerA, versusPlayerB]);

  useEffect(() => {
    return () => {
      versusRequestIdRef.current += 1;
      versusAbortRef.current?.abort();
      if (versusSwapFxTimeoutRef.current !== null) {
        window.clearTimeout(versusSwapFxTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setVersusStatsA(null);
    setVersusStatsB(null);
    setVersusCatalog([]);
    setVersusNotice(null);
    setVersusError(null);
  }, [versusPlayerA?.uuid, versusPlayerB?.uuid]);

  useEffect(() => {
    if (versusCatalog.length === 0) return;
    setVersusMetricIds((previous) => syncVersusMetricIdsWithCatalog(previous, versusCatalog));
  }, [versusCatalog]);

  const setVersusPlayer = useCallback(
    (side: 'A' | 'B', uuid: string, fallbackName?: string) => {
      const search = side === 'A' ? searchA : searchB;
      const items = search.items;
      const found = items.find((item) => item.uuid === uuid);
      const normalizedFallbackName = fallbackName?.trim();
      const knownName = playerNamesRef.current[uuid];
      const next = found ||
        (normalizedFallbackName ? { uuid, name: normalizedFallbackName } : null) || {
          uuid,
          name: knownName || uuid,
        };

      if (side === 'A') {
        setVersusPlayerA(next);
      } else {
        setVersusPlayerB(next);
      }

      search.setValueWithoutAutoOpen(next.name);
      playerNamesRef.current[next.uuid] = next.name;
    },
    [searchA, searchB],
  );

  const clearVersusPlayer = useCallback(
    (side: 'A' | 'B') => {
      if (side === 'A') {
        setVersusPlayerA(null);
      } else {
        setVersusPlayerB(null);
      }

      const search = side === 'A' ? searchA : searchB;
      search.setValue('');
      search.setItems([]);
      search.setOpen(false);
      search.setSelectedIndex(-1);
    },
    [searchA, searchB],
  );

  const setVersusSearchOpen = useCallback(
    (side: 'A' | 'B', open: boolean) => {
      if (side === 'A') {
        searchA.setOpen(open);
        if (open) searchB.setOpen(false);
        return;
      }

      searchB.setOpen(open);
      if (open) searchA.setOpen(false);
    },
    [searchA, searchB],
  );

  const triggerVersusSwapFx = useCallback(() => {
    setVersusSwapFx(false);

    if (versusSwapFxTimeoutRef.current !== null) {
      window.clearTimeout(versusSwapFxTimeoutRef.current);
    }

    window.requestAnimationFrame(() => setVersusSwapFx(true));
    versusSwapFxTimeoutRef.current = window.setTimeout(() => setVersusSwapFx(false), 420);
  }, []);

  const swapVersusPlayers = useCallback(() => {
    const nextA = versusPlayerB;
    const nextB = versusPlayerA;

    setVersusPlayerA(nextA);
    setVersusPlayerB(nextB);
    searchA.setValueWithoutAutoOpen(nextA?.name || '');
    searchB.setValueWithoutAutoOpen(nextB?.name || '');

    triggerVersusSwapFx();
  }, [searchA, searchB, triggerVersusSwapFx, versusPlayerA, versusPlayerB]);

  const updateVersusSearch = useCallback(
    (side: 'A' | 'B', next: string) => {
      const search = side === 'A' ? searchA : searchB;
      const current = side === 'A' ? versusPlayerA : versusPlayerB;

      search.setValue(next);

      if (current && current.name.trim().toLowerCase() !== next.trim().toLowerCase()) {
        if (side === 'A') {
          setVersusPlayerA(null);
        } else {
          setVersusPlayerB(null);
        }
      }
    },
    [searchA, searchB, versusPlayerA, versusPlayerB],
  );

  const runVersusCompare = useCallback(async () => {
    const playerA = versusPlayerA;
    const playerB = versusPlayerB;

    if (!playerA || !playerB) {
      setVersusError('Bitte w\u00e4hle zwei Spieler f\u00fcr den Vergleich aus.');
      return;
    }

    if (playerA.uuid === playerB.uuid) {
      setVersusError('Bitte w\u00e4hle zwei unterschiedliche Spieler.');
      return;
    }

    setVersusError(null);
    setVersusNotice(null);
    setVersusLoading(true);

    const requestId = versusRequestIdRef.current + 1;
    versusRequestIdRef.current = requestId;

    versusAbortRef.current?.abort();
    const ac = new AbortController();
    versusAbortRef.current = ac;
    const isCurrentRequest = (): boolean =>
      versusRequestIdRef.current === requestId &&
      versusAbortRef.current === ac &&
      !ac.signal.aborted;

    try {
      const [translations, playerDataA, playerDataB] = await Promise.all([
        getTranslations(ac.signal).catch(() => null),
        getPlayer(playerA.uuid, ac.signal),
        getPlayer(playerB.uuid, ac.signal),
      ]);
      if (!isCurrentRequest()) return;

      const statsA =
        playerDataA.found === false || !playerDataA.player || typeof playerDataA.player !== 'object'
          ? null
          : (playerDataA.player as Record<string, unknown>);

      const statsB =
        playerDataB.found === false || !playerDataB.player || typeof playerDataB.player !== 'object'
          ? null
          : (playerDataB.player as Record<string, unknown>);

      if (!statsA) {
        setVersusError(`Spieler A (${playerA.name}) wurde nicht gefunden.`);
        setVersusStatsA(null);
        setVersusStatsB(null);
        setVersusCatalog([]);
        return;
      }

      if (!statsB) {
        setVersusError(`Spieler B (${playerB.name}) wurde nicht gefunden.`);
        setVersusStatsA(null);
        setVersusStatsB(null);
        setVersusCatalog([]);
        return;
      }

      if (typeof playerDataA.__generated === 'string') {
        onGeneratedIso(playerDataA.__generated);
      }

      if (typeof playerDataB.__generated === 'string') {
        onGeneratedIso(playerDataB.__generated);
      }

      setVersusStatsA(statsA);
      setVersusStatsB(statsB);

      const catalog = buildVersusCatalog(statsA, statsB, translations);
      setVersusCatalog(catalog);
      setVersusMetricIds((previous) => syncVersusMetricIdsWithCatalog(previous, catalog));
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      if (!isCurrentRequest()) return;
      console.warn('Versus Fehler', error);
      setVersusError('Versus konnte nicht geladen werden. Bitte versuche es sp\u00e4ter erneut.');
    } finally {
      if (versusRequestIdRef.current === requestId) {
        setVersusLoading(false);
      }
    }
  }, [onGeneratedIso, versusPlayerA, versusPlayerB]);

  useEffect(() => {
    if (!shouldAutoCompareRef.current) return;
    if (!versusPlayerA || !versusPlayerB) return;
    shouldAutoCompareRef.current = false;
    void runVersusCompare();
  }, [runVersusCompare, versusPlayerA, versusPlayerB]);

  const applyVersusSelection = useCallback((next: string[]) => {
    const unique = Array.from(new Set(next));

    if (unique.length > VERSUS_MAX_METRICS) {
      setVersusNotice(`Maximal ${VERSUS_MAX_METRICS} Kategorien gleichzeitig.`);
      setVersusMetricIds(unique.slice(0, VERSUS_MAX_METRICS));
      return;
    }

    setVersusNotice(null);
    setVersusMetricIds(unique);
  }, []);

  const toggleVersusMetric = useCallback((id: string) => {
    setVersusMetricIds((previous) => {
      if (previous.includes(id)) {
        setVersusNotice(null);
        return previous.filter((item) => item !== id);
      }

      if (previous.length >= VERSUS_MAX_METRICS) {
        setVersusNotice(`Maximal ${VERSUS_MAX_METRICS} Kategorien gleichzeitig.`);
        return previous;
      }

      setVersusNotice(null);
      return [...previous, id];
    });
  }, []);

  const resetVersus = useCallback(() => {
    clearVersusPlayer('A');
    clearVersusPlayer('B');
    setVersusMetricFilter('');
    setVersusMetricIds([]);
    setVersusError(null);
    setVersusNotice(null);
  }, [clearVersusPlayer]);

  const applyUrlState = useCallback(
    ({ playerAUuid, playerBUuid, autoCompare = false }: UrlVersusSelection) => {
      shouldAutoCompareRef.current = autoCompare;

      const nextAUuid = cleanUuid(playerAUuid);
      const nextBUuid = cleanUuid(playerBUuid);

      const nextAName = nextAUuid
        ? versusPlayerA?.uuid === nextAUuid
          ? versusPlayerA.name
          : playerNamesRef.current[nextAUuid] || nextAUuid
        : '';
      const nextBName = nextBUuid
        ? versusPlayerB?.uuid === nextBUuid
          ? versusPlayerB.name
          : playerNamesRef.current[nextBUuid] || nextBUuid
        : '';

      setVersusPlayerA((previous) => {
        if (!nextAUuid) return null;
        if (previous?.uuid === nextAUuid) return previous;
        return { uuid: nextAUuid, name: nextAName };
      });

      setVersusPlayerB((previous) => {
        if (!nextBUuid) return null;
        if (previous?.uuid === nextBUuid) return previous;
        return { uuid: nextBUuid, name: nextBName };
      });

      if (nextAUuid) {
        searchA.setValueWithoutAutoOpen(nextAName);
      } else {
        searchA.setValue('');
        searchA.setItems([]);
        searchA.setOpen(false);
        searchA.setSelectedIndex(-1);
      }

      if (nextBUuid) {
        searchB.setValueWithoutAutoOpen(nextBName);
      } else {
        searchB.setValue('');
        searchB.setItems([]);
        searchB.setOpen(false);
        searchB.setSelectedIndex(-1);
      }
    },
    [searchA, searchB, versusPlayerA, versusPlayerB],
  );

  const versusFilteredCatalog = useMemo(
    () => filterVersusCatalog(versusCatalog, versusMetricFilter),
    [versusCatalog, versusMetricFilter],
  );

  const versusGroupedMetrics: VersusGroupedMetrics = useMemo(
    () => groupVersusCatalog(versusFilteredCatalog),
    [versusFilteredCatalog],
  );

  const hasNoVersusResults = versusCatalog.length > 0 && versusFilteredCatalog.length === 0;
  const isSameVersusPlayer =
    !!versusPlayerA && !!versusPlayerB && versusPlayerA.uuid === versusPlayerB.uuid;
  const canRunVersus = !!versusPlayerA && !!versusPlayerB && !versusLoading && !isSameVersusPlayer;
  const versusSwapFxClass = versusSwapFx
    ? 'border-accent/55 bg-accent/10 ring-accent/35 ring-1'
    : '';
  const versusCardAZClass = searchA.open ? 'z-50' : 'z-30';
  const versusCardBZClass = searchB.open ? 'z-50' : 'z-30';

  const hasVersusData = !!versusStatsA && !!versusStatsB;

  const catalogMap = useMemo(() => {
    return new Map(versusCatalog.map((entry) => [entry.id, entry]));
  }, [versusCatalog]);

  const versusRows = useMemo<VersusRow[]>(() => {
    return versusMetricIds
      .map((id) => {
        const def = catalogMap.get(id);
        if (!def) return null;

        return {
          id,
          def,
          valueA: getVersusValue(versusStatsA, def),
          valueB: getVersusValue(versusStatsB, def),
        };
      })
      .filter((row): row is VersusRow => row !== null);
  }, [catalogMap, versusMetricIds, versusStatsA, versusStatsB]);

  const versusSummary = useMemo(() => summarizeVersusRows(versusRows), [versusRows]);

  const hasVersusResults = hasVersusData && versusRows.length > 0;
  const hasMissingVersusValues = versusRows.some(
    (row) => row.valueA === null || row.valueB === null,
  );

  return {
    maxMetrics: VERSUS_MAX_METRICS,
    searchA,
    searchB,
    versusMetricFilter,
    setVersusMetricFilter,
    versusMetricIds,
    versusPlayerA,
    versusPlayerB,
    versusCatalog,
    versusLoading,
    versusError,
    versusNotice,
    versusFilteredCatalog,
    versusGroupedMetrics,
    hasNoVersusResults,
    isSameVersusPlayer,
    canRunVersus,
    versusSwapFxClass,
    versusCardAZClass,
    versusCardBZClass,
    hasVersusData,
    versusRows,
    versusSummary,
    hasVersusResults,
    hasMissingVersusValues,
    setVersusPlayer,
    clearVersusPlayer,
    setVersusSearchOpen,
    swapVersusPlayers,
    updateVersusSearch,
    runVersusCompare,
    applyVersusSelection,
    toggleVersusMetric,
    resetVersus,
    applyUrlState,
  };
}
