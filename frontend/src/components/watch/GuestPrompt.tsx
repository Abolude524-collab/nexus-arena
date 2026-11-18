import React from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { AuthPromptKind, AUTH_PROMPT_COPY, useAuthPromptStore } from '../../store/authPromptStore';

interface GuestPromptProps {
  kind: AuthPromptKind;
  /** `card` sits in page flow, `panel` fills a sidebar slot, `strip` is a slim banner. */
  variant?: 'card' | 'panel' | 'strip';
  /** Guests can always dismiss a prompt: watching is never interrupted. */
  dismissible?: boolean;
  className?: string;
}

/**
 * Dismissible conversion prompt for anonymous viewers. It never opens a modal on
 * its own — the visitor has to click through, so an active match is never covered
 * by an account wall.
 */
export const GuestPrompt: React.FC<GuestPromptProps> = ({
  kind,
  variant = 'card',
  dismissible = true,
  className = '',
}) => {
  const copy = AUTH_PROMPT_COPY[kind];
  const requestAuth = useAuthPromptStore((state) => state.requestAuth);
  const dismiss = useAuthPromptStore((state) => state.dismiss);
  const isDismissed = useAuthPromptStore((state) => state.dismissed.includes(kind));

  const isStrip = variant === 'strip';

  // A dismissed prompt stays dismissed for the rest of the session
  if (dismissible && isDismissed) return null;

  return (
    <div
      className={`relative rounded-card border border-nexus-accent/30 bg-nexus-accent/[0.07] ${
        isStrip ? 'px-3.5 py-2.5' : 'p-4'
      } ${className}`}
      role="note"
    >
      {dismissible && (
        <button
          type="button"
          onClick={() => dismiss(kind)}
          aria-label="Dismiss sign-up prompt"
          className="absolute right-1.5 top-1.5 min-w-6 min-h-6 flex items-center justify-center rounded text-nexus-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className={`flex ${isStrip ? 'items-center gap-2.5' : 'flex-col gap-3'}`}>
        <div className={`flex items-center gap-2 min-w-0 ${dismissible ? 'pr-8' : ''}`}>
          <Sparkles className="w-4 h-4 text-nexus-accent shrink-0" />
          <h3 className="font-heading text-[11px] font-bold uppercase tracking-wider text-white truncate">
            {copy.title}
          </h3>
        </div>

        {!isStrip && (
          <p className="font-mono text-[11px] text-nexus-muted leading-relaxed">{copy.description}</p>
        )}

        <button
          type="button"
          onClick={() => requestAuth(kind)}
          className={`${
            isStrip ? 'ml-auto shrink-0' : 'self-start'
          } px-3 py-1.5 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer`}
        >
          {copy.action} <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
