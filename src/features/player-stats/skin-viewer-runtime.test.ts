import { describe, expect, it, vi } from 'vitest';

import {
  applyAnimationModeToViewer,
  clearViewerAnimationState,
  resetViewerToFront,
  type AnimationViewerLike,
} from './skin-viewer-runtime';

class IdleAnimation {
  speed = 0;
}

class WalkingAnimation {
  speed = 0;
}

class RotatingAnimation {
  speed = 0;
}

describe('skin-viewer-runtime', () => {
  it('activates autoRotate for rotate mode', () => {
    const viewer: AnimationViewerLike = {
      animation: null,
      autoRotate: false,
      autoRotateSpeed: 0,
    };

    const handle = applyAnimationModeToViewer({
      viewer,
      mod: { RotatingAnimation },
      animationMode: 'rotate',
      animationSpeed: 1.5,
    });

    expect(handle).toBeNull();
    expect(viewer.autoRotate).toBe(true);
    expect(viewer.autoRotateSpeed).toBe(1.5);
  });

  it('sets a modern viewer animation instance with speed', () => {
    const viewer: AnimationViewerLike = {
      animation: null,
      autoRotate: false,
    };

    const handle = applyAnimationModeToViewer({
      viewer,
      mod: { IdleAnimation },
      animationMode: 'idle',
      animationSpeed: 2.25,
    });

    expect(handle).toBeNull();
    expect(viewer.animation).toBeInstanceOf(IdleAnimation);
    expect(viewer.animation?.speed).toBe(2.25);
  });

  it('falls back to legacy animations.add when no animation property exists', () => {
    const legacyHandle = {};
    const add = vi.fn(() => legacyHandle);
    const viewer: AnimationViewerLike = {
      animations: { add },
    };

    const result = applyAnimationModeToViewer({
      viewer,
      mod: { WalkingAnimation },
      animationMode: 'walk',
      animationSpeed: 0.75,
    });

    expect(add).toHaveBeenCalledTimes(1);
    expect(result).toBe(legacyHandle);
    expect((legacyHandle as { speed?: number }).speed).toBe(0.75);
  });

  it('resets animation state by clearing animation and autoRotate', () => {
    const viewer: AnimationViewerLike = {
      animation: { speed: 1 },
      autoRotate: true,
      autoRotateSpeed: 2,
    };

    clearViewerAnimationState(viewer);

    expect(viewer.animation).toBeNull();
    expect(viewer.autoRotate).toBe(false);
  });

  it('resets viewer camera, rotation and controls to front', () => {
    const resetCameraPose = vi.fn();
    const setRotation = vi.fn();
    const setTarget = vi.fn();
    const update = vi.fn();
    const saveState = vi.fn();

    const viewer: AnimationViewerLike = {
      resetCameraPose,
      playerWrapper: {
        rotation: {
          set: setRotation,
        },
      },
    };

    resetViewerToFront(viewer, {
      target: { set: setTarget },
      update,
      saveState,
    });

    expect(resetCameraPose).toHaveBeenCalledTimes(1);
    expect(setRotation).toHaveBeenCalledWith(0, 0, 0);
    expect(setTarget).toHaveBeenCalledWith(0, 0, 0);
    expect(update).toHaveBeenCalledTimes(1);
    expect(saveState).toHaveBeenCalledTimes(1);
  });
});
