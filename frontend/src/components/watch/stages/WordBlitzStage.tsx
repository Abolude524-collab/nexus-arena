import React from 'react';
import { Type, Eye, CheckCircle2, Lock } from 'lucide-react';

interface WordBlitzStageProps {
  state: any;
}

const maskPrompt = (length: number): string => {
  const safeLength = Math.min(Math.max(length, 1), 48);
  return Array.from({ length: safeLength })
    .map(() => '_')
    .join(' ');
};

/**
 * Read-only Word Blitz surface. The server only includes `challenge.prompt`
 * once the round is revealed, so this component cannot leak the answer.
 */
export const WordBlitzStage: React.FC<WordBlitzStageProps> = ({ state }) => {
  const status = state?.status as string | undefined;
  const challenge = state?.challenge;
  const players: any[] = state?.players || [];
  const isRevealed = Boolean(challenge?.prompt);
  const submittedCount = players.filter((p) => p.hasSubmitted).length;

  const endsAt = typeof state?.endsAt === 'number' ? state.endsAt : 0;
  const remainingMs = Math.max(0, endsAt - Date.now());
  const remainingSecs = Math.ceil(remainingMs / 1000);
  const roundWindowMs = 10_000;
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / roundWindowMs) * 100));

  return (
    <div className="relative w-full h-full min-h-[320px] flex items-center justify-center rounded-card border-2 border-nexus-border bg-nexus-surface/40 p-4 sm:p-6 shadow-2xl overflow-hidden">
      <div className="w-full max-w-xl space-y-5 text-center">
        {/* Round + status line */}
        <div className="flex items-center justify-center gap-2 flex-wrap font-mono text-[10px] uppercase tracking-widest text-nexus-muted">
          <span className="px-2.5 py-1 rounded-full bg-nexus-card border border-nexus-border">
            ROUND {state?.currentRound || 0} / {state?.totalRounds || 0}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-nexus-card border border-nexus-border">
            {submittedCount}/{players.length} SUBMITTED
          </span>
          {status === 'ROUND_ACTIVE' && (
            <span className="px-2.5 py-1 rounded-full bg-nexus-success/15 border border-nexus-success/40 text-nexus-success">
              {remainingSecs}s LEFT
            </span>
          )}
        </div>

        {/* Timer bar */}
        <div className="w-full h-2 rounded-full bg-nexus-card overflow-hidden border border-nexus-border">
          <div
            style={{ width: `${progressPercent}%` }}
            className={`h-full transition-all duration-200 ${
              remainingSecs <= 3 ? 'bg-nexus-danger' : 'bg-nexus-cyan'
            }`}
          />
        </div>

        {/* Prompt / masked prompt */}
        <div className="p-4 sm:p-7 rounded-card bg-nexus-card border-2 border-nexus-border space-y-2 sm:space-y-3 shadow-2xl">
          <div className="font-mono text-[10px] sm:text-xs text-nexus-muted uppercase tracking-widest flex items-center justify-center gap-1.5">
            {isRevealed ? (
              <>
                <Type className="w-3.5 h-3.5 text-nexus-success" /> ROUND ANSWER REVEALED
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-nexus-cyan" /> ANSWER HIDDEN UNTIL ROUND END
              </>
            )}
          </div>

          <div
            className={`font-heading font-extrabold text-2xl sm:text-4xl md:text-5xl tracking-widest break-all ${
              isRevealed
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-nexus-accent via-nexus-cyan to-white'
                : 'text-nexus-border'
            }`}
          >
            {isRevealed
              ? challenge.prompt
              : challenge
                ? maskPrompt(challenge.promptLength || 0)
                : 'WAITING...'}
          </div>

          {!isRevealed && challenge && (
            <div className="font-mono text-[10px] uppercase tracking-widest text-nexus-muted">
              {challenge.promptLength} CHARACTERS • {challenge.difficulty}
            </div>
          )}
        </div>

        {/* Per-player submission status */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {players.map((p) => (
            <span
              key={p.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider border ${
                p.hasSubmitted
                  ? 'bg-nexus-success/15 border-nexus-success/40 text-nexus-success'
                  : 'bg-nexus-card border-nexus-border text-nexus-muted'
              }`}
            >
              {p.hasSubmitted && <CheckCircle2 className="w-3 h-3" />}
              {p.username}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-nexus-card/90 border border-nexus-border font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-nexus-muted">
        <Eye className="w-3 h-3" /> OBSERVER MODE — TYPING DISABLED
      </div>
    </div>
  );
};
