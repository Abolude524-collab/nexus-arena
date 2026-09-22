import React, { useEffect, useState } from 'react';
import { Trophy, Crown, Loader2 } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  wins: number;
  totalScore: number;
  gamesPlayed: number;
  xp: number;
  lifetimeXp?: number;
  level?: number;
  title?: string;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export const LeaderboardView: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedGameType, setSelectedGameType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const url =
      selectedGameType === 'ALL'
        ? `${SERVER_URL}/api/leaderboard`
        : `${SERVER_URL}/api/leaderboard?gameType=${encodeURIComponent(selectedGameType)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setLeaderboard(data.leaderboard || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [selectedGameType]);

  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  const filterTabs = [
    { id: 'ALL', label: 'ALL GAMES' },
    { id: 'XP', label: 'GLOBAL XP' },
    { id: 'Neon Dash', label: 'NEON DASH' },
    { id: 'Reaction Rush', label: 'REACTION RUSH' },
    { id: 'Territory', label: 'TERRITORY' },
    { id: 'Word Blitz', label: 'WORD BLITZ' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10 animate-fade-in">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nexus-accent/20 border border-nexus-accent/40 text-nexus-accent font-mono text-xs uppercase">
          <Trophy className="w-4 h-4 text-amber-400" /> GLOBAL RANKINGS
        </div>
        <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-white tracking-wider">
          HALL OF CHAMPIONS
        </h1>
        <p className="text-nexus-muted text-sm max-w-md mx-auto">
          Real live player rankings calculated from persistent arena score & level progression data.
        </p>

        {/* Game Mode Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedGameType(tab.id)}
              className={`px-4 py-2 rounded-btn font-heading text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedGameType === tab.id
                  ? 'bg-nexus-accent text-white border border-nexus-accent glow-accent'
                  : 'bg-nexus-surface hover:bg-nexus-card border border-nexus-border text-nexus-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-nexus-muted flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-nexus-cyan" />
          <span className="font-mono text-sm uppercase">LOADING DATABASE RANKINGS...</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="p-12 rounded-card bg-nexus-surface border border-nexus-border text-center text-nexus-muted font-mono text-sm">
          No matches played yet. Be the first player to win a match and claim #1 on the leaderboard!
        </div>
      ) : (
        <>
          {/* Top 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="rounded-card bg-nexus-surface border border-nexus-cyan/40 p-6 text-center space-y-4 shadow-xl order-2 md:order-1">
                <div className="w-12 h-12 mx-auto rounded-full bg-nexus-cyan/20 border border-nexus-cyan text-nexus-cyan flex items-center justify-center font-heading font-bold text-lg">
                  #2
                </div>
                <div className="w-20 h-20 mx-auto rounded-full bg-nexus-card border-2 border-nexus-cyan flex items-center justify-center font-heading text-3xl text-white font-bold uppercase shadow-inner">
                  {topThree[1].username.substring(0, 2)}
                </div>
                <div>
                  <div className="font-heading font-bold text-xl text-white">{topThree[1].username}</div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xs font-mono text-nexus-cyan font-bold">LVL {topThree[1].level || 1}</span>
                    <span className="text-xs font-mono text-nexus-muted">• {topThree[1].title || 'Rookie'}</span>
                  </div>
                </div>
                <div className="p-3 rounded-btn bg-nexus-card border border-nexus-border font-mono text-sm text-white font-bold">
                  {selectedGameType === 'XP' ? `${(topThree[1].lifetimeXp || topThree[1].xp).toLocaleString()} XP` : `${topThree[1].totalScore.toLocaleString()} PTS`}
                </div>
              </div>
            )}

            {/* Rank 1 (Gold Showcase) */}
            {topThree[0] && (
              <div className="rounded-card bg-nexus-surface border-2 border-amber-400 p-8 text-center space-y-4 shadow-2xl glow-accent order-1 md:order-2">
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-400/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center">
                  <Crown className="w-8 h-8" />
                </div>
                <div className="w-24 h-24 mx-auto rounded-full bg-nexus-card border-4 border-amber-400 flex items-center justify-center font-heading text-4xl text-white font-bold uppercase shadow-2xl">
                  {topThree[0].username.substring(0, 2)}
                </div>
                <div>
                  <div className="font-heading font-extrabold text-2xl text-white">{topThree[0].username}</div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xs font-mono text-amber-400 font-bold">LVL {topThree[0].level || 1}</span>
                    <span className="text-xs font-mono text-nexus-cyan font-bold">• {topThree[0].title || 'Rookie'}</span>
                  </div>
                </div>
                <div className="p-4 rounded-btn bg-amber-400/10 border border-amber-400/50 font-mono text-lg text-amber-400 font-extrabold">
                  {selectedGameType === 'XP' ? `${(topThree[0].lifetimeXp || topThree[0].xp).toLocaleString()} XP` : `${topThree[0].totalScore.toLocaleString()} PTS`}
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="rounded-card bg-nexus-surface border border-nexus-accent/40 p-6 text-center space-y-4 shadow-xl order-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-nexus-accent/20 border border-nexus-accent text-nexus-accent flex items-center justify-center font-heading font-bold text-lg">
                  #3
                </div>
                <div className="w-20 h-20 mx-auto rounded-full bg-nexus-card border-2 border-nexus-accent flex items-center justify-center font-heading text-3xl text-white font-bold uppercase shadow-inner">
                  {topThree[2].username.substring(0, 2)}
                </div>
                <div>
                  <div className="font-heading font-bold text-xl text-white">{topThree[2].username}</div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xs font-mono text-nexus-accent font-bold">LVL {topThree[2].level || 1}</span>
                    <span className="text-xs font-mono text-nexus-muted">• {topThree[2].title || 'Rookie'}</span>
                  </div>
                </div>
                <div className="p-3 rounded-btn bg-nexus-card border border-nexus-border font-mono text-sm text-white font-bold">
                  {selectedGameType === 'XP' ? `${(topThree[2].lifetimeXp || topThree[2].xp).toLocaleString()} XP` : `${topThree[2].totalScore.toLocaleString()} PTS`}
                </div>
              </div>
            )}
          </div>

          {/* Remaining Ranks Table */}
          {remaining.length > 0 && (
            <div className="rounded-card bg-nexus-surface border border-nexus-border overflow-hidden">
              <table className="w-full text-left border-collapse font-mono text-sm">
                <thead>
                  <tr className="border-b border-nexus-border bg-nexus-card/50 font-heading text-xs uppercase tracking-wider text-nexus-muted">
                    <th className="py-4 px-6">RANK</th>
                    <th className="py-4 px-6">PLAYER</th>
                    <th className="py-4 px-6">LEVEL & TITLE</th>
                    <th className="py-4 px-6">GAMES PLAYED</th>
                    <th className="py-4 px-6 text-right">{selectedGameType === 'XP' ? 'LIFETIME XP' : 'TOTAL SCORE'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexus-border/40">
                  {remaining.map((entry) => (
                    <tr key={entry.userId} className="hover:bg-nexus-card/40 transition-colors">
                      <td className="py-4 px-6 font-bold text-nexus-muted">#{entry.rank}</td>
                      <td className="py-4 px-6 font-heading font-bold text-white">{entry.username}</td>
                      <td className="py-4 px-6">
                        <span className="text-nexus-cyan font-bold">LVL {entry.level || 1}</span>
                        <span className="text-nexus-muted text-xs ml-2">({entry.title || 'Rookie'})</span>
                      </td>
                      <td className="py-4 px-6 text-nexus-muted">{entry.gamesPlayed}</td>
                      <td className="py-4 px-6 text-right text-nexus-accent font-bold">
                        {selectedGameType === 'XP' ? `${(entry.lifetimeXp || entry.xp).toLocaleString()} XP` : entry.totalScore.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
