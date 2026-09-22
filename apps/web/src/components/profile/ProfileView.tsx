import React, { useEffect, useState } from 'react';
import { Trophy, Zap, Award, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface UserStatsData {
  gamesPlayed: number;
  wins: number;
  totalScore: number;
  xp: number;
  lifetimeXp?: number;
  level?: number;
  title?: string;
  mvpCount?: number;
  currentWinStreak?: number;
  bestWinStreak?: number;
}

interface MatchHistoryItem {
  id: string;
  matchId: string;
  score: number;
  rank: number;
  xpEarned: number;
  match: {
    gameType: string;
    endedAt: string;
  };
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export const ProfileView: React.FC = () => {
  const { user, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'achievements'>('overview');
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    fetch(`${SERVER_URL}/api/stats/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats || { gamesPlayed: 0, wins: 0, totalScore: 0, xp: 0 });
        setMatches(data.matches || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [token]);

  if (!user) return null;

  const level = stats?.level || 1;
  const title = stats?.title || 'Rookie';
  const lifetimeXp = stats?.lifetimeXp || stats?.xp || 0;
  const currentLevelXp = stats?.xp || 0;
  const nextLevelXp = 500 + (level - 1) * 250;
  const xpProgressPercent = Math.min(100, Math.floor((currentLevelXp / nextLevelXp) * 100));
  const xpToNextLevel = Math.max(0, nextLevelXp - currentLevelXp);
  const winRate = stats && stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) : '0.0';

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      {/* Profile Header Card */}
      <div className="rounded-card bg-nexus-surface border border-nexus-border p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="w-24 h-24 rounded-full bg-nexus-card border-4 border-nexus-accent flex items-center justify-center font-heading text-4xl text-white font-bold uppercase shadow-2xl glow-accent">
            {user.username.substring(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
              <h1 className="font-heading text-3xl font-extrabold text-white tracking-wider">
                {user.username}
              </h1>
              <span className="px-3 py-1 rounded-full bg-nexus-accent/20 border border-nexus-accent/40 text-nexus-accent font-mono text-xs uppercase font-extrabold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> LEVEL {level}
              </span>
              <span className="px-3 py-1 rounded-full bg-nexus-cyan/20 border border-nexus-cyan/40 text-nexus-cyan font-mono text-xs uppercase font-extrabold">
                {title}
              </span>
            </div>
            <p className="text-nexus-muted text-sm font-mono mt-1">{user.email}</p>
          </div>
        </div>

        {/* Stats Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto font-mono">
          <div className="bg-nexus-card p-3 rounded-btn border border-nexus-border text-center space-y-0.5">
            <div className="text-[10px] text-nexus-muted uppercase">LIFETIME XP</div>
            <div className="font-heading text-xl font-bold text-nexus-accent">
              {lifetimeXp.toLocaleString()}
            </div>
          </div>
          <div className="bg-nexus-card p-3 rounded-btn border border-nexus-border text-center space-y-0.5">
            <div className="text-[10px] text-nexus-muted uppercase">VICTORIES</div>
            <div className="font-heading text-xl font-bold text-nexus-success">
              {stats?.wins || 0}
            </div>
          </div>
          <div className="bg-nexus-card p-3 rounded-btn border border-nexus-border text-center space-y-0.5">
            <div className="text-[10px] text-nexus-muted uppercase">STREAK</div>
            <div className="font-heading text-xl font-bold text-amber-400">
              🔥 {stats?.currentWinStreak || 0}
            </div>
          </div>
          <div className="bg-nexus-card p-3 rounded-btn border border-nexus-border text-center space-y-0.5">
            <div className="text-[10px] text-nexus-muted uppercase">TOTAL GAMES</div>
            <div className="font-heading text-xl font-bold text-white">
              {stats?.gamesPlayed || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-nexus-border font-heading text-sm font-bold uppercase tracking-wider">
        {(['overview', 'matches', 'achievements'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab
                ? 'border-nexus-accent text-white'
                : 'border-transparent text-nexus-muted hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-nexus-muted flex flex-col items-center justify-center gap-3 font-mono text-sm">
          <Loader2 className="w-8 h-8 animate-spin text-nexus-accent" />
          <span>LOADING PROFILE STATS...</span>
        </div>
      ) : (
        <>
          {/* Tab Contents */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-nexus-surface border border-nexus-border rounded-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-5 h-5 text-nexus-accent" /> LEVEL {level} PROGRESSION
                  </h3>
                  <span className="text-xs font-mono font-bold text-nexus-cyan uppercase">
                    {title}
                  </span>
                </div>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between text-nexus-muted text-xs">
                    <span>{currentLevelXp} / {nextLevelXp} XP</span>
                    <span className="text-nexus-cyan font-bold">{xpToNextLevel} XP TO LEVEL {level + 1}</span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-nexus-card overflow-hidden border border-nexus-border">
                    <div
                      className="h-full bg-gradient-to-r from-nexus-accent via-nexus-cyan to-white transition-all duration-500"
                      style={{ width: `${xpProgressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-nexus-surface border border-nexus-border rounded-card p-6 space-y-4">
                <h3 className="font-heading font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" /> ARENA PERFORMANCE
                </h3>
                <div className="grid grid-cols-3 gap-3 font-mono text-sm">
                  <div className="p-3 bg-nexus-card rounded-btn border border-nexus-border text-center">
                    <div className="text-[10px] text-nexus-muted">WIN RATE</div>
                    <div className="text-base font-bold text-nexus-success">{winRate}%</div>
                  </div>
                  <div className="p-3 bg-nexus-card rounded-btn border border-nexus-border text-center">
                    <div className="text-[10px] text-nexus-muted">MVP FINISHES</div>
                    <div className="text-base font-bold text-amber-400">{stats?.mvpCount || 0}</div>
                  </div>
                  <div className="p-3 bg-nexus-card rounded-btn border border-nexus-border text-center">
                    <div className="text-[10px] text-nexus-muted">BEST STREAK</div>
                    <div className="text-base font-bold text-nexus-cyan">{stats?.bestWinStreak || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="bg-nexus-surface border border-nexus-border rounded-card p-6">
              {matches.length === 0 ? (
                <div className="text-center text-nexus-muted font-mono text-sm py-8">
                  No recent match history found. Join a room to play your first match!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-sm">
                    <thead>
                      <tr className="border-b border-nexus-border bg-nexus-card/50 text-xs text-nexus-muted uppercase">
                        <th className="py-3 px-4">GAME MODE</th>
                        <th className="py-3 px-4">RANK</th>
                        <th className="py-3 px-4">SCORE</th>
                        <th className="py-3 px-4">XP GAINED</th>
                        <th className="py-3 px-4 text-right">DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nexus-border/40">
                      {matches.map((m) => (
                        <tr key={m.id} className="hover:bg-nexus-card/30">
                          <td className="py-3.5 px-4 font-heading font-bold text-white">
                            {m.match.gameType}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                                m.rank === 1
                                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                                  : 'bg-nexus-card text-white'
                              }`}
                            >
                              #{m.rank}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-nexus-cyan font-bold">
                            {m.score.toLocaleString()} PTS
                          </td>
                          <td className="py-3.5 px-4 text-nexus-accent font-bold">
                            +{m.xpEarned} XP
                          </td>
                          <td className="py-3.5 px-4 text-right text-nexus-muted text-xs">
                            {new Date(m.match.endedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                className={`rounded-card p-6 space-y-3 bg-nexus-surface border ${
                  stats && stats.wins >= 1 ? 'border-nexus-accent glow-accent' : 'border-nexus-border opacity-50'
                }`}
              >
                <Award className="w-8 h-8 text-nexus-accent" />
                <div className="font-heading font-bold text-white uppercase">FIRST BLOOD</div>
                <div className="text-xs text-nexus-muted font-mono">
                  {stats && stats.wins >= 1 ? '✓ UNLOCKED — Win your first match.' : 'LOCKED — Win your first match.'}
                </div>
              </div>
              <div
                className={`rounded-card p-6 space-y-3 bg-nexus-surface border ${
                  stats && stats.totalScore >= 1000 ? 'border-nexus-cyan glow-cyan' : 'border-nexus-border opacity-50'
                }`}
              >
                <Award className="w-8 h-8 text-nexus-cyan" />
                <div className="font-heading font-bold text-white uppercase">SCORE MASTER</div>
                <div className="text-xs text-nexus-muted font-mono">
                  {stats && stats.totalScore >= 1000
                    ? '✓ UNLOCKED — Reach 1,000 total score points.'
                    : 'LOCKED — Reach 1,000 total score points.'}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
