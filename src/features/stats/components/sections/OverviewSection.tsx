import { useMemo, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRight, CalendarDays, Clock, Map as MapIcon, Sparkles, Swords, X } from 'lucide-react';

import { KPI_FALLBACK_DEFS, KPI_METRICS } from '../../constants';
import { fmtNumber, formatMetricValue } from '../../format';
import { StatsLayoutGrid, StatsLayoutMain, StatsLayoutRail } from '../../layout/StatsLayout';
import { StatValue, type StatValueState } from '../StatValue';
import { SectionTitle } from '../StatsPrimitives';
import { resolveLiveDataStatus } from '../../../../lib/live/types';
import { LIVE_COPY_DE } from '../../../../lib/live/copy.de';
import type { WorldState } from '../../types';

type OverviewSectionProps = {
  showWelcome: boolean;
  onDismissWelcome: () => void;
  onOpenRankings: (metricId?: string | string[]) => void;
  navigationDisabled: boolean;
  totals: Record<string, number> | null;
  worldState: WorldState | null;
  worldStateLoaded: boolean;
  worldStateLoading: boolean;
  worldStateError: string | null;
  summaryLoaded: boolean;
  summaryLoading: boolean;
  summaryError: string | null;
  onRetrySummary: () => void;
  summaryRetryDisabled: boolean;
  summaryRetryInSeconds: number;
};

type OverviewItemState = {
  state: StatValueState;
  hint?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  retryDisabledHint?: string;
};

type OverviewItem = OverviewItemState & {
  id: string;
  icon: ReactNode;
  label: string;
  value?: string;
};

type RankingQuicklink = {
  label: string;
  metricIds: string[];
};

const ICON_BY_KPI_ID: Record<string, ReactNode> = {
  hours: <Clock size={16} />,
  distance: <MapIcon size={16} />,
  mob_kills: <Swords size={16} />,
};

const RANKING_QUICKLINKS: RankingQuicklink[] = [
  {
    label: 'Diamanterz abgebaut',
    metricIds: ['diamond_ore', 'minecraft:diamond_ore', 'diamond'],
  },
  {
    label: 'Truhen ge\u00f6ffnet',
    metricIds: ['open_chest', 'minecraft:open_chest', 'stat:minecraft:open_chest'],
  },
  {
    label: 'Im Bett geschlafen',
    metricIds: ['sleep_in_bed', 'minecraft:sleep_in_bed', 'stat:minecraft:sleep_in_bed'],
  },
];

function getRetryWaitText(summaryRetryDisabled: boolean, summaryRetryInSeconds: number) {
  if (!summaryRetryDisabled || summaryRetryInSeconds <= 0) return null;
  return LIVE_COPY_DE.retry_wait(summaryRetryInSeconds);
}

function getSummaryItemState({
  value,
  label,
  totals,
  summaryLoaded,
  summaryLoading,
  summaryError,
  onRetrySummary,
  summaryRetryDisabled,
  retryWaitText,
}: {
  value: number | undefined;
  label: string;
  totals: Record<string, number> | null;
  summaryLoaded: boolean;
  summaryLoading: boolean;
  summaryError: string | null;
  onRetrySummary: () => void;
  summaryRetryDisabled: boolean;
  retryWaitText: string | null;
}): OverviewItemState {
  const state = resolveLiveDataStatus({
    loading: summaryLoading,
    loaded: summaryLoaded,
    hasData: typeof value === 'number',
    hasSnapshot: Boolean(totals),
    error: summaryError ? { kind: 'unknown', message: summaryError } : null,
  });

  if (state === 'loading') return { state };

  if (state === 'error') {
    return {
      state,
      hint: retryWaitText || LIVE_COPY_DE.summary_error_hint,
      onRetry: onRetrySummary,
      retryDisabled: summaryRetryDisabled,
      retryDisabledHint: retryWaitText || undefined,
    };
  }

  if (state === 'stale' && summaryLoading) {
    return { state, hint: LIVE_COPY_DE.summary_stale_refreshing };
  }

  if (state === 'stale' && summaryError) {
    return { state, hint: LIVE_COPY_DE.summary_stale_failed };
  }

  if (state === 'empty') {
    return { state, hint: LIVE_COPY_DE.summary_missing_metric(label) };
  }

  return { state: 'ok' };
}

function getWorldAgeDetails({
  worldState,
  worldStateLoaded,
  worldStateLoading,
  worldStateError,
}: Pick<
  OverviewSectionProps,
  'worldState' | 'worldStateLoaded' | 'worldStateLoading' | 'worldStateError'
>) {
  const days =
    typeof worldState?.ageDays === 'number' && Number.isFinite(worldState.ageDays)
      ? worldState.ageDays
      : undefined;
  const state = resolveLiveDataStatus({
    loading: worldStateLoading,
    loaded: worldStateLoaded,
    hasData: typeof days === 'number',
    hasSnapshot: Boolean(worldState),
    error: worldStateError ? { kind: 'unknown', message: worldStateError } : null,
  });

  return {
    state,
    value: typeof days === 'number' ? fmtNumber(days) : undefined,
    hint: getWorldAgeHint(state, days, worldStateLoading, worldStateError),
  };
}

function getWorldAgeHint(
  state: StatValueState,
  days: number | undefined,
  worldStateLoading: boolean,
  worldStateError: string | null,
) {
  if (state === 'empty') return 'Das Weltalter wurde vom Server noch nicht geliefert.';
  if (state === 'stale' && worldStateLoading) return LIVE_COPY_DE.summary_stale_refreshing;
  if (state === 'stale' && worldStateError) return LIVE_COPY_DE.summary_stale_failed;

  return worldStateError || `${days === 1 ? 'Minecraft-Tag' : 'Minecraft-Tage'} seit Weltstart.`;
}

function WelcomePanel({
  showWelcome,
  onDismissWelcome,
}: Pick<OverviewSectionProps, 'showWelcome' | 'onDismissWelcome'>) {
  if (!showWelcome) {
    return (
      <div
        className="mg-notice mt-0 mb-3 flex w-full items-start text-sm"
        data-variant="neutral"
        role="status"
      >
        <span
          className="bg-accent/15 text-accent inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg"
          aria-hidden="true"
        >
          <Sparkles size={14} />
        </span>
        <span className="text-fg/90">
          Willkommen-Hinweis ausgeblendet. Du kannst direkt mit den Kennzahlen arbeiten.
        </span>
      </div>
    );
  }

  return (
    <div
      className="mg-callout relative flex h-full w-full items-start gap-3 overflow-hidden"
      data-variant="info"
    >
      <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
        <Sparkles size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-fg font-semibold">Willkommen auf der Statistik-Seite!</p>
        <p className="text-muted mt-1 text-sm leading-relaxed break-words">
          Nutze die Suche oben, um direkt zur Spielerstatistik zu springen. In den Ranglisten
          findest du die Top-Werte je Kategorie, von Spielzeit &uuml;ber Distanz bis zu Kreaturen.
        </p>
      </div>
      <button
        type="button"
        className="text-muted hover:text-fg -m-1 rounded-lg p-1 transition-colors"
        aria-label="Schlie&szlig;en"
        onClick={onDismissWelcome}
      >
        <X size={18} />
      </button>
    </div>
  );
}

function QuicklinksPanel({
  navigationDisabled,
  onOpenRankings,
}: Pick<OverviewSectionProps, 'navigationDisabled' | 'onOpenRankings'>) {
  return (
    <section className="border-border/75 mt-4 border-t pt-4" aria-label="Schnellzugriff">
      <p className="text-fg text-sm font-semibold">Quicklinks</p>
      <div className="mt-3 grid gap-2">
        {RANKING_QUICKLINKS.map((quicklink) => (
          <button
            key={quicklink.label}
            type="button"
            className="mg-btn mg-btn--sm mg-btn--surface w-full justify-between"
            onClick={() => onOpenRankings(quicklink.metricIds)}
            disabled={navigationDisabled}
          >
            {quicklink.label}
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
    </section>
  );
}

function WorldAgePanel({
  state,
  value,
  hint,
  onRetrySummary,
  summaryRetryDisabled,
  retryWaitText,
}: {
  state: StatValueState;
  value?: string;
  hint: string;
  onRetrySummary: () => void;
  summaryRetryDisabled: boolean;
  retryWaitText: string | null;
}) {
  return (
    <section className="mg-app-panel mg-app-panel--strong relative overflow-hidden px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-5">
      <div className="bg-accent/18 text-accent absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-xl">
        <CalendarDays size={16} />
      </div>
      <p className="text-muted pr-12 text-xs font-semibold tracking-[0.16em] uppercase">Leitwert</p>
      <p className="text-fg mt-2 text-lg font-semibold tracking-tight">Weltalter</p>
      <StatValue
        state={state}
        value={value}
        label="Weltalter"
        hint={hint}
        onRetry={state === 'error' ? onRetrySummary : undefined}
        retryDisabled={summaryRetryDisabled}
        retryDisabledHint={retryWaitText || undefined}
        className="mt-2"
        valueClassName="text-fg text-3xl font-semibold tracking-tight"
      />
    </section>
  );
}

function TotalsPanel({
  rows,
  navigationDisabled,
  onActivate,
}: {
  rows: OverviewItem[];
  navigationDisabled: boolean;
  onActivate: (metricId: string) => void;
}) {
  return (
    <div className="mg-app-panel mg-app-panel--soft overflow-hidden">
      <div className="border-border/75 border-b px-4 py-3 sm:px-5">
        <p className="text-fg text-sm font-semibold">Serverweite Gesamtwerte</p>
        <p className="text-muted mt-1 text-xs">Alle Spieler zusammengez&auml;hlt.</p>
      </div>
      <ul className="mg-list divide-border/75 divide-y text-sm">
        {rows.map((item) => (
          <OverviewTotalRow
            key={item.id}
            item={item}
            navigationDisabled={navigationDisabled}
            onActivate={onActivate}
          />
        ))}
      </ul>
    </div>
  );
}

function OverviewTotalRow({
  item,
  navigationDisabled,
  onActivate,
}: {
  item: OverviewItem;
  navigationDisabled: boolean;
  onActivate: (metricId: string) => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (navigationDisabled) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onActivate(item.id);
  };

  return (
    <li
      className={[
        'flex items-center justify-between gap-3 px-4 py-3 sm:px-5',
        navigationDisabled ? '' : 'hover:bg-surface-solid/30 cursor-pointer transition-colors',
      ].join(' ')}
      role="button"
      tabIndex={navigationDisabled ? -1 : 0}
      aria-disabled={navigationDisabled ? 'true' : undefined}
      aria-label={`${item.label} Rangliste \u00f6ffnen`}
      onClick={() => {
        if (!navigationDisabled) onActivate(item.id);
      }}
      onKeyDown={handleKeyDown}
    >
      <span className="text-muted inline-flex min-w-0 items-center gap-2">
        <span className="text-accent inline-flex h-7 w-7 items-center justify-center rounded-lg bg-transparent">
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
      </span>
      <StatValue
        state={item.state}
        value={item.value}
        label={item.label}
        hint={item.hint}
        onRetry={item.onRetry}
        retryDisabled={item.retryDisabled}
        retryDisabledHint={item.retryDisabledHint}
        className="max-w-[58%] text-right"
        valueClassName="text-fg text-base font-semibold tracking-tight whitespace-nowrap"
      />
    </li>
  );
}

export function OverviewSection({
  showWelcome,
  onDismissWelcome,
  onOpenRankings,
  navigationDisabled,
  totals,
  worldState,
  worldStateLoaded,
  worldStateLoading,
  worldStateError,
  summaryLoaded,
  summaryLoading,
  summaryError,
  onRetrySummary,
  summaryRetryDisabled,
  summaryRetryInSeconds,
}: OverviewSectionProps) {
  const retryWaitText = getRetryWaitText(summaryRetryDisabled, summaryRetryInSeconds);
  const overviewItems = useMemo<OverviewItem[]>(
    () =>
      KPI_METRICS.map((id) => {
        const def = KPI_FALLBACK_DEFS[id];
        const value = totals?.[id];
        const valueState = getSummaryItemState({
          value,
          label: def.label,
          totals,
          summaryLoaded,
          summaryLoading,
          summaryError,
          onRetrySummary,
          summaryRetryDisabled,
          retryWaitText,
        });

        return {
          id,
          icon: ICON_BY_KPI_ID[id],
          label: def.label,
          value: typeof value === 'number' ? formatMetricValue(value, def) : undefined,
          ...valueState,
        };
      }),
    [
      onRetrySummary,
      retryWaitText,
      summaryError,
      summaryLoaded,
      summaryLoading,
      summaryRetryDisabled,
      totals,
    ],
  );
  const worldAge = getWorldAgeDetails({
    worldState,
    worldStateLoaded,
    worldStateLoading,
    worldStateError,
  });

  const handleCardActivate = (metricId: string): void => {
    if (navigationDisabled) return;
    onOpenRankings(metricId);
  };

  return (
    <StatsLayoutGrid className="lg:items-stretch">
      <StatsLayoutRail ariaLabel="&Uuml;bersicht Hinweise" className="flex h-full flex-col">
        <section className="min-h-[10rem] lg:min-h-0 lg:flex-1">
          <WelcomePanel showWelcome={showWelcome} onDismissWelcome={onDismissWelcome} />
        </section>

        <QuicklinksPanel navigationDisabled={navigationDisabled} onOpenRankings={onOpenRankings} />
      </StatsLayoutRail>
      <StatsLayoutMain ariaLabel="&Uuml;bersicht Kennzahlen" className="flex h-full flex-col">
        <SectionTitle
          title="Die Geschichte unserer Welt - in Zahlen"
          subtitle="Von langen Reisen &uuml;ber gef&auml;hrliche N&auml;chte bis zu gro&szlig;en Projekten: Hier siehst du den Puls des Servers."
        />
        <div aria-live="polite" className="mt-5 space-y-5">
          <WorldAgePanel
            state={worldAge.state}
            value={worldAge.value}
            hint={worldAge.hint}
            onRetrySummary={onRetrySummary}
            summaryRetryDisabled={summaryRetryDisabled}
            retryWaitText={retryWaitText}
          />
          <TotalsPanel
            rows={overviewItems}
            navigationDisabled={navigationDisabled}
            onActivate={handleCardActivate}
          />
        </div>
      </StatsLayoutMain>
    </StatsLayoutGrid>
  );
}
