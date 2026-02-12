export type AnimationMode = 'none' | 'idle' | 'rotate' | 'walk' | 'run' | 'fly';

export type AnimationHandleLike = {
  speed?: number;
  remove?: () => void;
  resetAndRemove?: () => void;
};

export type PlayerAnimationLike = {
  speed?: number;
  paused?: boolean;
  progress?: number;
};

export type AnimationCtorLike = new () => PlayerAnimationLike;

export type ViewerControlsLike = {
  update?: () => void;
  saveState?: () => void;
  target?: {
    set?: (x: number, y: number, z: number) => void;
  };
};

export type AnimationViewerLike = {
  animation?: PlayerAnimationLike | null;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  controls?: ViewerControlsLike;
  resetCameraPose?: () => void;
  playerWrapper?: {
    rotation?: {
      y?: number;
      set?: (x: number, y: number, z: number) => void;
    };
  };
  animations?: {
    add?: (animation: unknown) => AnimationHandleLike;
    paused?: boolean;
  };
};

export type AnimationModuleLike = {
  IdleAnimation?: AnimationCtorLike;
  RotatingAnimation?: AnimationCtorLike;
  WalkingAnimation?: AnimationCtorLike;
  RunningAnimation?: AnimationCtorLike;
  FlyingAnimation?: AnimationCtorLike;
};

function addLegacyAnimation(
  viewer: AnimationViewerLike,
  animationInstance: PlayerAnimationLike,
  animationSpeed: number,
): AnimationHandleLike | null {
  const handle = viewer.animations?.add?.(animationInstance);
  if (!handle) return null;
  handle.speed = animationSpeed;
  return handle;
}

export function clearViewerAnimationState(viewer: AnimationViewerLike): void {
  if ('animation' in viewer) {
    viewer.animation = null;
  }
  if ('autoRotate' in viewer) {
    viewer.autoRotate = false;
  }
}

export function applyAnimationModeToViewer(params: {
  viewer: AnimationViewerLike;
  mod: AnimationModuleLike;
  animationMode: AnimationMode;
  animationSpeed: number;
}): AnimationHandleLike | null {
  const { viewer, mod, animationMode, animationSpeed } = params;

  if (animationMode === 'none') return null;

  if (animationMode === 'rotate') {
    if ('autoRotate' in viewer) {
      viewer.autoRotate = true;
      viewer.autoRotateSpeed = animationSpeed;
      return null;
    }
    if (!mod.RotatingAnimation) return null;
    const rotateAnimation = new mod.RotatingAnimation();
    rotateAnimation.speed = animationSpeed;
    if ('animation' in viewer) {
      viewer.animation = rotateAnimation;
      return null;
    }
    return addLegacyAnimation(viewer, rotateAnimation, animationSpeed);
  }

  let AnimationCtor: AnimationCtorLike | undefined;
  if (animationMode === 'idle') AnimationCtor = mod.IdleAnimation;
  else if (animationMode === 'walk') AnimationCtor = mod.WalkingAnimation;
  else if (animationMode === 'run') AnimationCtor = mod.RunningAnimation;
  else if (animationMode === 'fly') AnimationCtor = mod.FlyingAnimation;

  if (!AnimationCtor) return null;

  const animationInstance = new AnimationCtor();
  animationInstance.speed = animationSpeed;

  if ('animation' in viewer) {
    viewer.animation = animationInstance;
    return null;
  }

  return addLegacyAnimation(viewer, animationInstance, animationSpeed);
}

export function resetViewerToFront(
  viewer: AnimationViewerLike | null | undefined,
  controls?: ViewerControlsLike | null,
): void {
  if (!viewer) return;

  viewer.resetCameraPose?.();

  const rotation = viewer.playerWrapper?.rotation;
  if (rotation?.set) {
    rotation.set(0, 0, 0);
  } else if (rotation) {
    rotation.y = 0;
  }

  const activeControls = controls ?? viewer.controls;
  activeControls?.target?.set?.(0, 0, 0);
  activeControls?.update?.();
  activeControls?.saveState?.();
}
