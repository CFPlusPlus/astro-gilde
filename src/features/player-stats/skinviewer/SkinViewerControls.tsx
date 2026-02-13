import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { AnimationMode } from '../skin-viewer-runtime';
import type { BackMode, CapeState } from '../skin-viewer-types';

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

type Props = {
  animationMode: AnimationMode;
  animationSpeed: number;
  backMode: BackMode;
  capeState: CapeState;
  capeUrl: string | null;
  fallbackElytraActive: boolean;
  onAnimationModeChange: (mode: AnimationMode) => void;
  onAnimationSpeedChange: (speed: number) => void;
  onBackModeChange: (mode: BackMode) => void;
};

export function SkinViewerControls({
  animationMode,
  animationSpeed,
  backMode,
  capeState,
  capeUrl,
  fallbackElytraActive,
  onAnimationModeChange,
  onAnimationSpeedChange,
  onBackModeChange,
}: Props) {
  const capeUnavailable = capeState === 'unavailable' || capeState === 'error';

  return (
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
                onClick={() => onAnimationModeChange(option.id)}
                data-active={active}
                className="mg-viewer-option px-2 py-1.5 text-xs font-semibold sm:px-2.5 sm:py-2"
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <label className="mt-2.5 block sm:mt-3">
          <span className="text-muted text-xs">Geschwindigkeit: {animationSpeed.toFixed(2)}x</span>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.05}
            value={animationSpeed}
            disabled={animationMode === 'none'}
            onChange={(e) => onAnimationSpeedChange(Number(e.currentTarget.value))}
            className="mg-range mt-1 w-full"
          />
        </label>
      </div>

      <div className="glass border-border rounded-[var(--radius)] border p-2.5 sm:p-3">
        <p className="text-fg text-xs font-semibold tracking-wide uppercase">Rücken-Item</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {BACK_OPTIONS.map((option) => {
            const active = backMode === option.id;
            const disabled = option.id === 'cape' ? capeState === 'loading' || !capeUrl : false;

            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => onBackModeChange(option.id)}
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
  );
}
