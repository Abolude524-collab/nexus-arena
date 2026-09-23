import React from 'react';
import { Zap, Trophy, Clock, Target } from 'lucide-react';
import { ReactionRushGameState } from '../../shared/index.js';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';

interface ReactionRushViewProps {
  gameState: ReactionRushGameState;
}

export const ReactionRushView: React.FC<ReactionRushViewProps> = ({ gameState }) => {
  const { user } = useAuthStore();
  const myPlayer = gameState.players.find((p) => p.id === user?.id);

  const handleTargetClick = (targetId: string) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('reaction:click', {
      roundId: gameState.currentRound,
      targetId,
    });
  };

  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 bg-nexus-bg flex flex-col justify-between p-4 overflow-hidden selection:bg-none font-sans">
      {/* Top HUD */}
      <div className="flex items-center justify-between bg-nexus-surface/90 border border-nexus-border backdrop-blur px-6 py-3 rounded-card z-10">
        <div className="flex items-center gap-6">
          <div className="font-heading font-extrabold text-xl text-white tracking-wider flex items-center gap-2">
            <Zap className="w-6 h-6 text-nexus-cyan animate-bounce" />
            <span className="text-nexus-cyan">REACTION</span> RUSH
          </div>
          <div className="flex items-center gap-2 font-mono text-sm bg-nexus-card px-3 py-1.5 rounded-btn border border-nexus-border">
            <Clock className="w-4 h-4 text-nexus-cyan" />
            <span className="text-nexus-muted">ROUND:</span>
            <span className="text-white font-bold">{gameState.currentRound} / {gameState.totalRounds}</span>
          </div>
        </div>

        {/* Player Score */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-nexus-card px-5 py-1.5 rounded-btn border border-nexus-accent glow-accent font-mono">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-nexus-muted text-xs">YOUR SCORE:</span>
            <span className="text-white font-heading font-extrabold text-2xl">
              {myPlayer?.score || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Main Arena Display */}
      <div className="flex-1 relative flex items-center justify-center my-2 rounded-card border-2 border-nexus-border bg-nexus-surface/40 overflow-hidden shadow-2xl">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(#06B6D4 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
          }}
        ></div>

        {/* Status Banner */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          {gameState.status === 'COUNTDOWN' && (
            <div className="px-6 py-2.5 rounded-full bg-nexus-accent/20 border border-nexus-accent text-nexus-accent font-heading font-extrabold text-lg uppercase tracking-wider animate-pulse">
              GET READY... MATCH STARTING
            </div>
          )}
          {gameState.status === 'ARMED' && (
            <div className="px-6 py-2.5 rounded-full bg-nexus-warning/20 border border-nexus-warning text-nexus-warning font-heading font-extrabold text-lg uppercase tracking-wider animate-pulse">
              WAIT FOR TARGET... DO NOT CLICK EARLY!
            </div>
          )}
          {gameState.status === 'TARGET_ACTIVE' && (
            <div className="px-8 py-3 rounded-full bg-nexus-success/20 border-2 border-nexus-success text-nexus-success font-heading font-extrabold text-2xl uppercase tracking-widest glow-cyan animate-bounce">
              TARGET ACTIVE! CLICK NOW!
            </div>
          )}
          {gameState.status === 'ROUND_RESULT' && (
            <div className="px-6 py-2.5 rounded-full bg-nexus-card border border-nexus-border text-white font-heading font-bold text-base uppercase">
              {gameState.roundWinnerName ? (
                <span>
                  ROUND WINNER: <strong className="text-nexus-cyan">{gameState.roundWinnerName}</strong> ({gameState.roundWinnerMs}ms)
                </span>
              ) : (
                <span className="text-nexus-muted">TIME EXPIRED — NO WINNER</span>
              )}
            </div>
          )}
        </div>

        {/* Clickable Target */}
        {gameState.target && gameState.status === 'TARGET_ACTIVE' && (
          <button
            onClick={() => handleTargetClick(gameState.target!.id)}
            onTouchStart={(e) => {
              e.preventDefault();
              handleTargetClick(gameState.target!.id);
            }}
            style={{
              position: 'absolute',
              left: `${(gameState.target.x / 1600) * 100}%`,
              top: `${(gameState.target.y / 900) * 100}%`,
              width: `${gameState.target.radius * 2}px`,
              height: `${gameState.target.radius * 2}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="rounded-full bg-nexus-cyan border-4 border-white shadow-2xl glow-cyan flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 z-30"
          >
            <Target className="w-8 h-8 text-black animate-spin" />
          </button>
        )}

        {/* Side Scoreboard */}
        <div className="absolute top-4 right-4 bg-nexus-surface/80 border border-nexus-border backdrop-blur rounded-btn p-3 font-mono text-xs space-y-2 min-w-[170px]">
          <div className="text-[10px] text-nexus-muted uppercase font-heading font-bold border-b border-nexus-border pb-1">
            SCOREBOARD
          </div>
          {sortedPlayers.map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="text-nexus-muted truncate max-w-[90px]">#{idx + 1} {p.username}</span>
              <div className="flex items-center gap-1.5">
                {p.lastReactionMs && (
                  <span className="text-[10px] text-nexus-muted">({p.lastReactionMs}ms)</span>
                )}
                <span className="font-bold text-nexus-cyan">{p.score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="flex items-center justify-center bg-nexus-surface/80 border border-nexus-border px-6 py-2 rounded-btn font-mono text-xs text-nexus-muted">
        <span>SPEED BONUS: <strong className="text-nexus-cyan">&lt; 150ms (+100)</strong> • <strong className="text-amber-400">FIRST CLICK (+50)</strong></span>
      </div>
    </div>
  );
};
