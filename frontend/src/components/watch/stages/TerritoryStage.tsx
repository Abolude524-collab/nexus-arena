import React from 'react';
import { Eye } from 'lucide-react';

interface TerritoryStageProps {
  state: any;
}

/**
 * Read-only Territory map. Cells and player markers come from the spectator
 * projection; there are no movement or capture handlers on this surface.
 */
export const TerritoryStage: React.FC<TerritoryStageProps> = ({ state }) => {
  const cells: any[] = state?.cells || [];
  const players: any[] = state?.players || [];

  return (
    <div className="relative w-full h-full min-h-[320px] flex items-center justify-center rounded-card border-2 border-nexus-border bg-nexus-surface/40 p-2 sm:p-3 shadow-2xl overflow-hidden">
      <div className="relative aspect-square h-full max-h-full rounded-card bg-nexus-surface p-1.5 sm:p-2 grid grid-cols-10 grid-rows-10 gap-1 sm:gap-1.5">
        {cells.map((cell: any) => {
          const owner = players.find((p) => p.id === cell.ownerId);
          const isContested = cell.state === 'CONTESTED';

          return (
            <div
              key={cell.id}
              style={{
                backgroundColor: owner ? `${owner.color}33` : '#131927',
                borderColor: owner ? owner.color : '#1F293D',
              }}
              className={`relative rounded-md border flex items-center justify-center overflow-hidden ${
                isContested ? 'border-amber-400 animate-pulse bg-amber-400/20' : ''
              }`}
            >
              {cell.state === 'CAPTURING' && (
                <div
                  style={{
                    height: `${cell.captureProgress}%`,
                    backgroundColor: owner ? owner.color : '#8B5CF6',
                  }}
                  className="absolute bottom-0 left-0 right-0 opacity-40 transition-all"
                />
              )}

              {isContested && (
                <span className="font-mono text-[8px] sm:text-[9px] font-bold text-amber-400 bg-black/80 px-1 rounded uppercase">
                  VS
                </span>
              )}

              <div className="absolute inset-0 flex items-center justify-center gap-0.5 z-10">
                {players
                  .filter((p) => p.gridX === cell.gridX && p.gridY === cell.gridY)
                  .map((p) => (
                    <div
                      key={p.id}
                      style={{ backgroundColor: p.color }}
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white flex items-center justify-center font-heading font-extrabold text-[8px] sm:text-[9px] text-white shadow-lg"
                      title={p.username}
                    >
                      {p.username.substring(0, 1).toUpperCase()}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-nexus-card/90 border border-nexus-border font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-nexus-muted">
        <Eye className="w-3 h-3" /> OBSERVER MODE — NO CAPTURE INPUT
      </div>
    </div>
  );
};
