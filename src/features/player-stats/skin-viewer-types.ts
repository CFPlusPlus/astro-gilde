import type {
  AnimationHandleLike,
  AnimationModuleLike,
  AnimationViewerLike,
  ViewerControlsLike,
} from './skin-viewer-runtime';

export type BackMode = 'none' | 'cape' | 'elytra';
export type CapeState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

export type OrbitControlsLike = ViewerControlsLike & {
  enableRotate?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  reset?: () => void;
  dispose?: () => void;
} & {
  target?: {
    set?: (x: number, y: number, z: number) => void;
  };
};

type RootAnimationsLike = {
  add?: (animation: unknown) => AnimationHandleLike;
  paused?: boolean;
};

export type SkinViewerLike = AnimationViewerLike & {
  width?: number;
  height?: number;
  controls?: OrbitControlsLike;
  resetCameraPose?: () => void;
  playerWrapper?: {
    rotation?: {
      y?: number;
      set?: (x: number, y: number, z: number) => void;
    };
  };
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

export type SkinviewModuleLike = AnimationModuleLike & {
  SkinViewer: SkinViewerCtor;
  createOrbitControls?: (viewer: SkinViewerLike) => OrbitControlsLike;
};

export type BackLoadRequest = {
  source: string | null;
  options?: {
    backEquipment?: 'cape' | 'elytra';
  };
};
