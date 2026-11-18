import React, { useState } from 'react';
import { X, Lock, Users, Gamepad2, ShieldAlert, Eye, EyeOff, Globe, Link2, KeyRound } from 'lucide-react';
import { RoomVisibility } from '../../shared/index.js';
import { useRoomStore } from '../../store/roomStore';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VISIBILITY_OPTIONS: {
  id: RoomVisibility;
  label: string;
  hint: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'PUBLIC',
    label: 'PUBLIC',
    hint: 'Listed in the WATCH directory while the match is live.',
    icon: Globe,
  },
  {
    id: 'UNLISTED',
    label: 'UNLISTED',
    hint: 'Hidden from listings. Watchable only with the spectator link or code.',
    icon: Link2,
  },
  {
    id: 'PRIVATE',
    label: 'PRIVATE',
    hint: 'Password to join and a spectator access code to watch.',
    icon: Lock,
  },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [gameType, setGameType] = useState('Neon Dash');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [visibility, setVisibility] = useState<RoomVisibility>('PUBLIC');
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [spectatorLimit, setSpectatorLimit] = useState(50);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { createRoom, isLoading, error, clearError } = useRoomStore();

  if (!isOpen) return null;

  const activeVisibility =
    VISIBILITY_OPTIONS.find((option) => option.id === visibility) || VISIBILITY_OPTIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await createRoom({
        name: name || 'Neon Arena',
        gameType,
        maxPlayers,
        isPrivate: visibility === 'PRIVATE',
        visibility,
        allowSpectators,
        spectatorLimit,
        password: visibility === 'PRIVATE' ? password : undefined,
      });
      onClose();
    } catch (_err) {
      // Error in store
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-nexus-surface border border-nexus-border rounded-modal shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-nexus-border px-6 py-4">
          <div>
            <h2 className="font-heading text-2xl font-bold uppercase tracking-wider text-white">
              CREATE ROOM
            </h2>
            <p className="text-xs text-nexus-muted mt-0.5">Configure host parameters for your arena</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close create room dialog"
            className="shrink-0 p-2 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-card transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          id="create-room-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-4"
        >
          {error && (
            <div className="p-3 rounded-lg bg-nexus-danger/10 border border-nexus-danger/40 flex items-center gap-3 text-nexus-danger text-sm font-mono">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-nexus-muted uppercase">ROOM NAME</label>
            <input
              type="text"
              required
              placeholder="e.g. Neon Titans"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-white text-sm focus:outline-none focus:border-nexus-accent transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-nexus-muted uppercase">GAME MODE</label>
            <div className="relative">
              <Gamepad2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-white text-sm focus:outline-none focus:border-nexus-accent transition-colors appearance-none cursor-pointer"
              >
                <option value="Neon Dash">Neon Dash (Collectible Battleground)</option>
                <option value="Reaction Rush">Reaction Rush (Speed Target Competition)</option>
                <option value="Territory">Territory (10×10 Grid Control Clash)</option>
                <option value="Word Blitz">Word Blitz (Synchronized Typing Race)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-nexus-muted uppercase">MAX PLAYERS (2 - 8)</label>
            <div className="relative">
              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
                className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-white text-sm focus:outline-none focus:border-nexus-accent transition-colors appearance-none"
              >
                {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <option key={num} value={num}>
                    {num} Players
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-nexus-muted uppercase">ROOM VISIBILITY</label>
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map((option) => {
                const OptionIcon = option.icon;
                const isActive = visibility === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setVisibility(option.id)}
                    className={`flex flex-col items-center gap-1.5 py-2.5 rounded-btn border font-heading text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? 'bg-nexus-accent/20 border-nexus-accent text-white'
                        : 'bg-nexus-card border-nexus-border text-nexus-muted hover:text-white hover:border-nexus-accent/50'
                    }`}
                  >
                    <OptionIcon className={`w-4 h-4 ${isActive ? 'text-nexus-accent' : ''}`} />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] font-mono text-nexus-muted leading-relaxed">
              {activeVisibility.hint}
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-btn bg-nexus-card border border-nexus-border">
            <div className="space-y-0.5 min-w-0">
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-nexus-cyan shrink-0" /> Allow Spectators
              </div>
              <div className="text-xs text-nexus-muted">Observer-only seats with no player slots</div>
            </div>
            <input
              type="checkbox"
              checked={allowSpectators}
              onChange={(e) => setAllowSpectators(e.target.checked)}
              className="w-5 h-5 accent-nexus-accent rounded cursor-pointer shrink-0"
            />
          </div>

          {allowSpectators && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-nexus-muted uppercase">SPECTATOR LIMIT (1 - 200)</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={spectatorLimit}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setSpectatorLimit(Number.isFinite(parsed) ? Math.min(200, Math.max(1, parsed)) : 50);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-white text-sm font-mono focus:outline-none focus:border-nexus-accent transition-colors"
                />
              </div>
            </div>
          )}

          {visibility === 'PRIVATE' && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-nexus-muted uppercase">ROOM PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-white text-sm focus:outline-none focus:border-nexus-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-white transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="shrink-0 border-t border-nexus-border px-6 py-4">
          <button
            type="submit"
            form="create-room-form"
            disabled={isLoading}
            className="w-full py-3 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-50 text-white font-heading font-bold text-sm uppercase tracking-wider transition-all glow-accent cursor-pointer"
          >
            {isLoading ? 'CREATING ARENA...' : 'CREATE ROOM'}
          </button>
        </div>
      </div>
    </div>
  );
};
