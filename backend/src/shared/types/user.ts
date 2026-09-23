export interface UserDTO {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStatsDTO {
  userId: string;
  gamesPlayed: number;
  wins: number;
  totalScore: number;
  xp: number;
  lifetimeXp?: number;
  level?: number;
  title?: string;
  totalMatches?: number;
  totalWins?: number;
  mvpCount?: number;
  currentWinStreak?: number;
  bestWinStreak?: number;
  ranking?: number;
}

export interface XPBreakdownDTO {
  completion: number;
  placement: number;
  performance: number;
  dailyBonus: number;
}

export interface ProgressionPayload {
  userId: string;
  xpEarned: number;
  totalXp: number;
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  breakdown: XPBreakdownDTO;
  levelUp: boolean;
  previousLevel?: number;
  newLevel?: number;
  newTitle?: string;
}

export interface LevelUpPayload {
  userId: string;
  previousLevel: number;
  newLevel: number;
  newTitle: string;
  unlockedAt: string;
}

export interface XPTransactionDTO {
  id: string;
  userId: string;
  amount: number;
  source: 'MATCH_COMPLETION' | 'PLACEMENT' | 'PERFORMANCE' | 'DAILY_BONUS';
  gameType: string;
  matchId: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
}

