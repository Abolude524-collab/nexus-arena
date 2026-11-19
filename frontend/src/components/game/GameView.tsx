import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, Gamepad2, LogOut } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useRoomStore } from '../../store/roomStore';
import { CanvasRenderer } from '../../game/CanvasRenderer';
import { MatchResultsModal } from './MatchResultsModal';
import { ReactionRushView } from './ReactionRushView';
import { TerritoryView } from './TerritoryView';
import { WordBlitzView } from './WordBlitzView';
import { VirtualDPad } from './VirtualDPad';
import { QuitMatchDialog } from './QuitMatchDialog';
import { HostWatchShare } from '../room/HostWatchShare';

export const GameView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const { gameState, matchResults, initGameSocketListeners, sendInput, clearGame } = useGameStore();
  const { user } = useAuthStore();
  const { currentRoom, leaveRoom } = useRoomStore();
  const navigate = useNavigate();

  const [_keys, setKeys] = useState({ up: false, down: false, left: false, right: false });
  const [showDpad, setShowDpad] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isQuitOpen, setIsQuitOpen] = useState(false);
  const activeKeysRef = useRef({ up: false, down: false, left: false, right: false });

  const updateInputState = useCallback(
    (newKeys: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
      activeKeysRef.current = newKeys;
      setKeys(newKeys);
      sendInput(newKeys);
    },
    [sendInput]
  );

  const handleVirtualDpadChange = useCallback(
    (newKeys: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
      updateInputState(newKeys);
    },
    [updateInputState]
  );

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
      const current = { ...activeKeysRef.current };

      if (key === 'w' || key === 'arrowup') {
        if (!current.up) {
          current.up = true;
          updated = true;
        }
      } else if (key === 's' || key === 'arrowdown') {
        if (!current.down) {
          current.down = true;
          updated = true;
        }
      } else if (key === 'a' || key === 'arrowleft') {
        if (!current.left) {
          current.left = true;
          updated = true;
        }
      } else if (key === 'd' || key === 'arrowright') {
        if (!current.right) {
          current.right = true;
          updated = true;
        }
      }

      if (updated) {
        updateInputState(current);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      let updated = false;
      const current = { ...activeKeysRef.current };

      if (key === 'w' || key === 'arrowup') {
        if (current.up) {
          current.up = false;
          updated = true;
        }
      } else if (key === 's' || key === 'arrowdown') {
        if (current.down) {
          current.down = false;
          updated = true;
        }
      } else if (key === 'a' || key === 'arrowleft') {
        if (current.left) {
          current.left = false;
          updated = true;
        }
      } else if (key === 'd' || key === 'arrowright') {
        if (current.right) {
          current.right = false;
          updated = true;
        }
      }

      if (updated) {
        updateInputState(current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentRoom?.gameType, updateInputState]);

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

  const requestQuit = () => setIsQuitOpen(true);

  const handleQuitConfirmed = () => {
    setIsQuitOpen(false);
    // Quitting drops the player back into the lobby rather than whichever page
    // they entered the arena from.
    handleExitMatch();
    navigate('/lobby');
  };

  const quitDialog = (
    <QuitMatchDialog
      isOpen={isQuitOpen}
      matchName={gameType}
      onCancel={() => setIsQuitOpen(false)}
      onConfirm={handleQuitConfirmed}
    />
  );

  if (gameState) {
    if (gameType === 'Reaction Rush') {
      return (
        <>
          <HostWatchShare />
          <ReactionRushView gameState={gameState as any} onQuit={requestQuit} />
          {matchResults && <MatchResultsModal results={matchResults} onExit={handleExitMatch} />}
          {quitDialog}
        </>
      );
    }

    if (gameType === 'Territory') {
      return (
        <>
          <HostWatchShare />
          <TerritoryView gameState={gameState as any} onQuit={requestQuit} />
          {matchResults && <MatchResultsModal results={matchResults} onExit={handleExitMatch} />}
          {quitDialog}
        </>
      );
    }

    if (gameType === 'Word Blitz') {
      return (
        <>
          <HostWatchShare />
          <WordBlitzView gameState={gameState as any} onQuit={requestQuit} />
          {matchResults && <MatchResultsModal results={matchResults} onExit={handleExitMatch} />}
          {quitDialog}
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
    <div className="fixed inset-0 z-50 bg-nexus-bg flex flex-col justify-between p-2 md:p-4 overflow-hidden selection:bg-none">
      <HostWatchShare />
      {/* Top HUD — wraps to a second row on narrow phones instead of overflowing */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-nexus-surface/90 border border-nexus-border backdrop-blur px-2 sm:px-6 py-2 md:py-3 rounded-card z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <div className="font-heading font-extrabold text-sm sm:text-xl text-white tracking-wider flex items-center gap-1.5 shrink-0">
            <span className="text-nexus-cyan">NEON</span> DASH
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 font-mono text-[11px] sm:text-sm bg-nexus-card px-2 sm:px-3 py-1 md:py-1.5 rounded-btn border border-nexus-border shrink-0">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-nexus-cyan" />
            <span className="text-nexus-muted hidden sm:inline">TIME:</span>
            <span className="text-white font-bold">{timerStr}</span>
          </div>
        </div>

        {/* My Score Display + quit */}
        <div className="flex items-center gap-2 md:gap-4 ml-auto">
          <div className="flex items-center gap-1.5 md:gap-2 bg-nexus-card px-2.5 sm:px-5 py-1 md:py-1.5 rounded-btn border border-nexus-accent glow-accent font-mono">
            <Trophy className="w-4 h-4 md:w-5 md:h-5 text-amber-400 hidden sm:block" />
            <span className="text-nexus-muted text-[10px] md:text-xs hidden sm:inline">YOUR SCORE:</span>
            <span className="text-white font-heading font-extrabold text-base sm:text-2xl">
              {myPlayer?.score || 0}
            </span>
          </div>
          <button
            type="button"
            onClick={requestQuit}
            aria-label="Quit match"
            className="flex items-center gap-1 px-2 min-h-6 sm:px-3 sm:py-1.5 rounded-btn bg-nexus-card border border-nexus-border hover:border-nexus-danger/60 hover:text-nexus-danger text-nexus-muted font-heading text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">QUIT</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Container - min-h-0 prevents flex overflow on desktop. On
          phones the leaderboard leaves the overlay and sits under the canvas so
          it never covers the play field. */}
      <div className="flex-1 min-h-0 relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-0 my-1 md:my-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1600}
          height={900}
          className="w-full sm:w-auto h-auto max-w-full max-h-full aspect-[16/9] object-contain rounded-card border-2 border-nexus-border shadow-2xl"
        />

        {/* Side Leaderboard Pill Overlay */}
        <div className="w-full max-w-md sm:w-auto sm:absolute sm:top-4 sm:right-4 bg-nexus-surface/90 border border-nexus-border backdrop-blur rounded-btn p-2 md:p-3 font-mono text-[11px] md:text-xs flex flex-wrap gap-x-3 gap-y-1 sm:flex-col sm:gap-y-2 sm:min-w-[130px] md:min-w-[160px] shadow-lg">
          <div className="hidden sm:block text-[9px] md:text-[10px] text-nexus-muted uppercase font-heading font-bold border-b border-nexus-border pb-1">
            SCOREBOARD
          </div>
          {sortedPlayers.slice(0, 5).map((p: any, idx: number) => (
            <div key={p.id} className="flex items-center justify-between gap-1.5">
              <span className="text-nexus-muted truncate max-w-[80px] md:max-w-[100px]">#{idx + 1} {p.username}</span>
              <span className="font-bold text-nexus-cyan">{p.score}</span>
            </div>
          ))}
        </div>

        {/* Virtual D-Pad Overlay (Toggleable on Desktop, On by default on Mobile) */}
        {showDpad && (
          <div className="fixed bottom-14 left-4 z-40 opacity-90 hover:opacity-100 active:opacity-100 transition-opacity">
            <VirtualDPad onDirectionChange={handleVirtualDpadChange} />
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between bg-nexus-surface/80 border border-nexus-border px-3 md:px-6 py-1.5 md:py-2 rounded-btn font-mono text-[11px] md:text-xs text-nexus-muted shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <Gamepad2 className="w-4 h-4 text-nexus-cyan" />
          <span className="hidden md:inline">CONTROLS: <strong className="text-white">WASD</strong> / <strong className="text-white">ARROWS</strong></span>
          <button
            onClick={() => setShowDpad((prev) => !prev)}
            className={`px-2 py-0.5 rounded border font-mono text-[10px] md:text-xs transition-colors flex items-center gap-1 cursor-pointer ${
              showDpad
                ? 'bg-nexus-cyan/20 border-nexus-cyan text-nexus-cyan font-bold'
                : 'bg-nexus-card border-nexus-border text-nexus-muted hover:text-white'
            }`}
            title="Toggle On-Screen Virtual D-Pad"
          >
            🎮 D-PAD: {showDpad ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-2 md:gap-4 text-[10px] md:text-xs">
          <span>ORBS: <span className="text-nexus-cyan">CYAN (+10)</span> • <span className="text-amber-400">GOLD (+50)</span> • <span className="text-nexus-accent">CORE (+100)</span></span>
        </div>
      </div>

      {/* Match Results Modal Overlay */}
      {matchResults && (
        <MatchResultsModal results={matchResults} onExit={handleExitMatch} />
      )}

      {quitDialog}
    </div>
  );
};