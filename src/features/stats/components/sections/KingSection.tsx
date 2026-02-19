import { Crown } from 'lucide-react';

import type { LeaderboardState } from '../../types-ui';
import { formatMetricValue } from '../../format';
import { StatsLayoutGrid, StatsLayoutMain, StatsLayoutRail } from '../../layout/StatsLayout';
import { LeaderboardTable } from '../LeaderboardTable';
import { StatValue } from '../StatValue';
import { SectionTitle } from '../StatsPrimitives';

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
    return toFiniteNumber((entry as { value?: unknown }).value ?? entry);
  }
  return toFiniteNumber(entry);
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
  const podium = king.pages[0] || [];
  const podiumEntries = podium.slice(0, 3);

  return (
    <StatsLayoutGrid>
      <StatsLayoutRail ariaLabel="Server-König Hinweise">
        <div className="mg-callout flex items-start gap-3" data-variant="info">
          <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
            <Crown size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-fg font-semibold">Wie werden die Punkte berechnet?</p>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              Für jede Kategorie bekommen die Top 3 Spieler Punkte (3 / 2 / 1). Ab Platz 4 gibt es
              keine Punkte. Die Punkte werden über alle Kategorien addiert.
            </p>
          </div>
        </div>
      </StatsLayoutRail>
      <StatsLayoutMain ariaLabel="Server-König Rangliste">
        <SectionTitle
          title="Server-König"
          subtitle="Wer sammelt die meisten Punkte über alle Kategorien hinweg?"
        />
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => {
              const entry = podiumEntries[index];
              const rank = index + 1;
              const score = resolveEntryScore(entry);
              const hasScore = score !== null;

              return (
                <section
                  key={`podium-${rank}`}
                  className="border-border/75 bg-surface-solid/35 relative overflow-hidden rounded-[var(--radius)] border px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-muted text-xs font-semibold tracking-[0.16em] uppercase">
                      Platz {rank}
                    </p>
                    {rank === 1 ? (
                      <div className="bg-accent/18 text-accent inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                        <Crown size={18} />
                      </div>
                    ) : (
                      <span className="inline-flex h-10 w-10 shrink-0" aria-hidden="true" />
                    )}
                  </div>

                  {entry ? (
                    <div
                      className={
                        hasScore
                          ? 'mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3'
                          : 'mt-3 space-y-3'
                      }
                    >
                      <button
                        type="button"
                        onClick={() => onPlayerClick(entry.uuid)}
                        className="text-fg hover:text-accent focus-visible:ring-offset-bg inline-flex min-w-0 items-center gap-2.5 overflow-hidden rounded-md text-left font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2"
                      >
                        <img
                          src={`https://minotar.net/helm/${encodeURIComponent(getPlayerName(entry.uuid))}/32.png`}
                          alt=""
                          className="h-8 w-8 flex-none rounded-lg bg-black/20"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="truncate">{getPlayerName(entry.uuid)}</span>
                      </button>
                      <StatValue
                        state={hasScore ? 'ok' : 'empty'}
                        value={
                          hasScore
                            ? formatMetricValue(score, { label: 'Punkte', category: 'King' })
                            : undefined
                        }
                        label="Punkte"
                        hint="Für diesen Platz wurden noch keine Punkte übermittelt."
                        className={hasScore ? 'text-right' : undefined}
                        valueClassName="text-fg text-3xl font-semibold tracking-tight whitespace-nowrap tabular-nums"
                      />
                    </div>
                  ) : (
                    <p className="text-muted mt-2 text-sm">Noch keine Daten verfügbar.</p>
                  )}
                </section>
              );
            })}
          </div>

          <div className="min-w-0">
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
