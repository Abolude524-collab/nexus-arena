import React, { useEffect, useState } from 'react';
import { Shield, Clock, Trophy, Gamepad2, LogOut } from 'lucide-react';
import { TerritoryGameState } from '../../shared/index.js';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';
import { VirtualDPad } from './VirtualDPad';

interface TerritoryViewProps {
  gameState: TerritoryGameState;
  onQuit: () => void;
}

export const TerritoryView: React.FC<TerritoryViewProps> = ({ gameState, onQuit }) => {
  const { user } = useAuthStore();
  const myPlayer = gameState.players.find((p) => p.id === user?.id);

  const [keys, setKeys] = useState({ up: false, down: false, left: false, right: false });
  const [showDpad, setShowDpad] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const sendInput = (newKeys: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('territory:input', newKeys);
  };

  useEffect(() => {
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
  }, [keys]);

  const now = Date.now();
  const remainingSeconds = Math.max(0, Math.ceil((gameState.endsAt - now) / 1000));
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 bg-nexus-bg flex flex-col justify-between p-2 md:p-4 overflow-hidden selection:bg-none font-sans">
      {/* Top HUD — wraps to a second row on narrow phones instead of overflowing */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-nexus-surface/90 border border-nexus-border backdrop-blur px-2 sm:px-6 py-2 md:py-3 rounded-card z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <div className="font-heading font-extrabold text-sm sm:text-xl text-white tracking-wider flex items-center gap-1.5 shrink-0">
            <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-nexus-accent animate-pulse" />
            <span className="text-nexus-accent">TERRITORY</span> CLASH
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 font-mono text-[11px] sm:text-sm bg-nexus-card px-2 sm:px-3 py-1 md:py-1.5 rounded-btn border border-nexus-border shrink-0">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-nexus-cyan" />
            <span className="text-nexus-muted hidden sm:inline">TIME:</span>
            <span className="text-white font-bold">{timerStr}</span>
          </div>
        </div>

        {/* Player Stats + quit */}
        <div className="flex items-center gap-2 md:gap-4 ml-auto">
          <div className="hidden md:flex items-center gap-2 bg-nexus-card px-3 md:px-4 py-1 md:py-1.5 rounded-btn border border-nexus-border font-mono text-xs">
            <span className="text-nexus-muted">CONTROLLED:</span>
            <span className="text-nexus-cyan font-bold text-sm md:text-base">{myPlayer?.territoriesControlled || 0} CELLS</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 bg-nexus-card px-2.5 sm:px-5 py-1 md:py-1.5 rounded-btn border border-nexus-accent glow-accent font-mono">
            <Trophy className="w-4 h-4 md:w-5 md:h-5 text-amber-400 hidden sm:block" />
            <span className="text-nexus-muted text-[10px] md:text-xs hidden sm:inline">YOUR SCORE:</span>
            <span className="text-white font-heading font-extrabold text-base sm:text-2xl">
              {myPlayer?.score || 0}
            </span>
          </div>
          <button
            type="button"
            onClick={onQuit}
            aria-label="Quit match"
            className="flex items-center gap-1 px-2 min-h-6 sm:px-3 sm:py-1.5 rounded-btn bg-nexus-card border border-nexus-border hover:border-nexus-danger/60 hover:text-nexus-danger text-nexus-muted font-heading text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">QUIT</span>
          </button>
        </div>
      </div>

      {/* Main 10x10 Spatial Grid Container - min-h-0 prevents flex overflow.
          On phones the grid is sized from the viewport width so it can never
          overflow sideways, and the leaderboard moves above it. */}
      <div className="flex-1 min-h-0 relative flex flex-col sm:flex-row items-center justify-center gap-1.5 my-1 md:my-2 overflow-hidden">
        <div className="relative aspect-square w-[min(100%,calc(100dvh-13rem))] sm:w-auto sm:h-full max-w-full max-h-full rounded-card border-2 border-nexus-border bg-nexus-surface p-1.5 sm:p-2 shadow-2xl grid grid-cols-10 grid-rows-10 gap-1 sm:gap-1.5">
          {gameState.cells.map((cell) => {
            const owner = gameState.players.find((p) => p.id === cell.ownerId);
            const isContested = cell.state === 'CONTESTED';

            return (
              <div
                key={cell.id}
                style={{
                  backgroundColor: owner ? `${owner.color}33` : '#131927',
                  borderColor: owner ? owner.color : '#1F293D',
                }}
                className={`relative rounded-lg border transition-all flex items-center justify-center overflow-hidden ${
                  isContested ? 'border-amber-400 animate-pulse bg-amber-400/20' : ''
                }`}
              >
                {/* Capture progress fill bar */}
                {cell.state === 'CAPTURING' && (
                  <div
                    style={{
                      height: `${cell.captureProgress}%`,
                      backgroundColor: owner ? owner.color : '#8B5CF6',
                    }}
                    className="absolute bottom-0 left-0 right-0 opacity-40 transition-all"
                  />
                )}

                {/* Contested Badge Indicator */}
                {isContested && (
                  <span className="font-mono text-[9px] font-bold text-amber-400 bg-black/80 px-1 rounded uppercase">
                    VS
                  </span>
                )}

                {/* Players occupying this cell */}
                <div className="absolute inset-0 flex items-center justify-center gap-1 z-10">
                  {gameState.players
                    .filter((p) => p.gridX === cell.gridX && p.gridY === cell.gridY)
                    .map((p) => (
                      <div
                        key={p.id}
                        style={{ backgroundColor: p.color }}
                        className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full border-2 border-white flex items-center justify-center font-heading font-extrabold text-[7px] sm:text-[9px] text-white shadow-lg glow-accent"
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

        {/* Leaderboard: floating panel on desktop, an inline strip above the grid
            on phones so it never covers the play field. */}
        <div className="order-first sm:order-none w-full max-w-md sm:w-auto sm:absolute sm:top-4 sm:right-4 bg-nexus-surface/90 border border-nexus-border backdrop-blur rounded-btn p-2 md:p-3 font-mono text-[11px] md:text-xs flex flex-wrap justify-center gap-x-3 gap-y-1 sm:flex-col sm:justify-start sm:gap-y-2 sm:min-w-[130px] md:min-w-[170px] shadow-lg">
          <div className="hidden sm:block text-[9px] md:text-[10px] text-nexus-muted uppercase font-heading font-bold border-b border-nexus-border pb-1">
            LEADERBOARD
          </div>
          {sortedPlayers.map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 truncate max-w-[80px] md:max-w-[100px]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                <span className="text-nexus-muted truncate">#{idx + 1} {p.username}</span>
              </div>
              <div className="font-bold text-nexus-cyan">{p.score}</div>
            </div>
          ))}
        </div>

        {/* Virtual D-Pad Overlay (Toggleable on Desktop, On by default on Mobile) */}
        {showDpad && (
          <div className="fixed bottom-14 left-4 z-40 opacity-90 hover:opacity-100 active:opacity-100 transition-opacity">
            <VirtualDPad
              onDirectionChange={(newKeys) => {
                setKeys(newKeys);
                sendInput(newKeys);
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom HUD info */}
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
        <div className="hidden sm:block text-[10px] md:text-xs">
          SCORING: <span className="text-nexus-cyan">CAPTURE (+100)</span> • <span className="text-nexus-accent">CONTROL (+10/s)</span>
        </div>
      </div>
    </div>
  );
};
