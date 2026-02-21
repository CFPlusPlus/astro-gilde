import { ChevronDown, Crown } from 'lucide-react';

import type { LeaderboardState } from '../../types-ui';
import { formatMetricValue } from '../../format';
import { StatsLayoutGrid, StatsLayoutMain, StatsLayoutRail } from '../../layout/StatsLayout';
import { LeaderboardTable } from '../LeaderboardTable';
import { LiveBadgeSlot, type LiveBadgeVariant } from '../LiveBadge';
import { SectionTitle } from '../StatsPrimitives';
import { LIVE_COPY_DE, getLiveMessage } from '../../../../lib/live/copy.de';

function toFiniteNumber(value: unknown, depth = 0): number | null {
  if (depth > 2) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const compact = value.trim().replace(/\s+/g, '');
    const normalizedThousands = compact.replace(/(\d)\.(?=\d{3}(\D|$))/g, '$1');
    const normalized = normalizedThousands.replace(',', '.');
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = toFiniteNumber(item, depth + 1);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    const direct = Number(value);
    if (Number.isFinite(direct)) return direct;

    const record = value as Record<string, unknown>;
    const preferredKeys = ['value', 'points', 'score', 'punkte', 'punktzahl', 'raw'];
    for (const key of preferredKeys) {
      if (!(key in record)) continue;
      const parsed = toFiniteNumber(record[key], depth + 1);
      if (parsed !== null) return parsed;
    }
    for (const nested of Object.values(record)) {
      const parsed = toFiniteNumber(nested, depth + 1);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}

function resolveEntryScore(entry: unknown): number | null {
  if (!entry) return null;
  if (typeof entry === 'object' && 'value' in entry) {
    const parsedValue = toFiniteNumber((entry as { value?: unknown }).value);
    if (parsedValue !== null) return parsedValue;
  }
  return toFiniteNumber(entry);
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeCategoryLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function resolveEntryUuid(entry: unknown): string | null {
  const record = toRecord(entry);
  if (!record) return null;

  const directUuidCandidates = [
    record.uuid,
    record.player_uuid,
    record.playerUuid,
    record.player_id,
    record.playerId,
  ];

  for (const candidate of directUuidCandidates) {
    const uuid = readString(candidate);
    if (uuid) return uuid;
  }

  if (record.player && typeof record.player === 'object') {
    const playerRecord = record.player as Record<string, unknown>;
    const nestedUuid = readString(playerRecord.uuid ?? playerRecord.id);
    if (nestedUuid) return nestedUuid;
  }

  return null;
}

function resolveEntryName(entry: unknown): string | null {
  const record = toRecord(entry);
  if (!record) return null;

  const directNameCandidates = [
    record.name,
    record.player_name,
    record.playerName,
    record.username,
  ];

  for (const candidate of directNameCandidates) {
    const name = readString(candidate);
    if (name) return name;
  }

  if (record.player && typeof record.player === 'object') {
    const playerRecord = record.player as Record<string, unknown>;
    const nestedName = readString(playerRecord.name ?? playerRecord.username);
    if (nestedName) return nestedName;
  }

  return null;
}

type KingBreakdownItem = {
  label: string;
  value: number | null;
};

type KingBreakdown = {
  wonCategories: number | null;
  topCategories: KingBreakdownItem[];
};

type KingTopEntry = {
  rank: number;
  uuid: string | null;
  name: string | null;
  score: number | null;
  breakdown: KingBreakdown | null;
};

function parseTopCategoryItems(value: unknown): KingBreakdownItem[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => parseTopCategoryItems(item));
  }

  if (typeof value === 'string') {
    const label = normalizeCategoryLabel(value);
    if (!label) return [];
    return [{ label, value: null }];
  }

  const record = toRecord(value);
  if (!record) return [];

  const labelFromRecord = readString(
    record.label ?? record.name ?? record.category ?? record.metric ?? record.key ?? record.id,
  );
  const valueFromRecord = toFiniteNumber(
    record.value ?? record.count ?? record.wins ?? record.points ?? record.score ?? record.total,
  );
  if (labelFromRecord) {
    return [{ label: normalizeCategoryLabel(labelFromRecord), value: valueFromRecord }];
  }

  const mapped = Object.entries(record)
    .map(([rawLabel, rawValue]) => {
      const label = normalizeCategoryLabel(rawLabel);
      if (!label) return null;
      const numericValue = toFiniteNumber(rawValue);
      if (numericValue === null && typeof rawValue !== 'string') return null;
      return { label, value: numericValue };
    })
    .filter((item): item is KingBreakdownItem => Boolean(item));

  return mapped;
}

function normalizeTopCategoryItems(items: KingBreakdownItem[]): KingBreakdownItem[] {
  const deduped = new Map<string, KingBreakdownItem>();

  for (const item of items) {
    const label = normalizeCategoryLabel(item.label);
    if (!label) continue;

    const key = label.toLowerCase();
    const previous = deduped.get(key);

    if (!previous) {
      deduped.set(key, { label, value: item.value });
      continue;
    }

    if (previous.value === null && item.value !== null) {
      deduped.set(key, { label, value: item.value });
      continue;
    }

    if (previous.value !== null && item.value !== null && item.value > previous.value) {
      deduped.set(key, { label, value: item.value });
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => {
      if (a.value !== null && b.value !== null) return b.value - a.value;
      if (a.value !== null) return -1;
      if (b.value !== null) return 1;
      return a.label.localeCompare(b.label, 'de');
    })
    .slice(0, 6);
}

function resolveWonCategoriesCount(record: Record<string, unknown>): number | null {
  const directCandidates = [
    record.wonCategories,
    record.won_categories,
    record.categoriesWon,
    record.categories_won,
    record.categoryWins,
    record.category_wins,
    record.wins,
  ];

  for (const candidate of directCandidates) {
    const parsed = toFiniteNumber(candidate);
    if (parsed !== null) return parsed;
  }

  const nestedCandidates = [record.breakdown, record.details, record.meta, record.stats];
  for (const candidate of nestedCandidates) {
    const nested = toRecord(candidate);
    if (!nested) continue;

    const parsed = resolveWonCategoriesCount(nested);
    if (parsed !== null) return parsed;
  }

  return null;
}

function resolveTopCategories(record: Record<string, unknown>): KingBreakdownItem[] {
  const candidates = [
    record.topCategories,
    record.top_categories,
    record.categoryBreakdown,
    record.category_breakdown,
    record.breakdown,
    record.categories,
  ];

  for (const candidate of candidates) {
    const parsed = normalizeTopCategoryItems(parseTopCategoryItems(candidate));
    if (parsed.length > 0) return parsed;
  }

  const nestedCandidates = [record.details, record.meta, record.stats];
  for (const candidate of nestedCandidates) {
    const nested = toRecord(candidate);
    if (!nested) continue;
    const parsed = resolveTopCategories(nested);
    if (parsed.length > 0) return parsed;
  }

  return [];
}

function resolveEntryBreakdown(entry: unknown): KingBreakdown | null {
  const record = toRecord(entry);
  if (!record) return null;

  const wonCategories = resolveWonCategoriesCount(record);
  const topCategories = resolveTopCategories(record);

  if (wonCategories === null && topCategories.length === 0) return null;

  return { wonCategories, topCategories };
}

function resolveKingStateNotice(
  king: LeaderboardState,
  hasTopEntries: boolean,
): { text: string; variant: 'neutral' | 'warning' } | null {
  if (!king.loaded) {
    return {
      text: LIVE_COPY_DE.table_loading,
      variant: 'neutral',
    };
  }

  if (king.liveStatus === 'error') {
    const errorText =
      getLiveMessage({
        status: 'error',
        errorKind: king.liveErrorKind || 'unknown',
      }) || LIVE_COPY_DE.error_generic;

    if (king.loaded) {
      return {
        text: `${LIVE_COPY_DE.stale_hint} ${errorText}`,
        variant: 'neutral',
      };
    }

    return {
      text: errorText,
      variant: 'warning',
    };
  }

  if (king.liveStatus === 'stale') {
    return {
      text: LIVE_COPY_DE.stale_hint,
      variant: 'neutral',
    };
  }

  if (king.loaded && !king.loading && !hasTopEntries) {
    return {
      text: 'Noch keine Server-König-Punkte verfügbar. Die Rangliste erscheint automatisch, sobald Daten vorliegen.',
      variant: 'neutral',
    };
  }

  return null;
}

export function KingSection({
  king,
  pageSize,
  getPlayerName,
  onPlayerClick,
  onGoPage,
  onLoadMore,
}: {
  king: LeaderboardState;
  pageSize: number;
  getPlayerName: (uuid: string) => string;
  onPlayerClick: (uuid: string) => void;
  onGoPage: (pageIndex: number) => void;
  onLoadMore: () => void;
}) {
  const topEntries: KingTopEntry[] = (king.pages[0] || [])
    .slice(0, pageSize)
    .map((entry, index) => {
      const rank = index + 1;
      const uuid = resolveEntryUuid(entry);
      const nameFromEntry = resolveEntryName(entry);
      const nameFromCache = uuid ? readString(getPlayerName(uuid)) : null;

      return {
        rank,
        uuid,
        name: nameFromCache || nameFromEntry || uuid,
        score: resolveEntryScore(entry),
        breakdown: resolveEntryBreakdown(entry),
      };
    });

  const featuredBreakdown =
    topEntries.find(
      (entry) => entry.breakdown !== null && entry.breakdown.topCategories.length > 0,
    ) ||
    topEntries.find((entry) => entry.breakdown !== null) ||
    null;

  const hasTopEntries = topEntries.length > 0;
  const kingNotice = resolveKingStateNotice(king, hasTopEntries);
  const topThree = topEntries.slice(0, 3);

  const liveBadgeVariant: LiveBadgeVariant | null =
    king.liveErrorKind === 'rate_limit'
      ? 'rate_limit'
      : king.liveStatus === 'stale'
        ? 'stale'
        : king.liveStatus === 'error'
          ? 'error'
          : null;

  return (
    <StatsLayoutGrid>
      <StatsLayoutRail ariaLabel="Server-König Hinweise">
        <details className="group" open>
          <summary className="focus-visible:ring-offset-bg text-fg flex items-center justify-between gap-3 rounded-md py-1 font-semibold focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none">
            <span className="inline-flex min-w-0 items-center gap-2.5">
              <span className="bg-accent/15 text-accent inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                <Crown size={16} />
              </span>
              <span>Wie entstehen die Punkte?</span>
            </span>
            <ChevronDown
              size={16}
              className="text-muted shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>

          <div className="mt-3 space-y-3 text-sm">
            <p className="text-muted leading-relaxed">
              Pro Kategorie zählen nur die Top 3. Die Punkte werden über alle Kategorien addiert.
            </p>
            <ul className="mg-list divide-border/75 divide-y">
              <li className="flex items-center justify-between gap-3 py-2">
                <span className="text-fg/90">1. Platz</span>
                <strong className="text-fg tabular-nums">5 Punkte</strong>
              </li>
              <li className="flex items-center justify-between gap-3 py-2">
                <span className="text-fg/90">2. Platz</span>
                <strong className="text-fg tabular-nums">3 Punkte</strong>
              </li>
              <li className="flex items-center justify-between gap-3 py-2">
                <span className="text-fg/90">3. Platz</span>
                <strong className="text-fg tabular-nums">1 Punkt</strong>
              </li>
              <li className="flex items-center justify-between gap-3 py-2">
                <span className="text-fg/90">Ab Platz 4</span>
                <strong className="text-muted tabular-nums">0 Punkte</strong>
              </li>
            </ul>
          </div>
        </details>

        {featuredBreakdown?.breakdown ? (
          <section className="border-border/75 mt-4 border-t pt-4">
            <p className="text-fg text-sm font-semibold">Breakdown</p>
            <p className="text-muted mt-1 text-xs">
              {featuredBreakdown.name ? featuredBreakdown.name : `Platz ${featuredBreakdown.rank}`}
            </p>

            {featuredBreakdown.breakdown.wonCategories !== null ? (
              <div className="border-border/75 mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <span className="text-fg/85 text-sm">Gewonnene Kategorien</span>
                <strong className="text-fg text-base tabular-nums">
                  {formatMetricValue(featuredBreakdown.breakdown.wonCategories, {
                    label: 'Kategorien',
                    category: 'King',
                  })}
                </strong>
              </div>
            ) : null}

            {featuredBreakdown.breakdown.topCategories.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-fg/85 text-xs font-semibold tracking-wide uppercase">
                  Top Kategorien
                </p>
                <ul className="space-y-1.5">
                  {featuredBreakdown.breakdown.topCategories.map((category) => (
                    <li
                      key={`${featuredBreakdown.rank}-${category.label}`}
                      className="bg-surface-solid/35 border-border/70 flex items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      <span className="text-fg/90 truncate">{category.label}</span>
                      {category.value !== null ? (
                        <span className="text-muted shrink-0 tabular-nums">{category.value}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </StatsLayoutRail>

      <StatsLayoutMain ariaLabel="Server-König Rangliste">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <SectionTitle
              title="Server-König"
              subtitle="Hier siehst du sofort, wer aktuell die meisten Server-König-Punkte hat."
            />
          </div>
          <LiveBadgeSlot variant={liveBadgeVariant} className="shrink-0" />
        </div>

        <div className="mt-5 space-y-5">
          {kingNotice ? (
            <div className="mg-notice text-sm" data-variant={kingNotice.variant} role="status">
              <span className="text-fg/90">{kingNotice.text}</span>
            </div>
          ) : null}

          <section className="border-border/75 bg-surface-solid/25 rounded-[var(--radius)] border p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-fg text-sm font-semibold">Top 3 Scoreboard</p>
                <p className="text-muted mt-1 text-xs">
                  Die drei aktuell stärksten Spieler auf einen Blick.
                </p>
              </div>
            </div>

            {!king.loaded ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={`king-skeleton-${index}`}
                    className="bg-surface-solid/35 border-border/65 rounded-xl border p-4"
                    aria-hidden="true"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="bg-surface-solid/45 inline-flex h-5 w-14 animate-pulse rounded-md" />
                      <span className="bg-surface-solid/45 inline-flex h-8 w-8 animate-pulse rounded-full" />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="bg-surface-solid/45 inline-flex h-14 w-14 animate-pulse rounded-xl" />
                      <span className="bg-surface-solid/45 inline-flex h-5 w-[65%] animate-pulse rounded-md" />
                    </div>
                    <span className="bg-surface-solid/45 mt-5 inline-flex h-9 w-28 animate-pulse rounded-md" />
                  </div>
                ))}
              </div>
            ) : null}

            {king.loaded && hasTopEntries ? (
              <ol className="mt-4 grid gap-3 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => {
                  const entry = topThree[index];
                  const rank = index + 1;

                  if (!entry) {
                    return (
                      <li
                        key={`top-empty-${rank}`}
                        className="border-border/65 bg-surface-solid/35 rounded-xl border p-4"
                      >
                        <p className="text-muted text-xs font-semibold tracking-[0.14em] uppercase">
                          Platz {rank}
                        </p>
                        <p className="text-muted mt-3 text-sm">Noch keine Daten verfügbar.</p>
                      </li>
                    );
                  }

                  const hasScore = entry.score !== null;
                  const cardClass = [
                    'group h-full border rounded-2xl p-4 text-left transition-all',
                    rank === 1
                      ? 'border-accent/55 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--accent)_12%,transparent)_0%,color-mix(in_oklab,var(--surface-solid)_88%,transparent)_100%)] shadow-[0_12px_30px_-24px_var(--glass-shadow-color)]'
                      : rank === 2
                        ? 'border-border/70 bg-surface-solid/46 shadow-[0_10px_24px_-24px_var(--glass-shadow-color)]'
                        : 'border-border/70 bg-[color-mix(in_oklab,#d99a6c_8%,var(--surface-solid)_92%)] shadow-[0_10px_24px_-24px_var(--glass-shadow-color)]',
                  ].join(' ');

                  const cardContent = (
                    <div className="flex h-full flex-col">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-muted text-xs font-semibold tracking-[0.14em] uppercase">
                          Platz {rank}
                        </p>
                        <span className={`mg-rank-medal mg-rank-medal--${rank}`} aria-hidden="true">
                          {rank}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        {entry.name ? (
                          <img
                            src={`https://minotar.net/helm/${encodeURIComponent(entry.name)}/64.png`}
                            alt=""
                            className={[
                              'flex-none rounded-xl bg-black/20',
                              rank === 1 ? 'h-14 w-14' : 'h-11 w-11',
                            ].join(' ')}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span
                            className={[
                              'bg-surface-solid/45 inline-flex items-center justify-center rounded-xl',
                              rank === 1 ? 'h-14 w-14' : 'h-11 w-11',
                            ].join(' ')}
                            aria-hidden="true"
                          />
                        )}
                        <div className="min-w-0">
                          <p
                            className={[
                              'text-fg text-base leading-tight font-semibold break-words whitespace-normal',
                              rank === 1 ? 'sm:text-lg' : 'sm:text-[1.02rem]',
                            ].join(' ')}
                          >
                            {entry.name || 'Spieler unbekannt'}
                          </p>
                          {entry.breakdown?.wonCategories != null ? (
                            <p className="text-muted mt-1 text-xs">
                              {formatMetricValue(entry.breakdown.wonCategories, {
                                label: 'Kategorien',
                                category: 'King',
                              })}{' '}
                              gewonnene Kategorien
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-auto inline-flex items-end gap-2 pt-5">
                        <span
                          className={[
                            'text-fg shrink-0 font-semibold tabular-nums',
                            rank === 1 ? 'text-4xl' : 'text-[2.05rem]',
                          ].join(' ')}
                        >
                          {hasScore
                            ? formatMetricValue(entry.score!, { label: 'Punkte', category: 'King' })
                            : '-'}
                        </span>
                        <span className="text-muted pb-1 text-[11px] font-semibold tracking-wide uppercase">
                          Punkte
                        </span>
                      </div>
                    </div>
                  );

                  return (
                    <li key={`top-${entry.rank}-${entry.uuid || entry.name || 'unknown'}`}>
                      {entry.uuid ? (
                        <button
                          type="button"
                          onClick={() => onPlayerClick(entry.uuid!)}
                          className={[
                            cardClass,
                            'focus-visible:ring-offset-bg hover:border-accent/45 hover:bg-surface-solid/55 w-full hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none',
                          ].join(' ')}
                        >
                          {cardContent}
                        </button>
                      ) : (
                        <div className={cardClass}>{cardContent}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : null}

            {king.loaded && !king.loading && !hasTopEntries ? (
              <div className="border-border/70 bg-surface-solid/35 mt-4 rounded-lg border px-4 py-3">
                <p className="text-fg text-sm font-semibold">Noch kein Server-König vorhanden</p>
                <p className="text-muted mt-1 text-sm leading-relaxed">
                  Aktuell wurden keine Punkte übermittelt. Sobald Daten vorliegen, erscheint hier
                  automatisch das Top 3 Scoreboard.
                </p>
              </div>
            ) : null}
          </section>

          <div className="min-w-0">
            <p className="text-muted mb-2 text-xs font-semibold">Komplette Rangliste</p>
            <LeaderboardTable
              metricKey="king"
              def={{ label: 'Punkte', category: 'King' }}
              state={king}
              pageSize={pageSize}
              getPlayerName={getPlayerName}
              onPlayerClick={onPlayerClick}
              onGoPage={onGoPage}
              onLoadMore={onLoadMore}
              surface={false}
            />
          </div>
        </div>
      </StatsLayoutMain>
    </StatsLayoutGrid>
  );
}
