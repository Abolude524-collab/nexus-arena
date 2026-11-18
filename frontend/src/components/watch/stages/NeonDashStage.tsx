import React, { useEffect, useRef } from 'react';
import { GameState } from '../../../shared/index.js';
import { CanvasRenderer } from '../../../game/CanvasRenderer';

interface NeonDashStageProps {
  state: any;
}

/**
 * Read-only Neon Dash surface. Reuses the authoritative player renderer but
 * never registers input handlers; no local userId means no "your player" aura.
 */
export const NeonDashStage: React.FC<NeonDashStageProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !state) return;
    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }
    rendererRef.current.render(state as GameState);
  }, [state]);

  return (
    <div className="relative w-full h-full min-h-0 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={1600}
        height={900}
        className="max-w-full max-h-full aspect-[16/9] object-contain rounded-card border-2 border-nexus-border shadow-2xl"
      />
    </div>
  );
};
