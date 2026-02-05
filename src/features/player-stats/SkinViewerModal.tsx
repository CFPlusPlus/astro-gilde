import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  skinUrl: string;
};

/**
 * 3D Skin-Viewer Modal
 * - skinview3d wird nur bei Bedarf (open) per Dynamic-Import geladen
 * - verhindert unnoetiges JS im Initial-Load
 */
export default function SkinViewerModal({ open, onClose, title = 'Spielerskin', skinUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  type OrbitControlsLike = {
    enableZoom?: boolean;
    enablePan?: boolean;
    reset?: () => void;
  };

  type SkinViewerLike = {
    controls?: OrbitControlsLike;
    dispose?: () => void;
    loadSkin?: (url: string) => Promise<void> | void;
  };

  type SkinViewerCtor = new (opts: {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    skin: string;
  }) => SkinViewerLike;

  const viewerRef = useRef<SkinViewerLike | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadError(null);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;

    (async () => {
      try {
        // Lazy-Import: nur wenn das Modal geoeffnet wird.
        const mod = await import('skinview3d');
        if (disposed) return;

        // SkinViewer ist in skinview3d das Standard-Objekt fuer den Viewer.
        const SkinViewer = (mod as unknown as { SkinViewer: SkinViewerCtor }).SkinViewer;
        if (!SkinViewer) throw new Error('SkinViewer nicht gefunden');

        // Alte Instanz wegraeumen (safety)
        viewerRef.current?.dispose?.();

        const viewer = new SkinViewer({
          canvas,
          width: 800,
          height: 800,
          skin: skinUrl,
        });

        // Controls: Drehen/Zoomen
        if (viewer.controls) {
          viewer.controls.enableZoom = true;
          viewer.controls.enablePan = false;
        }

        viewerRef.current = viewer;
      } catch (e) {
        console.warn('skinview3d konnte nicht geladen werden:', e);
        setLoadError('Der 3D Skin-Viewer konnte nicht geladen werden.');
      }
    })();

    return () => {
      disposed = true;
      const v = viewerRef.current;
      viewerRef.current = null;
      try {
        v?.dispose?.();
      } catch {
        // Unkritisch: Dispose darf fehlschlagen.
      }
    };
  }, [open, skinUrl]);

  if (!open) return null;

  const onReset = () => {
    const v = viewerRef.current;
    if (!v) return;

    try {
      v.controls?.reset?.();
      // Falls Skin geaendert wurde: erneut laden.
      void v.loadSkin?.(skinUrl);
    } catch {
      // Unkritisch: Reset darf fehlschlagen.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        // Klick auf Overlay schliesst (aber nicht auf Dialog selbst)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg border-border w-full max-w-3xl overflow-hidden rounded-[var(--radius)] border shadow-xl outline-none">
        <header className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
          <h3 className="text-fg text-base font-semibold">{title}</h3>
          <button
            type="button"
            aria-label="Schließen"
            className="text-muted hover:text-fg rounded-lg p-2 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-4">
          <div className="border-border overflow-hidden rounded-[var(--radius)] border bg-black/20">
            <canvas ref={canvasRef} width={800} height={800} className="block w-full" />
          </div>

          {loadError ? (
            <div
              className="bg-accent/10 border-accent/40 mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm"
              role="status"
            >
              <div className="bg-accent mt-0.5 h-2 w-2 flex-none rounded-full" aria-hidden="true" />
              <span className="text-fg/90">{loadError}</span>
            </div>
          ) : null}
        </div>

        <footer className="border-border flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted text-xs">
            Ziehen/zoomen zum Drehen und Vergrößern. Drücke ESC zum Schließen.
          </span>
          <button
            type="button"
            className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur-md transition-colors"
            onClick={onReset}
          >
            Reset
          </button>
        </footer>
      </div>
    </div>
  );
}
