import React, { useState } from 'react';
import { KeyRound, X, Loader2, ShieldAlert } from 'lucide-react';
import { useWatchStore } from '../../store/watchStore';

interface CodeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolved: (matchId: string, code: string) => void;
}

/**
 * Entry point for private/unlisted matches. The server resolves the code to a
 * match ID and rate limits attempts, so no enumeration is possible here.
 */
export const CodeEntryModal: React.FC<CodeEntryModalProps> = ({ isOpen, onClose, onResolved }) => {
  const { resolveAccessCode } = useWatchStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setCode('');
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const matchId = await resolveAccessCode(trimmed);
      onResolved(matchId, trimmed);
      setCode('');
      setIsSubmitting(false);
    } catch (err: any) {
      setError(err?.message || 'Unable to resolve that access code');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-nexus-surface border border-nexus-border rounded-modal p-6 shadow-2xl space-y-6">
        <div className="flex items-start justify-between border-b border-nexus-border pb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold uppercase tracking-wider text-white">
              PRIVATE MATCH
            </h2>
            <p className="text-xs text-nexus-muted mt-0.5">
              Enter the spectator access code from the host
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-card transition-colors cursor-pointer"
            aria-label="Close access code dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-nexus-danger/10 border border-nexus-danger/40 flex items-center gap-3 text-nexus-danger text-sm font-mono">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="spectator-access-code"
              className="text-xs font-mono text-nexus-muted uppercase"
            >
              SPECTATOR ACCESS CODE
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              <input
                id="spectator-access-code"
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7K4M2QX9"
                className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-white text-sm font-mono tracking-[0.2em] uppercase focus:outline-none focus:border-nexus-accent transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!code.trim() || isSubmitting}
            className="w-full py-3 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-bold text-sm uppercase tracking-wider transition-all glow-accent flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> RESOLVING...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" /> WATCH MATCH
              </>
            )}
          </button>

          <p className="text-[11px] font-mono text-nexus-muted leading-relaxed">
            Codes are verified by the server. Knowing a match ID alone never grants spectator access.
          </p>
        </form>
      </div>
    </div>
  );
};
