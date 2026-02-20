import React, { useEffect, useId, useRef } from 'react';
import { RefreshCcw, X } from 'lucide-react';
import { SkinViewerControls } from './skinviewer/SkinViewerControls';
import { SkinViewerStage } from './skinviewer/SkinViewerStage';
import { useSkinViewer } from './skinviewer/useSkinViewer';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  skinUrl: string;
  skinFallbackUrls?: string[];
  playerUuid?: string;
  playerName?: string;
};

const getFocusable = (container: HTMLElement): HTMLElement[] =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

export default function SkinViewerModal({
  open,
  onClose,
  title,
  skinUrl,
  skinFallbackUrls = [],
  playerUuid,
  playerName,
}: Props) {
  const dialogTitle = title || (playerName ? `Skin von ${playerName}` : 'Skin von Spieler');
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const {
    canvasRef,
    stageRef,
    loadError,
    animationMode,
    animationSpeed,
    backMode,
    capeState,
    capeUrl,
    fallbackElytraActive,
    onAnimationModeChange,
    onAnimationSpeedChange,
    onBackModeChange,
    onReset,
  } = useSkinViewer({
    open,
    skinUrl,
    skinFallbackUrls,
    playerUuid,
  });

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const lastFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = getFocusable(dialog);
      if (!focusable.length) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!dialog.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
        return;
      }

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusTarget = closeButtonRef.current ?? getFocusable(dialog)[0] ?? dialog;
      focusTarget.focus();
    }, 0);

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="mg-glass-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="mg-glass--strong my-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-x-hidden overflow-y-auto rounded-[var(--radius)] shadow-xl outline-none sm:my-4 sm:max-h-[calc(100dvh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        tabIndex={-1}
      >
        <header className="border-border flex items-center justify-between gap-2 border-b px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <h3 id={dialogTitleId} className="text-fg text-sm font-semibold sm:text-base">
            {dialogTitle}
          </h3>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Schließen"
            className="focus-visible:ring-offset-bg text-fg hover:text-accent inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent transition-colors hover:bg-transparent focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <SkinViewerStage stageRef={stageRef} canvasRef={canvasRef} />
          <SkinViewerControls
            animationMode={animationMode}
            animationSpeed={animationSpeed}
            backMode={backMode}
            capeState={capeState}
            capeUrl={capeUrl}
            fallbackElytraActive={fallbackElytraActive}
            onAnimationModeChange={onAnimationModeChange}
            onAnimationSpeedChange={onAnimationSpeedChange}
            onBackModeChange={onBackModeChange}
          />
        </div>

        {loadError ? (
          <div
            className="bg-accent/10 border-accent/40 mx-4 mb-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm"
            role="status"
          >
            <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" aria-hidden="true" />
            <span className="text-fg/90">{loadError}</span>
          </div>
        ) : null}

        <footer className="border-border flex flex-col gap-2 border-t px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
          <span id={dialogDescriptionId} className="text-muted text-xs">
            Ziehen zum Drehen, Mausrad zum Zoomen, ESC zum Schließen.
          </span>
          <button
            type="button"
            className="mg-btn mg-btn--surface rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm"
            onClick={onReset}
          >
            <RefreshCcw size={16} /> Reset
          </button>
        </footer>
      </div>
    </div>
  );
}
