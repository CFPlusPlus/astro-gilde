import { useMemo, type ReactNode } from 'react';
import { Clock, Map as MapIcon, Skull, Sparkles, Swords, X } from 'lucide-react';

import { KPI_FALLBACK_DEFS, KPI_METRICS } from '../../constants';
import { formatMetricValue } from '../../format';
import { StatsLayoutGrid, StatsLayoutMain, StatsLayoutRail } from '../../layout/StatsLayout';
import { StatValue, type StatValueState } from '../StatValue';
import { SectionTitle } from '../StatsPrimitives';
import { resolveLiveDataStatus } from '../../../../lib/live/types';
import { LastUpdated } from '../../../../components/live/LastUpdated';
import { LIVE_COPY_DE } from '../../../../lib/live/copy.de';

export function OverviewSection({
  showWelcome,
  onDismissWelcome,
  totals,
  summaryLoaded,
  summaryLoading,
  summaryError,
  summaryLastUpdatedAt,
  onRetrySummary,
  summaryRetryDisabled,
  summaryRetryInSeconds,
}: {
  showWelcome: boolean;
  onDismissWelcome: () => void;
  totals: Record<string, number> | null;
  summaryLoaded: boolean;
  summaryLoading: boolean;
  summaryError: string | null;
  summaryLastUpdatedAt: number | null;
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

  const highlightItem = overviewItems[0];
  const rows = overviewItems.slice(1, 4);

  return (
    <StatsLayoutGrid>
      <StatsLayoutRail ariaLabel="&Uuml;bersicht Hinweise">
        {showWelcome ? (
          <div className="mg-callout relative flex items-start gap-3" data-variant="info">
            <div className="bg-accent/15 text-accent mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-fg font-semibold">Willkommen auf der Statistik-Seite!</p>
              <p className="text-muted mt-1 text-sm leading-relaxed">
                Nutze die Suche oben, um direkt zur Spielerstatistik zu springen. In den Ranglisten
                findest du die Top-Werte je Kategorie, von Spielzeit &uuml;ber Distanz bis zu
                Kreaturen.
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
          <div className="mg-notice mt-0 text-sm" data-variant="neutral" role="status">
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
      </StatsLayoutRail>
      <StatsLayoutMain ariaLabel="&Uuml;bersicht Kennzahlen">
        <SectionTitle
          title="Die Geschichte unserer Welt - in Zahlen"
          subtitle="Von langen Reisen &uuml;ber gef&auml;hrliche N&auml;chte bis zu gro&szlig;en Projekten: Hier siehst du den Puls des Servers."
        />
        <LastUpdated
          updatedAt={summaryLastUpdatedAt}
          className="text-muted mt-2 text-xs"
          showWhenMissing
        />
        <div aria-live="polite" className="mt-5 space-y-5">
          {highlightItem ? (
            <section className="border-border/75 bg-surface-solid/35 relative overflow-hidden rounded-[var(--radius)] border px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-5">
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
            </section>
          ) : null}

          <div className="border-border/75 bg-surface-solid/20 overflow-hidden rounded-[var(--radius)] border">
            <ul className="mg-list divide-border/75 divide-y text-sm">
              {rows.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
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
