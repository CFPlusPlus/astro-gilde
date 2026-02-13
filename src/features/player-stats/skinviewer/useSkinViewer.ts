import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import steveImage from '../../../assets/images/minecraft/steve.png';
import elytraImage from '../../../assets/images/minecraft/elytra.png';
import {
  applyAnimationModeToViewer,
  type AnimationHandleLike,
  type AnimationMode,
  clearViewerAnimationState,
  resetViewerToFront,
} from '../skin-viewer-runtime';
import {
  CAPE_CACHE_TTL_MS,
  CAPE_EMPTY_CACHE_TTL_MS,
  fetchCapeFromMojangProfile,
  fetchCapeFromServerCache,
  readCapeCache,
  writeCapeCache,
} from '../skin-viewer-cape';
import type {
  BackLoadRequest,
  BackMode,
  CapeState,
  OrbitControlsLike,
  SkinViewerLike,
  SkinviewModuleLike,
} from '../skin-viewer-types';
import { loadImageProbe, uniqueNonEmpty } from '../skin-viewer-utils';

const FALLBACK_SKIN_URL = steveImage.src;
const FALLBACK_ELYTRA_URL = elytraImage.src;

type UseSkinViewerArgs = {
  open: boolean;
  skinUrl: string;
  skinFallbackUrls: string[];
  playerUuid?: string;
};

type UseSkinViewerResult = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  loadError: string | null;
  animationMode: AnimationMode;
  animationSpeed: number;
  backMode: BackMode;
  capeState: CapeState;
  capeUrl: string | null;
  fallbackElytraActive: boolean;
  onAnimationModeChange: (mode: AnimationMode) => void;
  onAnimationSpeedChange: (speed: number) => void;
  onBackModeChange: (mode: BackMode) => void;
  onReset: () => void;
};

export function useSkinViewer({
  open,
  skinUrl,
  skinFallbackUrls,
  playerUuid,
}: UseSkinViewerArgs): UseSkinViewerResult {
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

  const resizeViewer = useCallback(() => {
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
  }, []);

  const clearAnimation = useCallback(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      try {
        clearViewerAnimationState(viewer);
      } catch {
        // Unkritisch: Animation-Reset darf fehlschlagen.
      }
    }

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
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoadError(null);
  }, [open]);

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
        } else if (viewer.controls) {
          viewer.controls.enableRotate = true;
          viewer.controls.enableZoom = true;
          viewer.controls.enablePan = false;
          controlsRef.current = viewer.controls;
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

      const viewer = viewerRef.current;
      viewerRef.current = null;
      try {
        viewer?.dispose?.();
      } catch {
        // Unkritisch: Dispose darf fehlschlagen.
      }
    };
  }, [open, clearAnimation, resizeViewer]);

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
  }, [open, viewerVersion, resizeViewer]);

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

    try {
      const handle = applyAnimationModeToViewer({ viewer, mod, animationMode, animationSpeed });
      if (handle) animationHandleRef.current = handle;
    } catch {
      // Unkritisch: Animation darf fehlschlagen.
    }
  }, [open, viewerVersion, animationMode, animationSpeed, clearAnimation]);

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

  const onReset = useCallback(() => {
    try {
      const viewer = viewerRef.current;
      resetViewerToFront(viewer, controlsRef.current);
      void viewer?.loadSkin?.(resolvedSkinUrl);

      const backRequest = resolveBackLoad();
      if (!backRequest.source) {
        void viewer?.loadCape?.(null);
      } else {
        void viewer?.loadCape?.(backRequest.source, backRequest.options);
      }
    } catch {
      // Unkritisch: Reset darf fehlschlagen.
    }
  }, [resolveBackLoad, resolvedSkinUrl]);

  const onAnimationModeChange = useCallback((mode: AnimationMode) => {
    setAnimationMode(mode);
  }, []);

  const onAnimationSpeedChange = useCallback((speed: number) => {
    setAnimationSpeed(speed);
  }, []);

  const onBackModeChange = useCallback((mode: BackMode) => {
    setBackMode(mode);
  }, []);

  const fallbackElytraActive =
    !capeUrl && capeState !== 'loading' && (animationMode === 'fly' || backMode === 'elytra');

  return {
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
  };
}
