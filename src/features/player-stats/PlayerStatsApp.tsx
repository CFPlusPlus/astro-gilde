import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Info,
  Languages,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';

import { getPlayer, getTranslations } from './api';
import type { PlayerApiResponse, PlayerTranslations } from './types';
import { nf, nf2, matchQueries, parseFilter } from './format';
import { tLabel, logMissingTranslations } from './i18n';
import { compactUUID } from './uuid';
import SkinViewerModal from './SkinViewerModal';

type TabKey = 'allgemein' | 'items' | 'mobs';
type SortDir = 'none' | 'asc' | 'desc';

type GeneralRow = {
  raw: string;
  label: string;
  value: number;
  display: string;
};

type ItemsRow = {
  key: string;
  label: string;
  mined: number;
  broken: number;
  crafted: number;
  used: number;
  picked_up: number;
  dropped: number;
};

type MobsRow = {
  key: string;
  label: string;
  killed: number;
  killed_by: number;
};

type SortState<K extends string> = { key: K; dir: SortDir };

function nextSort(dir: SortDir): SortDir {
  if (dir === 'none') return 'asc';
  if (dir === 'asc') return 'desc';
  return 'none';
}

function fmtGenerated(iso: string) {
  try {
    const fmt = new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Berlin',
    });
    return `Stand: ${fmt.format(new Date(iso))}`;
  } catch {
    return `Stand: ${iso}`;
  }
}

function ApiAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="bg-accent/10 border-accent/40 mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm"
      role="alert"
    >
      <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" aria-hidden="true" />
      <span className="text-fg/90">{message}</span>
    </div>
  );
}

function NoResults() {
  return (
    <div className="bg-accent/10 border-accent/40 mt-3 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm shadow-sm">
      <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" aria-hidden="true" />
      <span className="text-fg/90">Keine Ergebnisse gefunden.</span>
    </div>
  );
}

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ChevronUp size={14} className="text-muted" aria-hidden="true" />;
  if (dir === 'desc') return <ChevronDown size={14} className="text-muted" aria-hidden="true" />;
  return <ChevronsUpDown size={14} className="text-muted" aria-hidden="true" />;
}

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

  // UUID copy UX
  const [uuidCopied, setUuidCopied] = useState(false);
  const uuidBtnRef = useRef<HTMLButtonElement | null>(null);
  const uuidMinWidthRef = useRef<number | null>(null);

  // Skin modal
  const [skinOpen, setSkinOpen] = useState(false);

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    const uuid = (qp.get('uuid') || '').trim();
    setUuidParam(uuid);
  }, []);

  // Load: translations + player
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
        // eslint-disable-next-line no-console
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Console helper für Übersetzungen (wichtig für Pflege, stört Nutzer nicht)
    try {
      if (data.player && typeof data.player === 'object') {
        logMissingTranslations(data.player as Record<string, unknown>, t);
      }
    } catch {
      // ignore
    }
  }

  // Title
  useEffect(() => {
    if (!playerName) return;
    document.title = `Minecraft Gilde - Spielerstatistik von ${playerName}`;
  }, [playerName]);

  // UUID min-width messen (damit "Kopiert!" nicht springt)
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

  const tables = useMemo(() => {
    const s = stats;
    if (!s) return { general: [] as GeneralRow[], items: [] as ItemsRow[], mobs: [] as MobsRow[] };

    const asObj = (v: unknown) =>
      v && typeof v === 'object' ? (v as Record<string, number>) : null;

    // Allgemein
    const custom = asObj((s as Record<string, unknown>)['minecraft:custom']) || {};
    const HOUR_KEYS = new Set([
      'minecraft:play_time',
      'minecraft:sneak_time',
      'minecraft:time_since_death',
      'minecraft:time_since_rest',
      'minecraft:total_world_time',
    ]);

    const general: GeneralRow[] = Object.entries(custom)
      .filter(([, v]) => typeof v === 'number')
      .map(([raw, value]) => {
        const label = tLabel(raw, 'stat', isGerman, translations);
        const val = value as number;

        let display = nf(val);
        if (HOUR_KEYS.has(raw)) {
          display = `${nf2(val / 72000)} h`;
        } else if (raw.endsWith('_one_cm')) {
          display = `${nf2(val / 100000)} km`;
        }

        return { raw, label, value: val, display };
      });

    // Items
    const mined = asObj((s as Record<string, unknown>)['minecraft:mined']) || {};
    const broken = asObj((s as Record<string, unknown>)['minecraft:broken']) || {};
    const crafted = asObj((s as Record<string, unknown>)['minecraft:crafted']) || {};
    const used = asObj((s as Record<string, unknown>)['minecraft:used']) || {};
    const picked = asObj((s as Record<string, unknown>)['minecraft:picked_up']) || {};
    const dropped = asObj((s as Record<string, unknown>)['minecraft:dropped']) || {};

    const itemKeys = new Set([
      ...Object.keys(mined),
      ...Object.keys(broken),
      ...Object.keys(crafted),
      ...Object.keys(used),
      ...Object.keys(picked),
      ...Object.keys(dropped),
    ]);

    const items: ItemsRow[] = [...itemKeys].map((k) => {
      const label = tLabel(k, 'item', isGerman, translations);
      return {
        key: k,
        label,
        mined: mined[k] || 0,
        broken: broken[k] || 0,
        crafted: crafted[k] || 0,
        used: used[k] || 0,
        picked_up: picked[k] || 0,
        dropped: dropped[k] || 0,
      };
    });

    // Mobs
    const killed = asObj((s as Record<string, unknown>)['minecraft:killed']) || {};
    const killedBy = asObj((s as Record<string, unknown>)['minecraft:killed_by']) || {};
    const mobKeys = new Set([...Object.keys(killed), ...Object.keys(killedBy)]);
    const mobs: MobsRow[] = [...mobKeys].map((k) => {
      const label = tLabel(k, 'mob', isGerman, translations);
      return {
        key: k,
        label,
        killed: killed[k] || 0,
        killed_by: killedBy[k] || 0,
      };
    });

    return { general, items, mobs };
  }, [stats, isGerman, translations]);

  const sorted = useMemo(() => {
    const sortGeneralRows = (rows: GeneralRow[]) => {
      const { key, dir } = sortGeneral;
      const base = [...rows];
      const factor = dir === 'desc' ? -1 : 1;
      if (dir === 'none') return base.sort((a, b) => a.label.localeCompare(b.label, 'de'));
      return base.sort((a, b) => {
        if (key === 'value') return (a.value - b.value) * factor;
        const av = String(a[key]);
        const bv = String(b[key]);
        return av.localeCompare(bv, 'de') * factor;
      });
    };

    const sortItemsRows = (rows: ItemsRow[]) => {
      const { key, dir } = sortItems;
      const base = [...rows];
      const factor = dir === 'desc' ? -1 : 1;
      if (dir === 'none') return base.sort((a, b) => a.label.localeCompare(b.label, 'de'));

      return base.sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
        return String(av).localeCompare(String(bv), 'de') * factor;
      });
    };

    const sortMobsRows = (rows: MobsRow[]) => {
      const { key, dir } = sortMobs;
      const base = [...rows];
      const factor = dir === 'desc' ? -1 : 1;
      if (dir === 'none') return base.sort((a, b) => a.label.localeCompare(b.label, 'de'));

      return base.sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
        return String(av).localeCompare(String(bv), 'de') * factor;
      });
    };

    return {
      general: sortGeneralRows(tables.general),
      items: sortItemsRows(tables.items),
      mobs: sortMobsRows(tables.mobs),
    };
  }, [tables, sortGeneral, sortItems, sortMobs]);

  const filtered = useMemo(() => {
    const general = sorted.general.filter((r) =>
      matchQueries(parsedQueries, r.label, `${r.label} ${r.display} ${r.raw}`),
    );

    const items = sorted.items.filter((r) =>
      matchQueries(
        parsedQueries,
        r.label,
        `${r.label} ${r.mined} ${r.broken} ${r.crafted} ${r.used} ${r.picked_up} ${r.dropped}`,
      ),
    );

    const mobs = sorted.mobs.filter((r) =>
      matchQueries(parsedQueries, r.label, `${r.label} ${r.killed} ${r.killed_by}`),
    );

    return { general, items, mobs };
  }, [sorted, parsedQueries]);

  const canRender = !!uuidParam;

  const uuidButtonText = uuidCopied ? 'Kopiert!' : uuidFull;

  return (
    <div>
      <section className="mg-container pt-12 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Spielerstatistik{' '}
          <span className="text-accent">{playerName ? playerName : canRender ? 'Lädt…' : ''}</span>
        </h1>
        <p className="text-muted mt-2 max-w-3xl">
          Alle Werte, Items und Kreaturen eines Spielers – inklusive Filter und Sortierung.
        </p>
      </section>

      <section className="mg-container pb-12">
        <div className="glass overflow-hidden rounded-[var(--radius)] shadow-sm">
          {/* Tabs */}
          <div
            className="border-border flex flex-wrap items-center gap-1 border-b px-4"
            role="tablist"
            aria-label="Spielerstatistik Tabs"
          >
            {(
              [
                { key: 'allgemein', label: 'Allgemein' },
                { key: 'items', label: 'Gegenstände' },
                { key: 'mobs', label: 'Kreaturen' },
              ] as const
            ).map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={[
                    'tab-btn focus-visible:ring-offset-bg -mb-px inline-flex items-center justify-center border-b-2 px-3 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2',
                    isActive
                      ? 'text-fg border-accent'
                      : 'text-muted hover:border-border/60 hover:text-fg border-transparent',
                  ].join(' ')}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Meta row + actions */}
          <div className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  className="bg-surface border-border text-fg hover:bg-surface-solid/70 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors"
                  style={
                    uuidMinWidthRef.current
                      ? { minWidth: `${uuidMinWidthRef.current}px` }
                      : undefined
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
                        // ignore
                      });
                  }}
                >
                  {uuidButtonText}
                </button>

                {generatedIso ? (
                  <span className="bg-surface border-border text-muted inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md">
                    {fmtGenerated(generatedIso)}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={isGerman}
                  title="Zwischen Deutsch und Original wechseln"
                  className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur-md transition-colors"
                  onClick={() => setIsGerman((v) => !v)}
                >
                  <Languages size={16} />
                  <span className="label">{isGerman ? 'DE' : 'EN'}</span>
                </button>
              </div>
            </div>

            <ApiAlert message={apiError} />
          </div>
        </div>

        {/* Player skin + filter */}
        <div className="mt-6 grid gap-4 sm:grid-cols-[160px_1fr]">
          <div className="bg-surface border-border overflow-hidden rounded-[var(--radius)] border p-3 shadow-sm backdrop-blur-md">
            <button
              type="button"
              className="block w-full"
              onClick={() => {
                if (!skinFullUrl) return;
                setSkinOpen(true);
              }}
              aria-label="3D Skin-Viewer öffnen"
            >
              <img
                src={skinHeadUrl}
                alt={playerName || uuidFull || ''}
                className="aspect-square w-full rounded-[calc(var(--radius)-6px)] bg-black/20 object-cover"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!skinHeadFallback) return;
                  if (img.src !== skinHeadFallback) img.src = skinHeadFallback;
                }}
              />
            </button>
            <p className="text-muted mt-3 flex items-center gap-2 text-xs">
              <Info size={14} /> Klick auf den Kopf öffnet den 3D-Skin-Viewer.
            </p>
          </div>

          <div className="bg-surface border-border rounded-[var(--radius)] border p-4 shadow-sm backdrop-blur-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-xl">
                <div className="bg-surface-solid/30 border-border flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2">
                  <Search size={18} className="text-muted" />
                  <input
                    value={filterRaw}
                    onChange={(e) => setFilterRaw(e.target.value)}
                    type="search"
                    placeholder='Filtern… (z. B. dirt, "zombie", "diamond")'
                    className="placeholder:text-muted/70 text-fg w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <p className="text-muted text-xs sm:text-right">
                Tipp: Klicke auf die Spaltenköpfe zum Sortieren.
              </p>
            </div>
          </div>
        </div>

        {/* Tabellen */}
        {activeTab === 'allgemein' ? (
          <section className="mt-6">
            <div className="bg-surface border-border overflow-x-auto rounded-[var(--radius)] border shadow-sm backdrop-blur-md">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface-solid/40 text-muted text-xs">
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
                <tbody className="divide-border [&>tr:hover]:bg-surface-solid/40 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3">
                  {filtered.general.map((r) => (
                    <tr key={r.raw}>
                      <td>{r.label}</td>
                      <td>{r.display}</td>
                      <td className="text-muted text-xs font-medium whitespace-nowrap">{r.raw}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.general.length === 0 ? <NoResults /> : null}

            <div className="bg-surface border-border text-muted mt-3 rounded-[var(--radius)] border px-4 py-3 text-sm shadow-sm backdrop-blur-md">
              Einige Werte werden zur besseren Lesbarkeit formatiert (z. B. Spielzeit in Stunden,{' '}
              <em>one_cm</em> in Kilometern).
            </div>
          </section>
        ) : null}

        {activeTab === 'items' ? (
          <section className="mt-6">
            <div className="bg-surface border-border overflow-x-auto rounded-[var(--radius)] border shadow-sm backdrop-blur-md">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-surface-solid/40 text-muted text-xs">
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
                      <th key={key} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
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
                          {label} <SortIcon dir={sortItems.key === key ? sortItems.dir : 'none'} />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border [&>tr:hover]:bg-surface-solid/40 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3">
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
            {filtered.items.length === 0 ? <NoResults /> : null}
          </section>
        ) : null}

        {activeTab === 'mobs' ? (
          <section className="mt-6">
            <div className="bg-surface border-border overflow-x-auto rounded-[var(--radius)] border shadow-sm backdrop-blur-md">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-surface-solid/40 text-muted text-xs">
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
                        Kreatur <SortIcon dir={sortMobs.key === 'label' ? sortMobs.dir : 'none'} />
                      </button>
                    </th>
                    {(
                      [
                        ['killed', 'Getötet'],
                        ['killed_by', 'Gestorben durch'],
                      ] as const
                    ).map(([key, label]) => (
                      <th key={key} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
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
                <tbody className="divide-border [&>tr:hover]:bg-surface-solid/40 divide-y [&>tr>td]:px-4 [&>tr>td]:py-3">
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
            {filtered.mobs.length === 0 ? <NoResults /> : null}
          </section>
        ) : null}
      </section>

      <SkinViewerModal open={skinOpen} onClose={() => setSkinOpen(false)} skinUrl={skinFullUrl} />
    </div>
  );
}
