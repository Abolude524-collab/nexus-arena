import React from 'react';
import { Trophy, Zap, LogOut } from 'lucide-react';
import { MatchResult } from '../../shared/index.js';
import { useAuthStore } from '../../store/authStore';

interface MatchResultsModalProps {
  results: MatchResult;
  onExit: () => void;
}

export const MatchResultsModal: React.FC<MatchResultsModalProps> = ({ results, onExit }) => {
  const { user } = useAuthStore();
  const myStanding = results.standings.find((s) => s.userId === user?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-nexus-surface border-2 border-nexus-accent rounded-modal p-8 shadow-2xl space-y-8 text-center glow-accent">
        {/* Header Badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nexus-accent/20 border border-nexus-accent/40 text-nexus-accent font-mono text-xs uppercase font-bold">
            <Trophy className="w-4 h-4 text-amber-400" /> MATCH COMPLETED
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-white tracking-wider">
            {myStanding?.rank === 1 ? 'VICTORY!' : 'GAME OVER'}
          </h1>
        </div>

        {/* My Standing Chips */}
        {myStanding && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-nexus-card p-4 rounded-btn border border-nexus-border">
              <div className="font-mono text-xs text-nexus-muted">YOUR RANK</div>
              <div className="font-heading text-3xl font-extrabold text-nexus-cyan">
                #{myStanding.rank}
              </div>
            </div>
            <div className="bg-nexus-card p-4 rounded-btn border border-nexus-border">
              <div className="font-mono text-xs text-nexus-muted">FINAL SCORE</div>
              <div className="font-heading text-3xl font-extrabold text-white">
                {myStanding.score.toLocaleString()}
              </div>
            </div>
            <div className="bg-nexus-card p-4 rounded-btn border border-nexus-border">
              <div className="font-mono text-xs text-nexus-muted">XP GAINED</div>
              <div className="font-heading text-3xl font-extrabold text-nexus-accent flex items-center justify-center gap-1">
                <Zap className="w-5 h-5 fill-current" /> +{myStanding.xpEarned}
              </div>
            </div>
          </div>
        )}

        {/* Standings Table */}
        <div className="space-y-3 text-left">
          <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-nexus-muted">
            FINAL STANDINGS
          </h3>
          <div className="rounded-btn bg-nexus-card border border-nexus-border overflow-hidden">
            <table className="w-full text-left font-mono text-sm">
              <tbody className="divide-y divide-nexus-border/50">
                {results.standings.map((s) => (
                  <tr
                    key={s.userId}
                    className={`px-4 py-3 ${
                      s.userId === user?.id ? 'bg-nexus-accent/20 font-bold' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-nexus-muted">#{s.rank}</td>
                    <td className="py-3 px-4 font-heading font-bold text-white">
                      {s.username} {s.userId === user?.id ? '(YOU)' : ''}
                    </td>
                    {s.statValue && (
                      <td className="py-3 px-4 text-nexus-muted text-xs">
                        {s.statValue}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right text-nexus-cyan font-bold">
                      {s.score.toLocaleString()} PTS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={onExit}
            className="px-8 py-3.5 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading font-bold text-sm uppercase tracking-wider transition-all glow-accent flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> EXIT TO LOBBY
          </button>
        </div>
      </div>
    </div>
  );
};
