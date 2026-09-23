import React, { useEffect, useRef, useState } from 'react';
import { Trophy, Clock, Gamepad2 } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useRoomStore } from '../../store/roomStore';
import { CanvasRenderer } from '../../game/CanvasRenderer';
import { MatchResultsModal } from './MatchResultsModal';
import { ReactionRushView } from './ReactionRushView';
import { TerritoryView } from './TerritoryView';
import { WordBlitzView } from './WordBlitzView';

export const GameView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const { gameState, matchResults, initGameSocketListeners, sendInput, clearGame } = useGameStore();
  const { user } = useAuthStore();
  const { currentRoom, leaveRoom } = useRoomStore();

  const [keys, setKeys] = useState({ up: false, down: false, left: false, right: false });

  // Initialize socket listeners on mount
  useEffect(() => {
    initGameSocketListeners();
  }, [initGameSocketListeners]);

  // Keyboard input listeners for Neon Dash
  useEffect(() => {
    if (currentRoom?.gameType !== 'Neon Dash') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      let updated = false;
      const newKeys = { ...keys };

      if (key === 'w' || key === 'arrowup') {
        if (!newKeys.up) {
          newKeys.up = true;
          updated = true;
        }
      } else if (key === 's' || key === 'arrowdown') {
        if (!newKeys.down) {
          newKeys.down = true;
          updated = true;
        }
      } else if (key === 'a' || key === 'arrowleft') {
        if (!newKeys.left) {
          newKeys.left = true;
          updated = true;
        }
      } else if (key === 'd' || key === 'arrowright') {
        if (!newKeys.right) {
          newKeys.right = true;
          updated = true;
        }
      }

      if (updated) {
        setKeys(newKeys);
        sendInput(newKeys);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      let updated = false;
      const newKeys = { ...keys };

      if (key === 'w' || key === 'arrowup') {
        if (newKeys.up) {
          newKeys.up = false;
          updated = true;
        }
      } else if (key === 's' || key === 'arrowdown') {
        if (newKeys.down) {
          newKeys.down = false;
          updated = true;
        }
      } else if (key === 'a' || key === 'arrowleft') {
        if (newKeys.left) {
          newKeys.left = false;
          updated = true;
        }
      } else if (key === 'd' || key === 'arrowright') {
        if (newKeys.right) {
          newKeys.right = false;
          updated = true;
        }
      }

      if (updated) {
        setKeys(newKeys);
        sendInput(newKeys);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keys, sendInput, currentRoom]);

  // Render animation frame loop for Neon Dash
  useEffect(() => {
    if (currentRoom?.gameType !== 'Neon Dash') return;
    if (!canvasRef.current || !gameState) return;

    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }

    rendererRef.current.render(gameState as any, user?.id);
  }, [gameState, user, currentRoom]);

  if (!gameState && !matchResults) {
    return null;
  }

  const handleExitMatch = () => {
    clearGame();
    leaveRoom();
  };

  const gameType = currentRoom?.gameType || 'Neon Dash';

  if (gameState) {
    if (gameType === 'Reaction Rush') {
      return (
        <>
          <ReactionRushView gameState={gameState as any} />
          {matchResults && <MatchResultsModal results={matchResults} onExit={handleExitMatch} />}
        </>
      );
    }

    if (gameType === 'Territory') {
      return (
        <>
          <TerritoryView gameState={gameState as any} />
          {matchResults && <MatchResultsModal results={matchResults} onExit={handleExitMatch} />}
        </>
      );
    }

    if (gameType === 'Word Blitz') {
      return (
        <>
          <WordBlitzView gameState={gameState as any} />
          {matchResults && <MatchResultsModal results={matchResults} onExit={handleExitMatch} />}
        </>
      );
    }
  }

  const myPlayer = gameState?.players?.find((p: any) => p.id === user?.id);
  const sortedPlayers = gameState?.players ? [...gameState.players].sort((a: any, b: any) => b.score - a.score) : [];

  const now = Date.now();
  const remainingSeconds = gameState ? Math.max(0, Math.ceil(((gameState.endsAt || 0) - now) / 1000)) : 0;
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-nexus-bg flex flex-col justify-between p-4 overflow-hidden selection:bg-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between bg-nexus-surface/90 border border-nexus-border backdrop-blur px-6 py-3 rounded-card z-10">
        <div className="flex items-center gap-6">
          <div className="font-heading font-extrabold text-xl text-white tracking-wider flex items-center gap-2">
            <span className="text-nexus-cyan">NEON</span> DASH
          </div>
          <div className="flex items-center gap-2 font-mono text-sm bg-nexus-card px-3 py-1.5 rounded-btn border border-nexus-border">
            <Clock className="w-4 h-4 text-nexus-cyan" />
            <span className="text-nexus-muted">TIME:</span>
            <span className="text-white font-bold">{timerStr}</span>
          </div>
        </div>

        {/* My Score Display */}
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

      {/* Main Canvas Container */}
      <div className="flex-1 relative flex items-center justify-center my-2">
        <canvas
          ref={canvasRef}
          width={1600}
          height={900}
          className="max-w-full max-h-full aspect-[16/9] object-contain rounded-card border-2 border-nexus-border shadow-2xl"
        />

        {/* Side Leaderboard Pill Overlay */}
        <div className="absolute top-4 right-4 bg-nexus-surface/80 border border-nexus-border backdrop-blur rounded-btn p-3 font-mono text-xs space-y-2 min-w-[160px]">
          <div className="text-[10px] text-nexus-muted uppercase font-heading font-bold border-b border-nexus-border pb-1">
            SCOREBOARD
          </div>
          {sortedPlayers.slice(0, 5).map((p: any, idx: number) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="text-nexus-muted">#{idx + 1} {p.username}</span>
              <span className="font-bold text-nexus-cyan">{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between bg-nexus-surface/80 border border-nexus-border px-6 py-2 rounded-btn font-mono text-xs text-nexus-muted">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-4 h-4 text-nexus-cyan" />
          <span>CONTROLS: <strong className="text-white">WASD</strong> OR <strong className="text-white">ARROWS</strong> TO MOVE</span>
        </div>
        <div className="flex items-center gap-4">
          <span>ORBS: <span className="text-nexus-cyan">CYAN (+10)</span> • <span className="text-amber-400">GOLD (+50)</span> • <span className="text-nexus-accent">CORE (+100)</span></span>
        </div>
      </div>

      {/* Match Results Modal Overlay */}
      {matchResults && (
        <MatchResultsModal results={matchResults} onExit={handleExitMatch} />
      )}
    </div>
  );
};
