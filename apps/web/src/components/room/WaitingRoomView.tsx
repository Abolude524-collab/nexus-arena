import React, { useState } from 'react';
import { Copy, Check, LogOut, Play, Crown } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { ChatPanel } from '../chat/ChatPanel';
import { GameView } from '../game/GameView';

export const WaitingRoomView: React.FC = () => {
  const { currentRoom, leaveRoom, toggleReady } = useRoomStore();
  const { user } = useAuthStore();
  const { gameState, matchResults, startGame } = useGameStore();
  const [copied, setCopied] = useState(false);

  const isGameRunning =
    currentRoom?.status === 'PLAYING' ||
    currentRoom?.status === 'COUNTDOWN' ||
    Boolean(gameState) ||
    Boolean(matchResults);

  if (isGameRunning) {
    return <GameView />;
  }

  if (!currentRoom || !user) return null;

  const isHost = currentRoom.hostId === user.id;
  const localPlayer = currentRoom.players.find((p) => p.id === user.id);
  const isReady = localPlayer?.isReady || false;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      {/* Room Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-card bg-nexus-surface border border-nexus-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-3xl font-extrabold text-white tracking-wider">
              {currentRoom.name}
            </h1>
            <span className="px-3 py-1 rounded-full bg-nexus-accent/20 border border-nexus-accent/40 text-nexus-accent font-mono text-xs uppercase font-bold">
              {currentRoom.gameType}
            </span>
          </div>
          <p className="text-nexus-muted text-sm mt-1">
            Waiting area • {currentRoom.players.length} / {currentRoom.maxPlayers} Players Joined
          </p>
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-btn bg-nexus-card border border-nexus-border font-mono text-sm">
            <span className="text-nexus-muted">CODE:</span>
            <span className="text-nexus-cyan font-bold tracking-widest">{currentRoom.code}</span>
            <button
              onClick={handleCopyCode}
              className="ml-2 text-nexus-muted hover:text-white transition-colors cursor-pointer"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-4 h-4 text-nexus-success" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={leaveRoom}
            className="px-4 py-2 rounded-btn bg-nexus-card hover:bg-nexus-danger/20 border border-nexus-border hover:border-nexus-danger/40 text-nexus-muted hover:text-nexus-danger font-heading text-sm font-semibold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> LEAVE
          </button>
        </div>
      </div>

      {/* Main Grid & Player Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Player Cards (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-white">
            CONNECTED PLAYERS ({currentRoom.players.length}/{currentRoom.maxPlayers})
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentRoom.players.map((player) => (
              <div
                key={player.id}
                className={`relative rounded-card p-5 bg-nexus-surface border transition-all flex flex-col items-center justify-center text-center space-y-3 ${
                  player.isReady ? 'border-nexus-success/50 shadow-lg glow-cyan' : 'border-nexus-border'
                }`}
              >
                {/* Host Crown */}
                {player.isHost && (
                  <div className="absolute top-3 right-3 text-amber-400" title="Room Host">
                    <Crown className="w-4 h-4" />
                  </div>
                )}

                {/* Avatar Icon */}
                <div className="w-16 h-16 rounded-full bg-nexus-card border-2 border-nexus-accent/60 flex items-center justify-center font-heading text-2xl font-bold text-white uppercase shadow-inner">
                  {player.username.substring(0, 2)}
                </div>

                <div>
                  <div className="font-heading font-bold text-base text-white truncate max-w-[120px]">
                    {player.username}
                  </div>
                  <div className="text-[11px] font-mono text-nexus-muted mt-0.5">
                    {player.id === user.id ? '(YOU)' : player.isHost ? 'HOST' : 'PLAYER'}
                  </div>
                </div>

                {/* Ready Status */}
                <div
                  className={`px-3 py-1 rounded-full text-xs font-mono uppercase font-bold ${
                    player.isReady
                      ? 'bg-nexus-success/20 text-nexus-success border border-nexus-success/40'
                      : 'bg-nexus-muted/20 text-nexus-muted border border-nexus-border'
                  }`}
                >
                  {player.isReady ? '✓ READY' : 'WAITING'}
                </div>
              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: currentRoom.maxPlayers - currentRoom.players.length }).map((_, i) => (
              <div
                key={i}
                className="rounded-card p-5 bg-nexus-card/30 border border-nexus-border/40 border-dashed flex flex-col items-center justify-center text-nexus-muted space-y-2 min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-full border border-nexus-border flex items-center justify-center font-mono text-xs">
                  +
                </div>
                <div className="font-mono text-xs">OPEN SLOT</div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="pt-4 flex items-center justify-end gap-4">
            {!isHost && (
              <button
                onClick={() => toggleReady(!isReady)}
                className={`px-8 py-3.5 rounded-btn font-heading font-bold text-sm uppercase tracking-wider transition-all cursor-pointer ${
                  isReady
                    ? 'bg-nexus-card border border-nexus-border text-nexus-muted hover:text-white'
                    : 'bg-nexus-cyan text-black hover:bg-nexus-cyan/90 shadow-lg glow-cyan'
                }`}
              >
                {isReady ? 'CANCEL READY' : 'I AM READY'}
              </button>
            )}

            {isHost && (
              <button
                onClick={startGame}
                disabled={currentRoom.players.length < 1}
                className="px-8 py-3.5 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-50 text-white font-heading font-bold text-sm uppercase tracking-wider transition-all glow-accent flex items-center gap-3 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" /> START MATCH
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Info & Room Chat */}
        <div className="space-y-6">
          <ChatPanel />

          <div className="bg-nexus-surface border border-nexus-border rounded-card p-6 space-y-4">
            <h3 className="font-heading font-bold text-base text-white uppercase tracking-wider">
              ARENA RULES
            </h3>

            <div className="space-y-3 text-xs text-nexus-muted leading-relaxed font-mono">
              <div className="flex items-start gap-2">
                <span className="text-nexus-cyan font-bold">01.</span>
                <span>Steer lightcycle with <strong>WASD</strong> keys.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-nexus-cyan font-bold">02.</span>
                <span>Collect Energy (+10), Golden (+50), and Power Cores (+100).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-nexus-cyan font-bold">03.</span>
                <span>Highest score when timer expires wins match.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
