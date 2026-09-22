import React, { useEffect, useState } from 'react';
import { Shield, Clock, Trophy, Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { TerritoryGameState } from '@nexus-arena/shared';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';

interface TerritoryViewProps {
  gameState: TerritoryGameState;
}

export const TerritoryView: React.FC<TerritoryViewProps> = ({ gameState }) => {
  const { user } = useAuthStore();
  const myPlayer = gameState.players.find((p) => p.id === user?.id);

  const [keys, setKeys] = useState({ up: false, down: false, left: false, right: false });

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
    <div className="fixed inset-0 z-50 bg-nexus-bg flex flex-col justify-between p-4 overflow-hidden selection:bg-none font-sans">
      {/* Top HUD */}
      <div className="flex items-center justify-between bg-nexus-surface/90 border border-nexus-border backdrop-blur px-6 py-3 rounded-card z-10">
        <div className="flex items-center gap-6">
          <div className="font-heading font-extrabold text-xl text-white tracking-wider flex items-center gap-2">
            <Shield className="w-6 h-6 text-nexus-accent animate-pulse" />
            <span className="text-nexus-accent">TERRITORY</span> CLASH
          </div>
          <div className="flex items-center gap-2 font-mono text-sm bg-nexus-card px-3 py-1.5 rounded-btn border border-nexus-border">
            <Clock className="w-4 h-4 text-nexus-cyan" />
            <span className="text-nexus-muted">TIME:</span>
            <span className="text-white font-bold">{timerStr}</span>
          </div>
        </div>

        {/* Player Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-nexus-card px-4 py-1.5 rounded-btn border border-nexus-border font-mono text-xs">
            <span className="text-nexus-muted">CONTROLLED:</span>
            <span className="text-nexus-cyan font-bold text-base">{myPlayer?.territoriesControlled || 0} CELLS</span>
          </div>
          <div className="flex items-center gap-2 bg-nexus-card px-5 py-1.5 rounded-btn border border-nexus-accent glow-accent font-mono">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-nexus-muted text-xs">YOUR SCORE:</span>
            <span className="text-white font-heading font-extrabold text-2xl">
              {myPlayer?.score || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Main 10x10 Spatial Grid Container */}
      <div className="flex-1 relative flex items-center justify-center my-2">
        <div className="relative aspect-square h-full max-h-[calc(100vh-12rem)] rounded-card border-2 border-nexus-border bg-nexus-surface p-2 shadow-2xl grid grid-cols-10 grid-rows-10 gap-1.5">
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
                        className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center font-heading font-extrabold text-[9px] text-white shadow-lg glow-accent"
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

        {/* Side Scoreboard */}
        <div className="absolute top-4 right-4 bg-nexus-surface/80 border border-nexus-border backdrop-blur rounded-btn p-3 font-mono text-xs space-y-2 min-w-[170px]">
          <div className="text-[10px] text-nexus-muted uppercase font-heading font-bold border-b border-nexus-border pb-1">
            TERRITORY LEADERBOARD
          </div>
          {sortedPlayers.map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 truncate max-w-[100px]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                <span className="text-nexus-muted truncate">#{idx + 1} {p.username}</span>
              </div>
              <div className="font-bold text-nexus-cyan">{p.score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Touch Controls */}
      <div className="md:hidden flex items-center justify-center gap-3 py-2">
        <button onClick={() => sendInput({ ...keys, left: true })} className="p-3 rounded-btn bg-nexus-card border border-nexus-border text-white"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex flex-col gap-2">
          <button onClick={() => sendInput({ ...keys, up: true })} className="p-3 rounded-btn bg-nexus-card border border-nexus-border text-white"><ArrowUp className="w-5 h-5" /></button>
          <button onClick={() => sendInput({ ...keys, down: true })} className="p-3 rounded-btn bg-nexus-card border border-nexus-border text-white"><ArrowDown className="w-5 h-5" /></button>
        </div>
        <button onClick={() => sendInput({ ...keys, right: true })} className="p-3 rounded-btn bg-nexus-card border border-nexus-border text-white"><ArrowRight className="w-5 h-5" /></button>
      </div>

      {/* Bottom HUD info */}
      <div className="hidden md:flex items-center justify-between bg-nexus-surface/80 border border-nexus-border px-6 py-2 rounded-btn font-mono text-xs text-nexus-muted">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-4 h-4 text-nexus-cyan" />
          <span>CONTROLS: <strong className="text-white">WASD</strong> OR <strong className="text-white">ARROWS</strong> TO MOVE ON 10×10 GRID</span>
        </div>
        <div>
          SCORING: <span className="text-nexus-cyan">CAPTURE (+100)</span> • <span className="text-nexus-accent">CONTROL (+10/sec)</span> • <span className="text-amber-400">DEFEND (+25)</span>
        </div>
      </div>
    </div>
  );
};
