import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RefreshCcw, X } from 'lucide-react';
import steveImage from '../../assets/images/minecraft/steve.png';
import elytraImage from '../../assets/images/minecraft/elytra.png';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  skinUrl: string;
  skinFallbackUrls?: string[];
  playerUuid?: string;
  playerName?: string;
};

type AnimationMode = 'none' | 'idle' | 'rotate' | 'walk' | 'run' | 'fly';
type BackMode = 'none' | 'cape' | 'elytra';
type CapeState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

type OrbitControlsLike = {
  enableRotate?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  reset?: () => void;
  dispose?: () => void;
};

type AnimationHandleLike = {
  speed?: number;
  remove?: () => void;
  resetAndRemove?: () => void;
};

type RootAnimationsLike = {
  add?: (animation: unknown) => AnimationHandleLike;
  paused?: boolean;
};

type SkinViewerLike = {
  width?: number;
  height?: number;
  animations?: RootAnimationsLike;
  dispose?: () => void;
  loadSkin?: (url: string) => Promise<void> | void;
  loadCape?: (
    source: string | null,
    options?: {
      backEquipment?: 'cape' | 'elytra';
    },
  ) => Promise<void> | void;
};

type SkinViewerCtor = new (opts: {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  skin: string;
}) => SkinViewerLike;

type SkinviewModuleLike = {
  SkinViewer: SkinViewerCtor;
  createOrbitControls?: (viewer: SkinViewerLike) => OrbitControlsLike;
  IdleAnimation?: unknown;
  RotatingAnimation?: unknown;
  WalkingAnimation?: unknown;
  RunningAnimation?: unknown;
  FlyingAnimation?: unknown;
};

type MojangProfile = {
  properties?: Array<{ name?: string; value?: string }>;
};

type MinetoolsProfile = {
  decoded?: {
    textures?: {
      CAPE?: { url?: string };
    };
  };
  raw?: MojangProfile;
};

type CapeCacheEntry = {
  capeUrl: string | null;
  expiresAt: number;
};

type CapeApiResponse = {
  capeUrl?: string | null;
  cape?: string | { url?: string | null } | null;
  url?: string | null;
  hasCape?: boolean;
};

const ANIMATION_OPTIONS: Array<{ id: AnimationMode; label: string }> = [
  { id: 'none', label: 'Keine' },
  { id: 'idle', label: 'Idle' },
  { id: 'rotate', label: 'Rotieren' },
  { id: 'walk', label: 'Laufen' },
  { id: 'run', label: 'Rennen' },
  { id: 'fly', label: 'Fliegen' },
];

const BACK_OPTIONS: Array<{ id: BackMode; label: string }> = [
  { id: 'none', label: 'Keins' },
  { id: 'cape', label: 'Cape' },
  { id: 'elytra', label: 'Elytra' },
];

const CAPE_CACHE_KEY_PREFIX = 'mg:skin-viewer:cape:';
const CAPE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const CAPE_EMPTY_CACHE_TTL_MS = 1000 * 60 * 30;
const FALLBACK_SKIN_URL = steveImage.src;
const FALLBACK_ELYTRA_URL = elytraImage.src;

type BackLoadRequest = {
  source: string | null;
  options?: {
    backEquipment?: 'cape' | 'elytra';
  };
};

function decodeCapeFromProfile(profile: MojangProfile): string | null {
  const texturesProp = profile.properties?.find(
    (entry) => entry?.name === 'textures' && typeof entry.value === 'string',
  );
  if (!texturesProp?.value) return null;

  try {
    const decoded = atob(texturesProp.value);
    const parsed = JSON.parse(decoded) as {
      textures?: {
        CAPE?: { url?: string };
      };
    };
    const capeUrl = parsed?.textures?.CAPE?.url;
    return typeof capeUrl === 'string' && capeUrl ? capeUrl : null;
  } catch {
    return null;
  }
}

function capeCacheKey(uuidCompact: string): string {
  return `${CAPE_CACHE_KEY_PREFIX}${uuidCompact}`;
}

function readCapeCache(uuidCompact: string): string | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(capeCacheKey(uuidCompact));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CapeCacheEntry;
    if (!parsed || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(capeCacheKey(uuidCompact));
      return undefined;
    }
    return typeof parsed.capeUrl === 'string' && parsed.capeUrl ? parsed.capeUrl : null;
  } catch {
    return undefined;
  }
}

function writeCapeCache(uuidCompact: string, capeUrl: string | null, ttlMs: number): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CapeCacheEntry = {
      capeUrl,
      expiresAt: Date.now() + ttlMs,
    };
    window.localStorage.setItem(capeCacheKey(uuidCompact), JSON.stringify(payload));
  } catch {
    // Unkritisch: Cache kann in Private-Mode/Storage-Limits fehlschlagen.
  }
}

async function fetchCapeFromMojangProfile(
  uuidCompact: string,
  signal: AbortSignal,
): Promise<string | null> {
  const res = await fetch(`https://api.minetools.eu/profile/${encodeURIComponent(uuidCompact)}`, {
    signal,
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 204 || res.status === 404) return null;
    throw new Error(`HTTP ${res.status}`);
  }

  const data = (await res.json()) as MinetoolsProfile;

  const decodedCape = data?.decoded?.textures?.CAPE?.url;
  if (typeof decodedCape === 'string' && decodedCape) return decodedCape;

  if (data?.raw) return decodeCapeFromProfile(data.raw);
  return null;
}

function parseCapeApiResponse(data: CapeApiResponse): string | null | undefined {
  if (!data || typeof data !== 'object') return undefined;

  if ('capeUrl' in data) {
    if (typeof data.capeUrl === 'string' && data.capeUrl) return data.capeUrl;
    if (data.capeUrl === null) return null;
  }

  if ('cape' in data) {
    if (typeof data.cape === 'string' && data.cape) return data.cape;
    if (data.cape && typeof data.cape === 'object') {
      const nested = data.cape.url;
      if (typeof nested === 'string' && nested) return nested;
      if (nested === null) return null;
    }
    if (data.cape === null) return null;
  }

  if ('url' in data) {
    if (typeof data.url === 'string' && data.url) return data.url;
    if (data.url === null) return null;
  }

  if (data.hasCape === false) return null;
  return undefined;
}

async function fetchCapeFromServerCache(
  uuidCompact: string,
  signal: AbortSignal,
): Promise<string | null | undefined> {
  try {
    const res = await fetch(`/api/cape?uuid=${encodeURIComponent(uuidCompact)}`, {
      signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.status === 404 || res.status === 405 || res.status === 501) {
      return undefined;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = (await res.json()) as CapeApiResponse;
    return parseCapeApiResponse(payload);
  } catch (e) {
    if (signal.aborted) return undefined;
    console.warn('Server-Cape-Cache nicht verfuegbar, fallback aktiv:', e);
    return undefined;
  }
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function loadImageProbe(url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const img = new Image();
    let done = false;

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      signal.removeEventListener('abort', onAbort);
    };

    const finishResolve = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };

    const finishReject = (error: Error) => {
      if (done) return;
      done = true;
      cleanup();
      reject(error);
    };

    const onAbort = () => {
      finishReject(new DOMException('Aborted', 'AbortError'));
    };

    signal.addEventListener('abort', onAbort, { once: true });
    img.onload = finishResolve;
    img.onerror = () => finishReject(new Error(`Image load failed: ${url}`));
    img.src = url;
  });
}

export default function SkinViewerModal({
  open,
  onClose,
  title,
  skinUrl,
  skinFallbackUrls = [],
  playerUuid,
  playerName,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<SkinViewerLike | null>(null);
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const moduleRef = useRef<SkinviewModuleLike | null>(null);
  const animationHandleRef = useRef<AnimationHandleLike | null>(null);

  const [viewerVersion, setViewerVersion] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [animationMode, setAnimationMode] = useState<AnimationMode>('rotate');
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [backMode, setBackMode] = useState<BackMode>('none');
  const [capeUrl, setCapeUrl] = useState<string | null>(null);
  const [capeState, setCapeState] = useState<CapeState>('idle');
  const [resolvedSkinUrl, setResolvedSkinUrl] = useState<string>(FALLBACK_SKIN_URL);

  const skinCandidates = useMemo(
    () => uniqueNonEmpty([skinUrl, ...skinFallbackUrls, FALLBACK_SKIN_URL]),
    [skinUrl, skinFallbackUrls],
  );

  const resolveBackLoad = useCallback((): BackLoadRequest => {
    if (animationMode === 'fly') {
      return {
        source: capeUrl || FALLBACK_ELYTRA_URL,
        options: { backEquipment: 'elytra' },
      };
    }

    if (backMode === 'cape') {
      return capeUrl
        ? {
            source: capeUrl,
            options: { backEquipment: 'cape' },
          }
        : { source: null };
    }

    if (backMode === 'elytra') {
      return {
        source: capeUrl || FALLBACK_ELYTRA_URL,
        options: { backEquipment: 'elytra' },
      };
    }

    return { source: null };
  }, [animationMode, backMode, capeUrl]);

  const dialogTitle = title || (playerName ? `Skin von ${playerName}` : 'Skin von Spieler');

  const resizeViewer = () => {
    const stage = stageRef.current;
    const viewer = viewerRef.current;
    if (!stage || !viewer) return;

    const width = Math.max(260, Math.floor(stage.clientWidth));
    try {
      viewer.width = width;
      viewer.height = width;
    } catch {
      // Unkritisch: Resize darf fehlschlagen.
    }
  };

  const clearAnimation = () => {
    const handle = animationHandleRef.current;
    animationHandleRef.current = null;
    if (!handle) return;

    try {
      handle.resetAndRemove?.();
    } catch {
      try {
        handle.remove?.();
      } catch {
        // Unkritisch: Cleanup darf fehlschlagen.
      }
    }
  };

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

    let cancelled = false;

    (async () => {
      try {
        const mod = (await import('skinview3d')) as unknown as SkinviewModuleLike;
        if (cancelled) return;

        if (!mod?.SkinViewer) throw new Error('SkinViewer nicht gefunden');

        moduleRef.current = mod;

        viewerRef.current?.dispose?.();
        controlsRef.current?.dispose?.();
        clearAnimation();

        const viewer = new mod.SkinViewer({
          canvas,
          width: 720,
          height: 720,
          skin: FALLBACK_SKIN_URL,
        });

        viewerRef.current = viewer;

        if (mod.createOrbitControls) {
          const controls = mod.createOrbitControls(viewer);
          controls.enableRotate = true;
          controls.enableZoom = true;
          controls.enablePan = false;
          controlsRef.current = controls;
        } else {
          controlsRef.current = null;
        }

        requestAnimationFrame(() => {
          resizeViewer();
          setViewerVersion((v) => v + 1);
        });
      } catch (e) {
        console.warn('skinview3d konnte nicht geladen werden:', e);
        setLoadError('Der 3D Skin-Viewer konnte nicht geladen werden.');
      }
    })();

    return () => {
      cancelled = true;
      clearAnimation();
      controlsRef.current?.dispose?.();
      controlsRef.current = null;
      moduleRef.current = null;

      const v = viewerRef.current;
      viewerRef.current = null;
      try {
        v?.dispose?.();
      } catch {
        // Unkritisch: Dispose darf fehlschlagen.
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const stage = stageRef.current;
    if (!stage) return;

    const ro = new ResizeObserver(() => resizeViewer());
    ro.observe(stage);

    window.addEventListener('resize', resizeViewer);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resizeViewer);
    };
  }, [open, viewerVersion]);

  useEffect(() => {
    if (!open) return;
    const viewer = viewerRef.current;
    if (!viewer?.loadSkin || skinCandidates.length === 0) return;

    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      for (const candidate of skinCandidates) {
        if (cancelled || ac.signal.aborted) return;

        try {
          await loadImageProbe(candidate, ac.signal);
          if (cancelled || ac.signal.aborted) return;

          await Promise.resolve(viewer.loadSkin?.(candidate));
          if (cancelled || ac.signal.aborted) return;

          setResolvedSkinUrl(candidate);
          return;
        } catch {
          // Nächsten Skin-Kandidaten versuchen.
        }
      }

      try {
        await Promise.resolve(viewer.loadSkin?.(FALLBACK_SKIN_URL));
      } catch {
        // Unkritisch: Lokaler Fallback sollte verfuegbar sein.
      }

      if (!cancelled && !ac.signal.aborted) {
        setResolvedSkinUrl(FALLBACK_SKIN_URL);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [open, viewerVersion, skinCandidates]);

  useEffect(() => {
    if (!open) return;

    const compact = (playerUuid || '').replace(/-/g, '').trim();
    if (!/^[a-fA-F0-9]{32}$/.test(compact)) {
      setCapeUrl(null);
      setCapeState('unavailable');
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    const cachedCape = readCapeCache(compact);
    if (cachedCape !== undefined) {
      setCapeUrl(cachedCape);
      setCapeState(cachedCape ? 'ready' : 'unavailable');
      return () => {
        cancelled = true;
        ac.abort();
      };
    }

    setCapeState('loading');

    (async () => {
      try {
        const cachedByServer = await fetchCapeFromServerCache(compact, ac.signal);
        if (cancelled) return;

        if (cachedByServer !== undefined) {
          if (cachedByServer) {
            writeCapeCache(compact, cachedByServer, CAPE_CACHE_TTL_MS);
            setCapeUrl(cachedByServer);
            setCapeState('ready');
          } else {
            writeCapeCache(compact, null, CAPE_EMPTY_CACHE_TTL_MS);
            setCapeUrl(null);
            setCapeState('unavailable');
          }
          return;
        }

        const resolvedCape = await fetchCapeFromMojangProfile(compact, ac.signal);
        if (cancelled) return;

        if (resolvedCape) {
          writeCapeCache(compact, resolvedCape, CAPE_CACHE_TTL_MS);
          setCapeUrl(resolvedCape);
          setCapeState('ready');
        } else {
          writeCapeCache(compact, null, CAPE_EMPTY_CACHE_TTL_MS);
          setCapeUrl(null);
          setCapeState('unavailable');
        }
      } catch (e) {
        if (cancelled || ac.signal.aborted) return;
        console.warn('Cape konnte nicht aufgeloest werden:', e);
        setCapeUrl(null);
        setCapeState('error');
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [open, playerUuid]);

  useEffect(() => {
    if (!open) return;

    const viewer = viewerRef.current;
    const mod = moduleRef.current;
    if (!viewer || !mod) return;

    clearAnimation();

    if (animationMode === 'none') return;

    let animation: unknown;
    if (animationMode === 'idle') animation = mod.IdleAnimation;
    else if (animationMode === 'rotate') animation = mod.RotatingAnimation;
    else if (animationMode === 'walk') animation = mod.WalkingAnimation;
    else if (animationMode === 'run') animation = mod.RunningAnimation;
    else if (animationMode === 'fly') animation = mod.FlyingAnimation;

    if (!animation || !viewer.animations?.add) return;

    try {
      const handle = viewer.animations.add(animation);
      if (handle) {
        handle.speed = animationSpeed;
        animationHandleRef.current = handle;
      }
    } catch {
      // Unkritisch: Animation darf fehlschlagen.
    }
  }, [open, viewerVersion, animationMode, animationSpeed]);

  useEffect(() => {
    if (!open) return;
    setBackMode('none');
  }, [open, playerUuid]);

  useEffect(() => {
    if (!open) return;
    if (capeState !== 'ready' || !capeUrl) return;

    setBackMode((current) => (current === 'none' ? 'cape' : current));
  }, [open, capeState, capeUrl]);

  useEffect(() => {
    if (!open) return;

    const viewer = viewerRef.current;
    if (!viewer?.loadCape) return;

    const backRequest = resolveBackLoad();

    if (!backRequest.source) {
      try {
        void viewer.loadCape(null);
      } catch {
        // Unkritisch: Cape-Clear darf fehlschlagen.
      }
      return;
    }

    try {
      void viewer.loadCape(backRequest.source, backRequest.options);
    } catch {
      setLoadError('Cape/Elytra konnte nicht geladen werden.');
    }
  }, [open, viewerVersion, resolveBackLoad]);

  if (!open) return null;

  const onReset = () => {
    try {
      controlsRef.current?.reset?.();
      void viewerRef.current?.loadSkin?.(resolvedSkinUrl);

      const backRequest = resolveBackLoad();
      if (!backRequest.source) {
        void viewerRef.current?.loadCape?.(null);
      } else {
        void viewerRef.current?.loadCape?.(backRequest.source, backRequest.options);
      }
    } catch {
      // Unkritisch: Reset darf fehlschlagen.
    }
  };

  const capeUnavailable = capeState === 'unavailable' || capeState === 'error';
  const fallbackElytraActive =
    !capeUrl && capeState !== 'loading' && (animationMode === 'fly' || backMode === 'elytra');

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={dialogTitle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-strong border-border my-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-x-hidden overflow-y-auto rounded-[var(--radius)] border shadow-xl outline-none sm:my-4 sm:max-h-[calc(100dvh-2rem)]">
        <header className="border-border flex items-center justify-between gap-2 border-b px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <h3 className="text-fg text-sm font-semibold sm:text-base">{dialogTitle}</h3>
          <button
            type="button"
            aria-label="Schließen"
            className="text-fg hover:text-accent focus-visible:ring-accent/40 inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </header>

        <div className="grid gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div
            ref={stageRef}
            className="glass border-border relative w-full overflow-hidden rounded-[var(--radius)] border"
          >
            <div className="relative aspect-square w-full">
              <div className="mg-viewer-stage-pattern absolute inset-0" aria-hidden="true" />
              <canvas
                ref={canvasRef}
                width={720}
                height={720}
                className="relative z-[1] block h-full w-full"
              />
            </div>
          </div>

          <aside className="space-y-3 sm:space-y-4">
            <div className="glass border-border rounded-[var(--radius)] border p-2.5 sm:p-3">
              <p className="text-fg text-xs font-semibold tracking-wide uppercase">Animation</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {ANIMATION_OPTIONS.map((option) => {
                  const active = animationMode === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAnimationMode(option.id)}
                      data-active={active}
                      className="mg-viewer-option px-2 py-1.5 text-xs font-semibold sm:px-2.5 sm:py-2"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <label className="mt-2.5 block sm:mt-3">
                <span className="text-muted text-xs">
                  Geschwindigkeit: {animationSpeed.toFixed(2)}x
                </span>
                <input
                  type="range"
                  min={0.25}
                  max={3}
                  step={0.05}
                  value={animationSpeed}
                  disabled={animationMode === 'none'}
                  onChange={(e) => setAnimationSpeed(Number(e.currentTarget.value))}
                  className="mg-range mt-1 w-full"
                />
              </label>
            </div>

            <div className="glass border-border rounded-[var(--radius)] border p-2.5 sm:p-3">
              <p className="text-fg text-xs font-semibold tracking-wide uppercase">Rücken-Item</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {BACK_OPTIONS.map((option) => {
                  const active = backMode === option.id;
                  const disabled =
                    option.id === 'cape' ? capeState === 'loading' || !capeUrl : false;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setBackMode(option.id)}
                      data-active={active}
                      className="mg-viewer-option px-2 py-1.5 text-xs font-semibold sm:py-2"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <p className="text-muted mt-2 text-xs">
                {capeState === 'loading' ? 'Cape wird geladen...' : null}
                {capeState === 'ready' ? 'Cape verfügbar.' : null}
                {capeUnavailable || fallbackElytraActive ? (
                  <span className="inline-flex items-center gap-1">
                    <AlertCircle size={12} aria-hidden="true" />
                    Kein Cape verfügbar
                  </span>
                ) : null}
              </p>
            </div>
          </aside>
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
          <span className="text-muted text-xs">
            Ziehen zum Drehen, Mausrad zum Zoomen, ESC zum Schließen.
          </span>
          <button
            type="button"
            className="bg-surface border-border hover:bg-surface-solid/70 text-fg inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors sm:px-3 sm:py-2 sm:text-sm"
            onClick={onReset}
          >
            <RefreshCcw size={16} /> Reset
          </button>
        </footer>
      </div>
    </div>
  );
}
