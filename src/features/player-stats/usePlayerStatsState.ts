import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';

import { getPlayer, getTranslations } from '../stats-core/api';
import { logMissingTranslations } from '../stats-core/i18n';
import type { PlayerApiResponse, PlayerTranslations } from '../stats-core/types';
import { parseFilter } from './format';
import {
  buildPlayerTables,
  filterPlayerTables,
  isTabKey,
  sortPlayerTables,
  type ItemsRow,
  type MobsRow,
  type SortState,
  type TabKey,
} from './table-model';
import { compactUUID } from './uuid';

export type UsePlayerStatsState = {
  activeTab: TabKey;
  setActiveTab: (next: TabKey) => void;
  isGerman: boolean;
  setIsGerman: (next: boolean | ((current: boolean) => boolean)) => void;
  uuidParam: string;
  uuidFull: string;
  playerName: string;
  generatedIso: string | null;
  apiError: string | null;
  filterRaw: string;
  setFilterRaw: (next: string) => void;
  filterInputRef: RefObject<HTMLInputElement | null>;
  sortGeneral: SortState<'label' | 'value' | 'raw'>;
  setSortGeneral: Dispatch<SetStateAction<SortState<'label' | 'value' | 'raw'>>>;
  sortItems: SortState<keyof ItemsRow>;
  setSortItems: Dispatch<SetStateAction<SortState<keyof ItemsRow>>>;
  sortMobs: SortState<keyof MobsRow>;
  setSortMobs: Dispatch<SetStateAction<SortState<keyof MobsRow>>>;
  filtered: ReturnType<typeof filterPlayerTables>;
  stats: Record<string, unknown> | null;
  canRender: boolean;
  uuidCopied: boolean;
  setUuidCopied: Dispatch<SetStateAction<boolean>>;
  skinHeadUrl: string;
  skinHeadFallback: string;
  skinFullUrl: string;
  skinFullFallback: string;
};

export function usePlayerStatsState(): UsePlayerStatsState {
  const [activeTab, setActiveTab] = useState<TabKey>('allgemein');
  const [isGerman, setIsGerman] = useState(true);
  const [forceTranslationCheck, setForceTranslationCheck] = useState(false);

  const [uuidParam, setUuidParam] = useState<string>('');
  const [uuidFull, setUuidFull] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [generatedIso, setGeneratedIso] = useState<string | null>(null);

  const [translations, setTranslations] = useState<PlayerTranslations | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);

  const [filterRaw, setFilterRaw] = useState('');
  const filterDeferred = useDeferredValue(filterRaw);
  const parsedQueries = useMemo(() => parseFilter(filterDeferred), [filterDeferred]);
  const filterInputRef = useRef<HTMLInputElement | null>(null);

  const [sortGeneral, setSortGeneral] = useState<SortState<'label' | 'value' | 'raw'>>({
    key: 'label',
    dir: 'none',
  });
  const [sortItems, setSortItems] = useState<SortState<keyof ItemsRow>>({
    key: 'label',
    dir: 'none',
  });
  const [sortMobs, setSortMobs] = useState<SortState<keyof MobsRow>>({ key: 'label', dir: 'none' });

  const [uuidCopied, setUuidCopied] = useState(false);

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    const uuid = (qp.get('uuid') || '').trim();
    const tab = qp.get('tab');
    const filter = qp.get('filter') || '';
    const i18nCheck = (qp.get('i18ncheck') || '').trim().toLowerCase();
    setUuidParam(uuid);
    if (isTabKey(tab)) setActiveTab(tab);
    if (filter) setFilterRaw(filter);
    if (i18nCheck === '1' || i18nCheck === 'true' || i18nCheck === 'yes') {
      setForceTranslationCheck(true);
    }
  }, []);

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    if (uuidParam) qp.set('uuid', uuidParam);
    else qp.delete('uuid');
    qp.set('tab', activeTab);
    if (filterRaw.trim()) qp.set('filter', filterRaw);
    else qp.delete('filter');

    const qs = qp.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    // URL-Parameter synchron halten, ohne einen neuen Verlaufseintrag zu erzeugen.
    if (nextUrl !== currentUrl) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [uuidParam, activeTab, filterRaw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isFormField =
        !!target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target.isContentEditable);

      if (e.key === '/' && !isFormField) {
        e.preventDefault();
        const input = filterInputRef.current;
        if (!input) return;
        input.focus();
        input.select();
      }

      if (e.key === 'Escape' && document.activeElement === filterInputRef.current && filterRaw) {
        setFilterRaw('');
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filterRaw]);

  useEffect(() => {
    const uuid = uuidParam.trim();
    if (!uuid) {
      setApiError(
        'Es wurde keine UUID \u00fcbergeben. \u00d6ffne einen Spieler \u00fcber die Suche auf /statistiken.',
      );
      setPlayerName('');
      setUuidFull('');
      setStats(null);
      setGeneratedIso(null);
      return;
    }

    const ac = new AbortController();

    const applyPlayerResponse = (
      data: PlayerApiResponse,
      fallbackUuid: string,
      nextTranslations: PlayerTranslations | null,
    ) => {
      const found = data.found !== false && !!data.player;

      if (!found) {
        setApiError(
          'Die \u00fcbergebene UUID ist unbekannt. Nutze die Spielersuche auf /statistiken oder pr\u00fcfe den Link.',
        );
        setPlayerName('');
        setUuidFull(fallbackUuid);
        setStats(null);
        setGeneratedIso(null);
        return;
      }

      const uuidResolved = (data.uuid || fallbackUuid).trim();
      const nameResolved = (data.name || uuidResolved).trim();

      setUuidFull(uuidResolved);
      setPlayerName(nameResolved);
      setGeneratedIso(typeof data.__generated === 'string' ? data.__generated : null);
      setStats((data.player || null) as Record<string, unknown> | null);

      try {
        if (data.player && typeof data.player === 'object') {
          logMissingTranslations(data.player as Record<string, unknown>, nextTranslations, {
            enabled: import.meta.env.DEV || forceTranslationCheck,
          });
        }
      } catch {
        // Unkritisch: Debug-Logging darf fehlschlagen.
      }
    };

    (async () => {
      try {
        const [nextTranslations, playerData] = await Promise.all([
          getTranslations(ac.signal).catch(() => null),
          getPlayer(uuid, ac.signal),
        ]);

        setTranslations(nextTranslations);
        applyPlayerResponse(playerData, uuid, nextTranslations);
        setApiError(null);
      } catch (e) {
        console.warn('Spielerstatistiken konnten nicht geladen werden:', e);
        setApiError(
          'Die Spielerstatistiken sind aktuell nicht erreichbar. Bitte versuche es sp\u00e4ter erneut.',
        );
        setPlayerName('');
        setUuidFull(uuid);
        setStats(null);
        setGeneratedIso(null);
      }
    })();

    return () => ac.abort();
  }, [forceTranslationCheck, uuidParam]);

  useEffect(() => {
    if (!playerName) return;
    document.title = `Minecraft Gilde - Spielerstatistik von ${playerName}`;
  }, [playerName]);

  const skinId = useMemo(() => {
    if (!uuidFull) return '';
    return playerName && playerName !== uuidFull ? playerName : compactUUID(uuidFull);
  }, [playerName, uuidFull]);

  const skinHeadUrl = skinId
    ? `https://minotar.net/helm/${encodeURIComponent(skinId)}/512.png`
    : '';
  const skinHeadFallback = skinId
    ? `https://mc-heads.net/avatar/${encodeURIComponent(skinId)}/512`
    : '';
  const skinFullUrl = skinId ? `https://minotar.net/skin/${encodeURIComponent(skinId)}.png` : '';
  const skinFullFallback = skinId ? `https://mc-heads.net/skin/${encodeURIComponent(skinId)}` : '';

  const tables = useMemo(
    () => buildPlayerTables(stats, isGerman, translations),
    [stats, isGerman, translations],
  );
  const sorted = useMemo(
    () => sortPlayerTables(tables, sortGeneral, sortItems, sortMobs),
    [tables, sortGeneral, sortItems, sortMobs],
  );
  const filtered = useMemo(
    () => filterPlayerTables(sorted, parsedQueries),
    [sorted, parsedQueries],
  );

  return {
    activeTab,
    setActiveTab,
    isGerman,
    setIsGerman,
    uuidParam,
    uuidFull,
    playerName,
    generatedIso,
    apiError,
    filterRaw,
    setFilterRaw,
    filterInputRef,
    sortGeneral,
    setSortGeneral,
    sortItems,
    setSortItems,
    sortMobs,
    setSortMobs,
    filtered,
    stats,
    canRender: !!uuidParam,
    uuidCopied,
    setUuidCopied,
    skinHeadUrl,
    skinHeadFallback,
    skinFullUrl,
    skinFullFallback,
  };
}
