import React, { useEffect, useRef } from 'react';
import { RefreshCcw, X } from 'lucide-react';
import { SkinViewerControls } from './skinviewer/SkinViewerControls';
import { SkinViewerStage } from './skinviewer/SkinViewerStage';
import { useSkinViewer } from './skinviewer/useSkinViewer';
import { getFocusableElements, trapFocusInContainer } from '../../scripts/app/dialog';
import { lockPageScroll, unlockPageScroll } from '../../scripts/app/scroll-lock';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  skinUrl: string;
  skinFallbackUrls?: string[];
  playerUuid?: string;
  playerName?: string;
};

export default function SkinViewerModal({
  open,
  onClose,
  title,
  skinUrl,
  skinFallbackUrls = [],
  playerUuid,
  playerName,
}: Props) {
  const SKIN_VIEWER_SCROLL_LOCK_ID = 'skin-viewer-modal';
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const dialogTitle = title || (playerName ? `Skin von ${playerName}` : 'Skin von Spieler');
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
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockPageScroll(SKIN_VIEWER_SCROLL_LOCK_ID);

    const focusRaf = window.requestAnimationFrame(() => {
      const focusTarget = getFocusableElements(dialogRef.current)[0] ?? dialogRef.current;
      focusTarget?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab') return;
      trapFocusInContainer(e, dialogRef.current);
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(focusRaf);
      window.removeEventListener('keydown', onKey);
      unlockPageScroll(SKIN_VIEWER_SCROLL_LOCK_ID);

      const lastFocusedElement = lastFocusedElementRef.current;
      if (lastFocusedElement && document.contains(lastFocusedElement)) {
        lastFocusedElement.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="mg-glass-overlay fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={dialogTitle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="mg-modal-panel my-3 max-h-[calc(100dvh-1.5rem)] max-w-5xl sm:my-4 sm:max-h-[calc(100dvh-2rem)]"
      >
        <header className="mg-modal-header">
          <h3 className="mg-modal-title">{dialogTitle}</h3>
          <button type="button" aria-label="Schließen" className="mg-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="mg-modal-body grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
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

        <footer className="mg-modal-footer flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="text-muted text-xs">
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
