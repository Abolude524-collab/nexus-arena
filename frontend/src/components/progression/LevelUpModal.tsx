import React from 'react';
import { Trophy, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
import { LevelUpPayload } from '../../shared/index.js';

interface LevelUpModalProps {
  payload: LevelUpPayload | null;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ payload, onClose }) => {
  if (!payload) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-nexus-card border-2 border-nexus-accent rounded-card p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl glow-accent">
        {/* Glow backdrop effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-nexus-accent/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-nexus-cyan/30 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-6">
          {/* Trophy Header Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-nexus-accent/20 border-2 border-nexus-accent flex items-center justify-center animate-bounce">
            <Trophy className="w-10 h-10 text-nexus-accent" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nexus-accent/10 border border-nexus-accent/40 text-nexus-cyan text-xs font-mono font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Level Progression
            </div>
            <h2 className="font-heading text-4xl font-black text-white tracking-tight">
              LEVEL UP!
            </h2>
          </div>

          {/* Level Transition Badge */}
          <div className="flex items-center justify-center gap-4 py-3 px-6 bg-nexus-surface rounded-btn border border-nexus-border">
            <div className="text-center">
              <div className="text-xs font-heading uppercase text-nexus-muted">Level</div>
              <div className="text-2xl font-heading font-extrabold text-nexus-muted">
                {payload.previousLevel}
              </div>
            </div>

            <div className="text-nexus-cyan font-bold text-xl">→</div>

            <div className="text-center">
              <div className="text-xs font-heading uppercase text-nexus-cyan">Level</div>
              <div className="text-3xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-nexus-accent via-nexus-cyan to-white">
                {payload.newLevel}
              </div>
            </div>
          </div>

          {/* Unlocked Title Box */}
          <div className="p-4 rounded-btn bg-nexus-accent/10 border border-nexus-accent/30 space-y-1">
            <div className="text-xs font-heading uppercase text-nexus-muted">
              Current Title Unlocked
            </div>
            <div className="text-xl font-heading font-extrabold text-white flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-nexus-cyan" />
              {payload.newTitle}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading font-bold text-sm uppercase tracking-wider transition-all glow-accent cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            CONTINUE PLAYING
          </button>
        </div>
      </div>
    </div>
  );
};
