import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, register, isLoading, error, clearError } = useAuthStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ username, email, password });
      }
      onClose();
    } catch (_err) {
      // Error handled in store
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-nexus-surface border border-nexus-border rounded-modal p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-nexus-border pb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold uppercase tracking-wider text-white">
              {mode === 'login' ? 'ACCESS ARENA' : 'CREATE ACCOUNT'}
            </h2>
            <p className="text-xs text-nexus-muted mt-0.5">
              {mode === 'login' ? 'Enter credentials to access multiplayer' : 'Join the NEXUS ARENA competitive ecosystem'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-nexus-danger/10 border border-nexus-danger/40 flex items-center gap-3 text-nexus-danger text-sm font-mono">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-nexus-muted uppercase">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
                <input
                  type="text"
                  required
                  placeholder="e.g. NeonGladiator"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-white text-sm focus:outline-none focus:border-nexus-accent transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-nexus-muted uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              <input
                type="email"
                required
                placeholder="player@nexus.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-white text-sm focus:outline-none focus:border-nexus-accent transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-nexus-muted uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
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
            disabled={isLoading}
            className="w-full py-3 mt-2 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-50 text-white font-heading font-bold text-sm uppercase tracking-wider transition-all glow-accent"
          >
            {isLoading
              ? 'AUTHENTICATING...'
              : mode === 'login'
              ? 'ENTER LOBBY'
              : 'CREATE PROFILE'}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="text-center pt-2 border-t border-nexus-border">
          {mode === 'login' ? (
            <p className="text-xs text-nexus-muted">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('register');
                }}
                className="text-nexus-cyan hover:underline font-semibold"
              >
                Register here
              </button>
            </p>
          ) : (
            <p className="text-xs text-nexus-muted">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('login');
                }}
                className="text-nexus-cyan hover:underline font-semibold"
              >
                Login to profile
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
