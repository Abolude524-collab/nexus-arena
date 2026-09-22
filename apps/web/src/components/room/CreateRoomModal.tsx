import React, { useState } from 'react';
import { X, Lock, Users, Gamepad2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [gameType, setGameType] = useState('Neon Dash');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { createRoom, isLoading, error, clearError } = useRoomStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await createRoom({
        name: name || 'Neon Arena',
        gameType,
        maxPlayers,
        isPrivate,
        password: isPrivate ? password : undefined,
      });
      onClose();
    } catch (_err) {
      // Error in store
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-nexus-surface border border-nexus-border rounded-modal p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-nexus-border pb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold uppercase tracking-wider text-white">
              CREATE ROOM
            </h2>
            <p className="text-xs text-nexus-muted mt-0.5">Configure host parameters for your arena</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-nexus-danger/10 border border-nexus-danger/40 flex items-center gap-3 text-nexus-danger text-sm font-mono">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="flex items-center justify-between p-3 rounded-btn bg-nexus-card border border-nexus-border">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-white">Private Room</div>
              <div className="text-xs text-nexus-muted">Require password to join</div>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5 accent-nexus-accent rounded cursor-pointer"
            />
          </div>

          {isPrivate && (
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-2 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-50 text-white font-heading font-bold text-sm uppercase tracking-wider transition-all glow-accent"
          >
            {isLoading ? 'CREATING ARENA...' : 'CREATE ROOM'}
          </button>
        </form>
      </div>
    </div>
  );
};
