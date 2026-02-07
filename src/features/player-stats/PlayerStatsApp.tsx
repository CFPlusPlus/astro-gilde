import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Clock3,
  Info,
  Languages,
  Map as MapIcon,
  Package,
  Search,
  Slash,
  Sparkles,
  Swords,
  Skull,
  X,
} from 'lucide-react';

import { getPlayer, getTranslations } from '../stats-core/api';
import { logMissingTranslations } from '../stats-core/i18n';
import type { PlayerApiResponse, PlayerTranslations } from '../stats-core/types';
import { nf, nf2, parseFilter } from './format';
import { compactUUID } from './uuid';
import SkinViewerModal from './SkinViewerModal';
import { KpiStrip, type KpiItem } from '../stats/components/KpiStrip';
import {
  buildPlayerTables,
  filterPlayerTables,
  isTabKey,
  nextSort,
  sortPlayerTables,
  type ItemsRow,
  type MobsRow,
  type SortState,
  type TabKey,
} from './table-model';
import { ApiAlert, fmtGenerated, NoResults, SortIcon } from './ui';

export default function PlayerStatsApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('allgemein');
  const [isGerman, setIsGerman] = useState(true);

  const [uuidParam, setUuidParam] = useState<string>('');
  const [uuidFull, setUuidFull] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [generatedIso, setGeneratedIso] = useState<string | null>(null);

  const [translations, setTranslations] = useState<PlayerTranslations | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);

  // Filter: wie im Legacy-Skript, aber ohne DOM-Manipulation.
  const [filterRaw, setFilterRaw] = useState('');
  const filterDeferred = useDeferredValue(filterRaw);
  const parsedQueries = useMemo(() => parseFilter(filterDeferred), [filterDeferred]);
  const filterInputRef = useRef<HTMLInputElement | null>(null);

  // Sort-State pro Tabelle
  const [sortGeneral, setSortGeneral] = useState<SortState<'label' | 'value' | 'raw'>>({
    key: 'label',
    dir: 'asc',
  });
  const [sortItems, setSortItems] = useState<SortState<keyof ItemsRow>>({
    key: 'label',
    dir: 'asc',
  });
  const [sortMobs, setSortMobs] = useState<SortState<keyof MobsRow>>({ key: 'label', dir: 'asc' });

  // UUID-Copy-UX
  const [uuidCopied, setUuidCopied] = useState(false);
  const uuidBtnRef = useRef<HTMLButtonElement | null>(null);
  const uuidMinWidthRef = useRef<number | null>(null);

  // Skin-Modal
  const [skinOpen, setSkinOpen] = useState(false);

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    const uuid = (qp.get('uuid') || '').trim();
    const tab = qp.get('tab');
    const filter = qp.get('filter') || '';
    setUuidParam(uuid);
    if (isTabKey(tab)) setActiveTab(tab);
    if (filter) setFilterRaw(filter);
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

  // Laden: Uebersetzungen + Spieler
  useEffect(() => {
    const uuid = uuidParam.trim();
    if (!uuid) {
      setApiError(
        'Es wurde keine UUID übergeben. Öffne einen Spieler über die Suche auf /statistiken.',
      );
      setPlayerName('');
      setUuidFull('');
      setStats(null);
      setGeneratedIso(null);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        const [t, p] = await Promise.all([
          getTranslations(ac.signal).catch(() => null),
          getPlayer(uuid, ac.signal),
        ]);

        setTranslations(t);
        applyPlayerResponse(p, uuid, t);
        setApiError(null);
      } catch (e) {
        console.warn('Spielerstatistiken konnten nicht geladen werden:', e);
        setApiError(
          'Spielerstatistiken sind aktuell nicht erreichbar. Bitte versuche es später erneut.',
        );
        setPlayerName('');
        setUuidFull(uuid);
        setStats(null);
        setGeneratedIso(null);
      }
    })();

    return () => ac.abort();
  }, [uuidParam]);

  function applyPlayerResponse(
    data: PlayerApiResponse,
    fallbackUuid: string,
    t: PlayerTranslations | null,
  ) {
    const found = data.found !== false && !!data.player;

    if (!found) {
      setApiError(
        'Die übergebene UUID ist unbekannt. Nutze die Spielersuche auf /statistiken oder prüfe den Link.',
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

    // Konsolen-Helper fuer Uebersetzungen (hilft bei Pflege, stoert Nutzer nicht)
    try {
      if (data.player && typeof data.player === 'object') {
        logMissingTranslations(data.player as Record<string, unknown>, t);
      }
    } catch {
      // Unkritisch: Debug-Logging darf fehlschlagen.
    }
  }

  // Titel
  useEffect(() => {
    if (!playerName) return;
    document.title = `Minecraft Gilde - Spielerstatistik von ${playerName}`;
  }, [playerName]);

  // UUID-Min-Width messen (damit "Kopiert!" nicht springt)
  useEffect(() => {
    if (!uuidFull) return;
    const btn = uuidBtnRef.current;
    if (!btn) return;
    requestAnimationFrame(() => {
      const w = btn.getBoundingClientRect().width;
      uuidMinWidthRef.current = Math.ceil(w);
    });
  }, [uuidFull]);

  const skinId = useMemo(() => {
    if (!uuidFull) return '';
    // Minotar kann in der Regel Name ODER UUID (ohne Bindestriche)
    return playerName && playerName !== uuidFull ? playerName : compactUUID(uuidFull);
  }, [playerName, uuidFull]);

  const skinHeadUrl = skinId
    ? `https://minotar.net/helm/${encodeURIComponent(skinId)}/512.png`
    : '';
  const skinHeadFallback = skinId
    ? `https://mc-heads.net/avatar/${encodeURIComponent(skinId)}/512`
    : '';
  const skinFullUrl = skinId ? `https://minotar.net/skin/${encodeURIComponent(skinId)}.png` : '';

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

  const kpiItems = useMemo<KpiItem[]>(() => {
    const asObj = (v: unknown) =>
      v && typeof v === 'object' ? (v as Record<string, number>) : null;
    const custom = asObj(stats?.['minecraft:custom']) || {};

    const playTimeHours = (custom['minecraft:play_time'] || 0) / 72000;
    const walkKm = (custom['minecraft:walk_one_cm'] || 0) / 100000;
    const mobKills = custom['minecraft:mob_kills'] || 0;
    const deaths = custom['minecraft:deaths'] || 0;

    return [
      {
        id: 'play_time',
        icon: <Clock3 size={16} />,
        label: 'Spielzeit',
        value: `${nf2(playTimeHours)} h`,
        meta: 'minecraft:play_time',
      },
      {
        id: 'walk',
        icon: <MapIcon size={16} />,
        label: 'Laufdistanz',
        value: `${nf2(walkKm)} km`,
        meta: 'minecraft:walk_one_cm',
      },
      {
        id: 'mob_kills',
        icon: <Swords size={16} />,
        label: 'Mob-Kills',
        value: nf(mobKills),
        meta: 'minecraft:mob_kills',
      },
      {
        id: 'deaths',
        icon: <Skull size={16} />,
        label: 'Tode',
        value: nf(deaths),
        meta: 'minecraft:deaths',
      },
    ];
  }, [stats]);

  const activeResultCount =
    activeTab === 'allgemein'
      ? filtered.general.length
      : activeTab === 'items'
        ? filtered.items.length
        : filtered.mobs.length;

  const activeTabLabel =
    activeTab === 'allgemein' ? 'Allgemein' : activeTab === 'items' ? 'Gegenstaende' : 'Kreaturen';

  const canRender = !!uuidParam;

  const uuidButtonText = uuidCopied ? 'Kopiert!' : uuidFull;

  return (
    <div>
      <section className="mg-container pt-10 pb-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Spielerstatistik von{' '}
                <span>{playerName ? playerName : canRender ? 'Lädt…' : ''}</span>
              </h1>
              <p className="text-muted mt-2 max-w-3xl">
                Alle Werte, Items und Kreaturen eines Spielers – inklusive Filter und Sortierung.
              </p>
            </div>

            <button
              type="button"
              aria-pressed={isGerman}
              title="Zwischen Deutsch und Original wechseln"
              className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex h-10 items-center gap-2 self-start rounded-lg border px-3 text-sm font-semibold transition-colors"
              onClick={() => setIsGerman((v) => !v)}
            >
              <Languages size={16} />
              <span className="label">{isGerman ? 'DE' : 'EN'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/statistiken"
              className="bg-accent hover:bg-accent2 focus-visible:ring-offset-bg inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-black transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2"
            >
              <ArrowLeft size={16} /> Zurück zur Statistik
            </a>

            <button
              ref={uuidBtnRef}
              type="button"
              title="UUID kopieren"
              className="bg-surface border-border text-fg hover:bg-surface-solid/70 inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition-colors"
              style={
                uuidMinWidthRef.current ? { minWidth: `${uuidMinWidthRef.current}px` } : undefined
              }
              onClick={() => {
                if (!uuidFull) return;
                void navigator.clipboard
                  .writeText(uuidFull)
                  .then(() => {
                    setUuidCopied(true);
                    window.setTimeout(() => setUuidCopied(false), 1200);
                  })
                  .catch(() => {
                    // Clipboard kann blockiert sein (z. B. ohne User-Geste).
                  });
              }}
            >
              {uuidButtonText}
            </button>

            {generatedIso ? (
              <span className="bg-surface border-border text-muted inline-flex h-9 items-center rounded-full border px-3 text-xs font-medium">
                {fmtGenerated(generatedIso)}
              </span>
            ) : null}
          </div>

          <ApiAlert message={apiError} />
        </div>
      </section>

      <section className="mg-container pb-12">
        <div className="space-y-6">
          <KpiStrip items={kpiItems} variant="inline" />

          {/* Spieler-Skin + Filter */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="group inline-flex items-center gap-3 rounded-xl"
                onClick={() => {
                  if (!skinFullUrl) return;
                  setSkinOpen(true);
                }}
                aria-label="3D Skin-Viewer öffnen"
              >
                <img
                  src={skinHeadUrl}
                  alt={playerName || uuidFull || ''}
                  className="border-border/70 h-14 w-14 rounded-xl border bg-black/20 object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!skinHeadFallback) return;
                    if (img.src !== skinHeadFallback) img.src = skinHeadFallback;
                  }}
                />
                <span className="text-muted inline-flex items-center gap-2 text-xs">
                  <Info size={16} className="shrink-0" /> Skin-Viewer öffnen
                </span>
              </button>
            </div>

            <nav aria-label="Spielerstatistik Navigation">
              <div className="border-border bg-surface/70 md:bg-surface/55 overflow-x-auto rounded-[var(--radius)] border px-3 py-2">
                <ul className="flex w-max items-center gap-1" role="list">
                  {(
                    [
                      { key: 'allgemein', label: 'Allgemein', Icon: Sparkles },
                      { key: 'items', label: 'Gegenstände', Icon: Package },
                      { key: 'mobs', label: 'Kreaturen', Icon: Skull },
                    ] as const
                  ).map((it) => {
                    const isActive = it.key === activeTab;
                    const Icon = it.Icon;
                    return (
                      <li key={it.key}>
                        <button
                          type="button"
                          onClick={() => setActiveTab(it.key)}
                          className={[
                            'focus-visible:ring-offset-bg inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2',
                            isActive
                              ? 'bg-accent/15 border-accent/40 text-fg shadow-sm'
                              : 'text-fg/85 hover:text-fg hover:bg-surface/50 border-transparent',
                          ].join(' ')}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon size={16} className={isActive ? 'text-accent' : 'text-muted'} />
                          {it.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <label className="bg-surface/55 border-border flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 transition-colors">
                <Search size={18} className="text-muted" />
                <input
                  ref={filterInputRef}
                  value={filterRaw}
                  onChange={(e) => setFilterRaw(e.target.value)}
                  type="search"
                  placeholder='Filtern… (z. B. dirt, "zombie", "diamond")'
                  className="placeholder:text-muted/70 text-fg min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  className={['mg-search-clear', filterRaw ? '' : 'mg-search-clear--hidden'].join(
                    ' ',
                  )}
                  onClick={() => setFilterRaw('')}
                  aria-label="Filter leeren"
                  tabIndex={filterRaw ? 0 : -1}
                >
                  <X size={14} />
                </button>
              </label>
              <div className="text-muted flex flex-wrap items-center gap-3 text-xs lg:justify-end">
                <span>
                  {nf(activeResultCount)} Einträge in {activeTabLabel}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Slash size={12} /> Suche fokussieren
                </span>
              </div>
            </div>
          </div>

          {/* Tabellen */}
          {activeTab === 'allgemein' ? (
            <section className="border-border/70 overflow-hidden rounded-[var(--radius)] border">
              <div className="border-border/70 flex items-center justify-between gap-2 border-b px-4 py-3">
                <p className="text-fg text-sm font-semibold">Allgemein</p>
                <p className="text-muted text-xs">{nf(filtered.general.length)} Einträge</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-surface-solid/85 text-muted sticky top-0 z-10 text-xs backdrop-blur-md">
                    <tr>
                      <th
                        className={
                          'px-4 py-3 text-left font-semibold ' +
                          (sortGeneral.key === 'label' && sortGeneral.dir !== 'none'
                            ? 'bg-surface-solid/30'
                            : '')
                        }
                      >
                        <button
                          type="button"
                          className="inline-flex items-center gap-2"
                          onClick={() =>
                            setSortGeneral((s) => ({
                              key: 'label',
                              dir: s.key === 'label' ? nextSort(s.dir) : 'asc',
                            }))
                          }
                        >
                          Eintrag{' '}
                          <SortIcon dir={sortGeneral.key === 'label' ? sortGeneral.dir : 'none'} />
                        </button>
                      </th>
                      <th
                        className={
                          'px-4 py-3 text-left font-semibold ' +
                          (sortGeneral.key === 'value' && sortGeneral.dir !== 'none'
                            ? 'bg-surface-solid/30'
                            : '')
                        }
                      >
                        <button
                          type="button"
                          className="inline-flex items-center gap-2"
                          onClick={() =>
                            setSortGeneral((s) => ({
                              key: 'value',
                              dir: s.key === 'value' ? nextSort(s.dir) : 'asc',
                            }))
                          }
                        >
                          Wert{' '}
                          <SortIcon dir={sortGeneral.key === 'value' ? sortGeneral.dir : 'none'} />
                        </button>
                      </th>
                      <th
                        className={
                          'px-4 py-3 text-left font-semibold ' +
                          (sortGeneral.key === 'raw' && sortGeneral.dir !== 'none'
                            ? 'bg-surface-solid/30'
                            : '')
                        }
                      >
                        <button
                          type="button"
                          className="inline-flex items-center gap-2"
                          onClick={() =>
                            setSortGeneral((s) => ({
                              key: 'raw',
                              dir: s.key === 'raw' ? nextSort(s.dir) : 'asc',
                            }))
                          }
                        >
                          Technischer Schlüssel{' '}
                          <SortIcon dir={sortGeneral.key === 'raw' ? sortGeneral.dir : 'none'} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/75 [&>tr:hover]:bg-surface-solid/35 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3">
                    {filtered.general.map((r) => (
                      <tr key={r.raw}>
                        <td>{r.label}</td>
                        <td>{r.display}</td>
                        <td className="text-muted text-xs font-medium whitespace-nowrap">
                          {r.raw}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.general.length === 0 ? (
                <div className="px-4 pb-4">
                  <NoResults />
                </div>
              ) : null}

              <div className="border-border/70 text-muted border-t px-4 py-3 text-sm">
                Einige Werte werden zur besseren Lesbarkeit formatiert (z. B. Spielzeit in Stunden,{' '}
                <em>one_cm</em> in Kilometern).
              </div>
            </section>
          ) : null}

          {activeTab === 'items' ? (
            <section className="border-border/70 overflow-hidden rounded-[var(--radius)] border">
              <div className="border-border/70 flex items-center justify-between gap-2 border-b px-4 py-3">
                <p className="text-fg text-sm font-semibold">Gegenstände</p>
                <p className="text-muted text-xs">{nf(filtered.items.length)} Einträge</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-surface-solid/85 text-muted sticky top-0 z-10 text-xs backdrop-blur-md">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2"
                          onClick={() =>
                            setSortItems((s) => ({
                              key: 'label',
                              dir: s.key === 'label' ? nextSort(s.dir) : 'asc',
                            }))
                          }
                        >
                          Item <SortIcon dir={sortItems.key === 'label' ? sortItems.dir : 'none'} />
                        </button>
                      </th>
                      {(
                        [
                          ['mined', 'Abgebaut'],
                          ['broken', 'Verbraucht'],
                          ['crafted', 'Hergestellt'],
                          ['used', 'Benutzt'],
                          ['picked_up', 'Aufgesammelt'],
                          ['dropped', 'Fallen gelassen'],
                        ] as const
                      ).map(([key, label]) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-2"
                            onClick={() =>
                              setSortItems((s) => ({
                                key,
                                dir: s.key === key ? nextSort(s.dir) : 'asc',
                              }))
                            }
                          >
                            {label}{' '}
                            <SortIcon dir={sortItems.key === key ? sortItems.dir : 'none'} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-border/75 [&>tr:hover]:bg-surface-solid/35 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3">
                    {filtered.items.map((r) => (
                      <tr key={r.key}>
                        <td>{r.label}</td>
                        <td>{nf(r.mined)}</td>
                        <td>{nf(r.broken)}</td>
                        <td>{nf(r.crafted)}</td>
                        <td>{nf(r.used)}</td>
                        <td>{nf(r.picked_up)}</td>
                        <td>{nf(r.dropped)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.items.length === 0 ? (
                <div className="px-4 pb-4">
                  <NoResults />
                </div>
              ) : null}
            </section>
          ) : null}

          {activeTab === 'mobs' ? (
            <section className="border-border/70 overflow-hidden rounded-[var(--radius)] border">
              <div className="border-border/70 flex items-center justify-between gap-2 border-b px-4 py-3">
                <p className="text-fg text-sm font-semibold">Kreaturen</p>
                <p className="text-muted text-xs">{nf(filtered.mobs.length)} Einträge</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-surface-solid/85 text-muted sticky top-0 z-10 text-xs backdrop-blur-md">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2"
                          onClick={() =>
                            setSortMobs((s) => ({
                              key: 'label',
                              dir: s.key === 'label' ? nextSort(s.dir) : 'asc',
                            }))
                          }
                        >
                          Kreatur{' '}
                          <SortIcon dir={sortMobs.key === 'label' ? sortMobs.dir : 'none'} />
                        </button>
                      </th>
                      {(
                        [
                          ['killed', 'Getötet'],
                          ['killed_by', 'Gestorben durch'],
                        ] as const
                      ).map(([key, label]) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-2"
                            onClick={() =>
                              setSortMobs((s) => ({
                                key,
                                dir: s.key === key ? nextSort(s.dir) : 'asc',
                              }))
                            }
                          >
                            {label} <SortIcon dir={sortMobs.key === key ? sortMobs.dir : 'none'} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-border/75 [&>tr:hover]:bg-surface-solid/35 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3">
                    {filtered.mobs.map((r) => (
                      <tr key={r.key}>
                        <td>{r.label}</td>
                        <td>{nf(r.killed)}</td>
                        <td>{nf(r.killed_by)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.mobs.length === 0 ? (
                <div className="px-4 pb-4">
                  <NoResults />
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>

      <SkinViewerModal
        open={skinOpen}
        onClose={() => setSkinOpen(false)}
        skinUrl={skinFullUrl}
        playerUuid={uuidFull}
        playerName={playerName}
      />
    </div>
  );
}
