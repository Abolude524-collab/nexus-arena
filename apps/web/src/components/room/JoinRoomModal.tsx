import React, { useState } from 'react';
import { X, Lock, Hash, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
}) => {
  const [code, setCode] = useState(initialCode);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { joinRoom, isLoading, error, clearError } = useRoomStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await joinRoom(code.trim().toUpperCase(), password);
      onClose();
    } catch (_err) {
      // Handled in store
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-nexus-surface border border-nexus-border rounded-modal p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-nexus-border pb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold uppercase tracking-wider text-white">
              JOIN BY CODE
            </h2>
            <p className="text-xs text-nexus-muted mt-0.5">
              Enter or paste a 6-character room code to join an active arena
            </p>
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
            <label className="text-xs font-mono text-nexus-muted uppercase">ROOM CODE OR ID</label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              <input
                type="text"
                required
                maxLength={36}
                placeholder="e.g. 7F42X9"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-nexus-cyan font-mono font-bold text-sm tracking-widest focus:outline-none focus:border-nexus-accent transition-colors uppercase"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-nexus-muted uppercase">ROOM PASSWORD (IF PRIVATE)</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Optional password"
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

          <button
            type="submit"
            disabled={isLoading || !code.trim()}
            className="w-full py-3 mt-2 rounded-btn bg-nexus-cyan hover:bg-nexus-cyan/90 disabled:opacity-50 text-black font-heading font-bold text-sm uppercase tracking-wider transition-all glow-cyan"
          >
            {isLoading ? 'JOINING ARENA...' : 'JOIN ROOM'}
          </button>
        </form>
      </div>
    </div>
  );
};
