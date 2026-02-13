import React, { type RefObject } from 'react';

type Props = {
  stageRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
};

export function SkinViewerStage({ stageRef, canvasRef }: Props) {
  return (
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
  );
}
