import React, { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';

interface QuitMatchDialogProps {
  isOpen: boolean;
  matchName?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Leaving mid-match is irreversible, so the destructive action is always gated
 * behind an explicit confirmation. Focus lands on the safe choice and Escape
 * cancels, so a stray Enter can never forfeit a match.
 */
export const QuitMatchDialog: React.FC<QuitMatchDialogProps> = ({
  isOpen,
  matchName,
  onCancel,
  onConfirm,
}) => {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quit-match-title"
      aria-describedby="quit-match-description"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-nexus-surface border-2 border-nexus-danger/70 rounded-modal p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nexus-danger/15 border border-nexus-danger/40 text-nexus-danger font-mono text-[10px] sm:text-xs uppercase font-bold">
            <LogOut className="w-4 h-4" /> LEAVE ARENA
          </div>
          <h2
            id="quit-match-title"
            className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-wider"
          >
            QUIT THIS MATCH?
          </h2>
          <p id="quit-match-description" className="text-nexus-muted text-sm leading-relaxed">
            {matchName ? <span className="text-white font-bold">{matchName} </span> : null}
            is still running. You will forfeit the rest of the match and return to the lobby — your
            score stops counting from here.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-11 px-5 rounded-btn bg-nexus-card hover:bg-nexus-surface border border-nexus-border text-white font-heading text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            KEEP PLAYING
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 px-5 rounded-btn bg-nexus-danger hover:bg-nexus-danger/90 text-white font-heading text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            QUIT MATCH
          </button>
        </div>
      </div>
    </div>
  );
};
