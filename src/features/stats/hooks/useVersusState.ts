import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getPlayer, getTranslations } from '../../stats-core/api';
import { VERSUS_MAX_METRICS } from '../constants';
import type { PlayersSearchItem } from '../types';
import { usePlayerAutocomplete } from '../usePlayerAutocomplete';
import {
  buildVersusCatalog,
  filterVersusCatalog,
  getQuickVersusSelection,
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

export function useVersusState({ onGeneratedIso }: { onGeneratedIso: (iso: string) => void }) {
  const [versusMetricFilter, setVersusMetricFilter] = useState('');
  const [versusMetricIds, setVersusMetricIds] = useState<string[]>([]);
  const [versusPlayerA, setVersusPlayerA] = useState<PlayersSearchItem | null>(null);
  const [versusPlayerB, setVersusPlayerB] = useState<PlayersSearchItem | null>(null);
  const [versusStatsA, setVersusStatsA] = useState<Record<string, unknown> | null>(null);
  const [versusStatsB, setVersusStatsB] = useState<Record<string, unknown> | null>(null);
  const [versusCatalog, setVersusCatalog] = useState<VersusMetricDef[]>([]);
  const [versusLoading, setVersusLoading] = useState(false);
  const [versusError, setVersusError] = useState<string | null>(null);
  const [versusNotice, setVersusNotice] = useState<string | null>(null);
  const [versusSwapFx, setVersusSwapFx] = useState(false);

  const versusAbortRef = useRef<AbortController | null>(null);
  const versusSwapFxTimeoutRef = useRef<number | null>(null);
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
    return () => {
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

    setVersusMetricIds((previous) => {
      const available = new Set(versusCatalog.map((entry) => entry.id));
      const filtered = previous.filter((id) => available.has(id));
      if (filtered.length > 0) return filtered.slice(0, VERSUS_MAX_METRICS);
      return getQuickVersusSelection(versusCatalog).slice(0, VERSUS_MAX_METRICS);
    });
  }, [versusCatalog]);

  const setVersusPlayer = useCallback(
    (side: 'A' | 'B', uuid: string) => {
      const search = side === 'A' ? searchA : searchB;
      const items = search.items;
      const found = items.find((item) => item.uuid === uuid);
      const next = found || { uuid, name: uuid };

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

    versusAbortRef.current?.abort();
    const ac = new AbortController();
    versusAbortRef.current = ac;

    try {
      const [translations, playerDataA, playerDataB] = await Promise.all([
        getTranslations(ac.signal).catch(() => null),
        getPlayer(playerA.uuid, ac.signal),
        getPlayer(playerB.uuid, ac.signal),
      ]);

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

      setVersusMetricIds((previous) => {
        const available = new Set(catalog.map((entry) => entry.id));
        const filtered = previous.filter((id) => available.has(id));
        if (filtered.length > 0) return filtered.slice(0, VERSUS_MAX_METRICS);
        return getQuickVersusSelection(catalog).slice(0, VERSUS_MAX_METRICS);
      });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      console.warn('Versus Fehler', error);
      setVersusError('Versus konnte nicht geladen werden. Bitte versuche es sp\u00e4ter erneut.');
    } finally {
      setVersusLoading(false);
    }
  }, [onGeneratedIso, versusPlayerA, versusPlayerB]);

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
    setVersusError(null);
    setVersusNotice(null);
  }, [clearVersusPlayer]);

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

  const versusSummary = useMemo(() => {
    let winsA = 0;
    let winsB = 0;
    let ties = 0;
    let counted = 0;

    for (const row of versusRows) {
      if (row.valueA === null || row.valueB === null) continue;
      counted += 1;
      if (row.valueA > row.valueB) winsA += 1;
      else if (row.valueB > row.valueA) winsB += 1;
      else ties += 1;
    }

    return { winsA, winsB, ties, counted };
  }, [versusRows]);

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
  };
}
