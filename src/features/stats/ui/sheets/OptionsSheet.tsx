import { RefreshCw, X } from 'lucide-react';
import { useId, useMemo, useRef } from 'react';

import { LastUpdated } from '../../../../components/live/LastUpdated';
import { LIVE_COPY_DE } from '../../../../lib/live/copy.de';
import { LiveBadgeSlot, type LiveBadgeVariant } from '../../components/LiveBadge';
import { STATS_PAGE_SIZES } from '../../constants';
import { fmtDateLocal } from '../../format';
import type { TabKey } from '../../types-ui';
import { useSheetDialog } from './useSheetDialog';

const OPTIONS_SHEET_SCROLL_LOCK_ID = 'stats-options-sheet';

function resolveReloadLabel({
  reloadDisabled,
  reloadInSeconds,
}: {
  reloadDisabled: boolean;
  reloadInSeconds: number;
}): string {
  if (!reloadDisabled || reloadInSeconds <= 0) return 'Neu laden';
  return `Neu laden (${reloadInSeconds}s)`;
}

function resolveStatusDetails({
  liveVariant,
  apiError,
  reloadInSeconds,
}: {
  liveVariant: LiveBadgeVariant;
  apiError: string | null;
  reloadInSeconds: number;
}): string | null {
  if (liveVariant === 'rate_limit') {
    if (reloadInSeconds > 0) return LIVE_COPY_DE.rate_limit_retry_in(reloadInSeconds);
    return LIVE_COPY_DE.rate_limit;
  }

  if (liveVariant === 'stale') {
    if (apiError) return `${LIVE_COPY_DE.stale_hint} ${apiError}`;
    return LIVE_COPY_DE.stale_hint;
  }

  if (liveVariant === 'error') {
    return apiError || LIVE_COPY_DE.error_generic;
  }

  return null;
}

export function OptionsSheet({
  open,
  sheetId,
  onClose,
  activeTab,
  liveVariant,
  showPageSize,
  pageSize,
  onPageSizeChange,
  topNHint,
  updatedAt,
  generatedIso,
  apiError,
  onReload,
  reloadDisabled,
  reloadInSeconds,
  activeLeaderboardCategoryLabel,
  onOpenLeaderboardCategories,
}: {
  open: boolean;
  sheetId: string;
  onClose: () => void;
  activeTab: TabKey;
  liveVariant: LiveBadgeVariant;
  showPageSize: boolean;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  topNHint: string | null;
  updatedAt: number | null;
  generatedIso: string | null;
  apiError: string | null;
  onReload?: () => void;
  reloadDisabled: boolean;
  reloadInSeconds: number;
  activeLeaderboardCategoryLabel?: string | null;
  onOpenLeaderboardCategories?: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const showReload = typeof onReload === 'function';
  const reloadLabel = useMemo(
    () =>
      resolveReloadLabel({
        reloadDisabled,
        reloadInSeconds,
      }),
    [reloadDisabled, reloadInSeconds],
  );
  const statusDetails = useMemo(
    () =>
      resolveStatusDetails({
        liveVariant,
        apiError,
        reloadInSeconds,
      }),
    [apiError, liveVariant, reloadInSeconds],
  );
  const showLeaderboardControls = activeTab === 'ranglisten';

  useSheetDialog({
    open,
    onClose,
    dialogRef,
    scrollLockId: OPTIONS_SHEET_SCROLL_LOCK_ID,
  });

  if (!open) return null;

  return (
    <div
      id={sheetId}
      className="fixed inset-0 z-[180] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className="mg-overlay-scrim absolute inset-0"
        aria-label={'Optionen schlie\u00dfen'}
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        tabIndex={-1}
        className="mg-app-sheet absolute inset-x-0 bottom-0 flex h-[70dvh] max-h-[70dvh] min-h-[20rem] flex-col overflow-hidden rounded-t-[1rem] border-t shadow-2xl sm:h-[64dvh] sm:max-h-[64dvh]"
      >
        <header className="border-border/80 flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p id={titleId} className="text-fg text-sm font-semibold">
              Optionen
            </p>
            <p id={descriptionId} className="text-muted text-xs">
              Top-N, Aktualisierung und Status.
            </p>
          </div>
          <button
            type="button"
            className="focus-visible:ring-offset-bg text-fg hover:text-accent inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label={'Optionen schlie\u00dfen'}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="mg-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="space-y-4">
            <section>
              <p className="text-fg/90 text-xs font-semibold tracking-[0.12em] uppercase">Top-N</p>
              <div
                role="radiogroup"
                aria-label={'Top-N Eintr\u00e4ge'}
                className="mt-2 grid grid-cols-5 gap-2"
              >
                {STATS_PAGE_SIZES.map((value) => {
                  const isActive = pageSize === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isActive ? 'true' : 'false'}
                      className={[
                        'focus-visible:ring-offset-bg mg-app-chip inline-flex h-9 items-center justify-center px-0 text-sm font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none',
                        isActive
                          ? 'mg-app-chip--accent'
                          : 'hover:border-accent/45 hover:bg-surface-solid/55',
                      ].join(' ')}
                      disabled={!showPageSize}
                      onClick={() => onPageSizeChange(value)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
              {topNHint ? (
                <p className="text-muted mt-2 text-xs leading-relaxed">{topNHint}</p>
              ) : null}
            </section>

            {showReload ? (
              <section>
                <button
                  type="button"
                  onClick={onReload}
                  className="mg-btn mg-btn--md mg-btn--primary w-full justify-center"
                  disabled={reloadDisabled}
                  title={
                    reloadDisabled && reloadInSeconds > 0 ? 'Bitte kurz warten.' : 'Daten neu laden'
                  }
                >
                  <RefreshCw size={16} />
                  {reloadLabel}
                </button>
              </section>
            ) : null}

            <section className="mg-app-panel mg-app-panel--soft space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-fg/90 text-xs font-semibold tracking-[0.12em] uppercase">
                  Status
                </p>
                <LiveBadgeSlot
                  variant={liveVariant}
                  updatedAt={updatedAt}
                  generatedIso={generatedIso}
                  showStaleIcon={false}
                  className="shrink-0"
                />
              </div>
              {generatedIso ? (
                <p className="text-muted min-w-0 text-xs leading-relaxed break-words">
                  Stand: {fmtDateLocal(generatedIso)}
                </p>
              ) : null}
              <LastUpdated updatedAt={updatedAt} className="text-muted text-xs" showWhenMissing />
              {statusDetails ? (
                <p className="text-muted text-xs leading-relaxed">Statusdetails: {statusDetails}</p>
              ) : null}
            </section>

            {showLeaderboardControls ? (
              <section className="mg-app-panel mg-app-panel--soft space-y-3 p-3">
                <p className="text-fg/90 text-xs font-semibold tracking-[0.12em] uppercase">
                  Ranglisten
                </p>
                <p className="text-muted text-sm leading-relaxed">
                  Aktive Kategorie:{' '}
                  <span className="text-fg font-semibold">
                    {activeLeaderboardCategoryLabel || '-'}
                  </span>
                </p>
                <button
                  type="button"
                  className="mg-btn mg-btn--sm mg-btn--secondary w-full justify-center"
                  onClick={() => {
                    onOpenLeaderboardCategories?.();
                    onClose();
                  }}
                >
                  {'Kategorie \u00e4ndern'}
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
