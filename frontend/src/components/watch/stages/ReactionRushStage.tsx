import React from 'react';
import { Target, Clock, Eye } from 'lucide-react';

interface ReactionRushStageProps {
  state: any;
}

/**
 * Read-only Reaction Rush surface. The target is rendered as a non-interactive
 * marker; spectators have no click handler and the server rejects player events.
 */
export const ReactionRushStage: React.FC<ReactionRushStageProps> = ({ state }) => {
  const status = state?.status as string | undefined;
  const target = state?.target;
  const isTargetActive = status === 'TARGET_ACTIVE' && Boolean(target);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-card border-2 border-nexus-border bg-nexus-surface/40 overflow-hidden shadow-2xl">
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#06B6D4 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Round indicator */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-nexus-card border border-nexus-border font-mono text-[10px] uppercase tracking-widest text-nexus-muted">
        ROUND {state?.currentRound || 0} / {state?.totalRounds || 0}
      </div>

      {/* Status banner */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 text-center px-3 w-full">
        {status === 'COUNTDOWN' && (
          <span className="inline-block px-4 py-2 rounded-full bg-nexus-accent/20 border border-nexus-accent text-nexus-accent font-heading font-bold text-xs sm:text-sm uppercase tracking-wider animate-pulse">
            MATCH STARTING
          </span>
        )}
        {status === 'ARMED' && (
          <span className="inline-block px-4 py-2 rounded-full bg-nexus-warning/20 border border-nexus-warning text-nexus-warning font-heading font-bold text-xs sm:text-sm uppercase tracking-wider animate-pulse">
            TARGET CHARGING — SERVER TIMING HIDDEN
          </span>
        )}
        {status === 'TARGET_ACTIVE' && (
          <span className="inline-block px-5 py-2 rounded-full bg-nexus-success/20 border-2 border-nexus-success text-nexus-success font-heading font-extrabold text-sm sm:text-lg uppercase tracking-widest glow-cyan">
            TARGET ACTIVE
          </span>
        )}
        {status === 'ROUND_RESULT' && (
          <span className="inline-block px-4 py-2 rounded-full bg-nexus-card border border-nexus-border text-white font-heading font-bold text-xs sm:text-sm uppercase">
            {state?.roundWinnerName ? (
              <>
                ROUND WINNER:{' '}
                <strong className="text-nexus-cyan">{state.roundWinnerName}</strong>
                {state.roundWinnerMs ? ` (${state.roundWinnerMs}ms)` : ''}
              </>
            ) : (
              <span className="text-nexus-muted">NO WINNER THIS ROUND</span>
            )}
          </span>
        )}
        {status === 'INTERMISSION' && (
          <span className="inline-block px-4 py-2 rounded-full bg-nexus-card border border-nexus-border text-nexus-muted font-heading font-bold text-xs uppercase">
            NEXT ROUND INCOMING
          </span>
        )}
      </div>

      {/* Non-interactive target marker */}
      {isTargetActive && (
        <div
          style={{
            position: 'absolute',
            left: `${(target.x / 1600) * 100}%`,
            top: `${(target.y / 900) * 100}%`,
            width: `${target.radius * 2}px`,
            height: `${target.radius * 2}px`,
            transform: 'translate(-50%, -50%)',
          }}
          className="rounded-full bg-nexus-cyan/70 border-4 border-white shadow-2xl glow-cyan flex items-center justify-center pointer-events-none z-30"
          aria-hidden="true"
        >
          <Target className="w-6 h-6 sm:w-8 sm:h-8 text-black animate-spin" />
        </div>
      )}

      {/* Observer notice */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-nexus-card/90 border border-nexus-border font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-nexus-muted">
        <Eye className="w-3 h-3" /> OBSERVER MODE — CLICKS DISABLED
      </div>

      {/* Timing withheld notice */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-nexus-card/90 border border-nexus-border font-mono text-[9px] uppercase tracking-widest text-nexus-muted">
        <Clock className="w-3 h-3 text-nexus-cyan" /> TIMING HIDDEN
      </div>
    </div>
  );
};
