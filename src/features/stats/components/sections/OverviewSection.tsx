import { useMemo, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRight, Clock, Map as MapIcon, Skull, Sparkles, Swords, X } from 'lucide-react';

import { KPI_FALLBACK_DEFS, KPI_METRICS } from '../../constants';
import { formatMetricValue } from '../../format';
import { StatsLayoutGrid, StatsLayoutMain, StatsLayoutRail } from '../../layout/StatsLayout';
import { StatValue, type StatValueState } from '../StatValue';
import { SectionTitle } from '../StatsPrimitives';
import { resolveLiveDataStatus } from '../../../../lib/live/types';
import { LIVE_COPY_DE } from '../../../../lib/live/copy.de';

export function OverviewSection({
  showWelcome,
  onDismissWelcome,
  onOpenRankings,
  navigationDisabled,
  totals,
  summaryLoaded,
  summaryLoading,
  summaryError,
  onRetrySummary,
  summaryRetryDisabled,
  summaryRetryInSeconds,
}: {
  showWelcome: boolean;
  onDismissWelcome: () => void;
  onOpenRankings: (metricId?: string | string[]) => void;
  navigationDisabled: boolean;
  totals: Record<string, number> | null;
  summaryLoaded: boolean;
  summaryLoading: boolean;
  summaryError: string | null;
  onRetrySummary: () => void;
  summaryRetryDisabled: boolean;
  summaryRetryInSeconds: number;
}) {
  const retryWaitText =
    summaryRetryDisabled && summaryRetryInSeconds > 0
      ? LIVE_COPY_DE.retry_wait(summaryRetryInSeconds)
      : null;

  const resolveItemState = useMemo(
    () =>
      (
        value: number | undefined,
        label: string,
      ): {
        state: StatValueState;
        hint?: string;
        onRetry?: () => void;
        retryDisabled?: boolean;
        retryDisabledHint?: string;
      } => {
        const hasValue = typeof value === 'number';
        const state = resolveLiveDataStatus({
          loading: summaryLoading,
          loaded: summaryLoaded,
          hasData: hasValue,
          hasSnapshot: Boolean(totals),
          error: summaryError
            ? {
                kind: 'unknown',
                message: summaryError,
              }
            : null,
        });

        if (state === 'loading') {
          return { state };
        }

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
          return {
            state,
            hint: LIVE_COPY_DE.summary_stale_refreshing,
          };
        }

        if (state === 'stale' && summaryError) {
          return {
            state,
            hint: LIVE_COPY_DE.summary_stale_failed,
          };
        }

        if (state === 'empty') {
          return {
            state,
            hint: LIVE_COPY_DE.summary_missing_metric(label),
          };
        }

        return { state: 'ok' };
      },
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

  const overviewItems = useMemo<
    Array<{
      id: string;
      icon: ReactNode;
      label: string;
      value?: string;
      state: StatValueState;
      hint?: string;
      onRetry?: () => void;
      retryDisabled?: boolean;
      retryDisabledHint?: string;
    }>
  >(() => {
    const iconById: Record<string, ReactNode> = {
      hours: <Clock size={16} />,
      distance: <MapIcon size={16} />,
      mob_kills: <Swords size={16} />,
      creeper: <Skull size={16} />,
    };
    return KPI_METRICS.map((id) => {
      const def = KPI_FALLBACK_DEFS[id];
      const value = totals?.[id];
      const valueState = resolveItemState(value, def.label);
      return {
        id,
        icon: iconById[id],
        label: def.label,
        value: typeof value === 'number' ? formatMetricValue(value, def) : undefined,
        ...valueState,
      };
    });
  }, [resolveItemState, totals]);

  const handleCardActivate = (metricId: string): void => {
    if (navigationDisabled) return;
    onOpenRankings(metricId);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, metricId: string): void => {
    if (navigationDisabled) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpenRankings(metricId);
  };

  const highlightItem = overviewItems[0];
  const rows = overviewItems.slice(1, 4);
  const rankingQuicklinks: Array<{ label: string; metricIds: string[] }> = [
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

  return (
    <StatsLayoutGrid className="lg:items-stretch">
      <StatsLayoutRail ariaLabel="&Uuml;bersicht Hinweise" className="flex h-full flex-col">
        <section className="min-h-[10rem] lg:min-h-0 lg:flex-1">
          {showWelcome ? (
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
                  Nutze die Suche oben, um direkt zur Spielerstatistik zu springen. In den
                  Ranglisten findest du die Top-Werte je Kategorie, von Spielzeit &uuml;ber Distanz
                  bis zu Kreaturen.
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
          ) : (
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
          )}
        </section>

        <section className="border-border/75 mt-4 border-t pt-4" aria-label="Schnellzugriff">
          <p className="text-fg text-sm font-semibold">Quicklinks</p>
          <div className="mt-3 grid gap-2">
            {rankingQuicklinks.map((quicklink) => (
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
      </StatsLayoutRail>
      <StatsLayoutMain ariaLabel="&Uuml;bersicht Kennzahlen" className="flex h-full flex-col">
        <SectionTitle
          title="Die Geschichte unserer Welt - in Zahlen"
          subtitle="Von langen Reisen &uuml;ber gef&auml;hrliche N&auml;chte bis zu gro&szlig;en Projekten: Hier siehst du den Puls des Servers."
        />
        <div aria-live="polite" className="mt-5 space-y-5">
          {highlightItem ? (
            <section
              className={[
                'mg-app-panel mg-app-panel--strong relative overflow-hidden px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-5',
                navigationDisabled
                  ? ''
                  : 'hover:border-accent/45 hover:bg-surface-solid/45 cursor-pointer transition-colors',
              ].join(' ')}
              role="button"
              tabIndex={navigationDisabled ? -1 : 0}
              aria-disabled={navigationDisabled ? 'true' : undefined}
              aria-label={`${highlightItem.label} Rangliste \u00f6ffnen`}
              onClick={() => handleCardActivate(highlightItem.id)}
              onKeyDown={(event) => handleCardKeyDown(event, highlightItem.id)}
            >
              <div className="bg-accent/18 text-accent absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-xl">
                {highlightItem.icon}
              </div>
              <p className="text-muted pr-12 text-xs font-semibold tracking-[0.16em] uppercase">
                Leitwert
              </p>
              <p className="text-fg mt-2 text-lg font-semibold tracking-tight">
                {highlightItem.label}
              </p>
              <StatValue
                state={highlightItem.state}
                value={highlightItem.value}
                label={highlightItem.label}
                hint={highlightItem.hint || 'Serverweiter Gesamtwert.'}
                onRetry={highlightItem.onRetry}
                retryDisabled={highlightItem.retryDisabled}
                retryDisabledHint={highlightItem.retryDisabledHint}
                className="mt-2"
                valueClassName="text-fg text-3xl font-semibold tracking-tight"
              />
              <p className="text-muted mt-3 inline-flex items-center gap-1 text-xs font-semibold">
                Zur Rangliste
                <ArrowRight size={13} />
              </p>
            </section>
          ) : null}

          <div className="mg-app-panel mg-app-panel--soft overflow-hidden">
            <ul className="mg-list divide-border/75 divide-y text-sm">
              {rows.map((item) => (
                <li
                  key={item.id}
                  className={[
                    'flex items-center justify-between gap-3 px-4 py-3 sm:px-5',
                    navigationDisabled
                      ? ''
                      : 'hover:bg-surface-solid/30 cursor-pointer transition-colors',
                  ].join(' ')}
                  role="button"
                  tabIndex={navigationDisabled ? -1 : 0}
                  aria-disabled={navigationDisabled ? 'true' : undefined}
                  aria-label={`${item.label} Rangliste \u00f6ffnen`}
                  onClick={() => handleCardActivate(item.id)}
                  onKeyDown={(event) => handleCardKeyDown(event, item.id)}
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
              ))}
            </ul>
          </div>
        </div>
      </StatsLayoutMain>
    </StatsLayoutGrid>
  );
}
