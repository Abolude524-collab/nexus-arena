import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';

const router = Router();

router.get('/', async (req, res: Response) => {
  try {
    const gameTypeFilter = req.query['gameType'] as string | undefined;

    if (gameTypeFilter && gameTypeFilter === 'XP') {
      // Query GLOBAL XP leaderboard ordered by lifetimeXp (excluding ADMIN role)
      const xpStats = await prisma.playerStats.findMany({
        where: {
          user: {
            role: { not: 'ADMIN' },
          },
        },
        include: {
          user: {
            select: { id: true, username: true, avatar: true, role: true },
          },
        },
        orderBy: { lifetimeXp: 'desc' },
        take: 50,
      });

      const leaderboard = xpStats.map((item, idx) => ({
        rank: idx + 1,
        userId: item.userId,
        username: item.user.username,
        avatar: item.user.avatar,
        wins: item.wins,
        totalScore: item.totalScore,
        gamesPlayed: item.gamesPlayed,
        xp: item.lifetimeXp,
        lifetimeXp: item.lifetimeXp,
        level: item.level,
        title: item.title,
      }));

      res.status(200).json({ leaderboard });
      return;
    }

    if (gameTypeFilter && gameTypeFilter !== 'ALL') {
      // Query per-game rankings from MatchParticipant & Match (excluding ADMIN role)
      const participants = await prisma.matchParticipant.findMany({
        where: {
          match: {
            gameType: gameTypeFilter,
          },
          user: {
            role: { not: 'ADMIN' },
          },
        },
        include: {
          user: { select: { id: true, username: true, avatar: true, role: true } },
          match: { select: { winnerId: true } },
        },
      });

      const userAggregates: Map<
        string,
        { userId: string; username: string; avatar: string; wins: number; totalScore: number; gamesPlayed: number; xp: number }
      > = new Map();

      for (const p of participants) {
        let existing = userAggregates.get(p.userId);
        if (!existing) {
          existing = {
            userId: p.userId,
            username: p.user.username,
            avatar: p.user.avatar,
            wins: 0,
            totalScore: 0,
            gamesPlayed: 0,
            xp: 0,
          };
          userAggregates.set(p.userId, existing);
        }

        existing.gamesPlayed += 1;
        existing.totalScore += p.score;
        existing.xp += p.xpEarned;
        if (p.match.winnerId === p.userId) {
          existing.wins += 1;
        }
      }

      const sorted = Array.from(userAggregates.values()).sort((a, b) => b.totalScore - a.totalScore);
      const leaderboard = sorted.slice(0, 50).map((item, idx) => ({
        rank: idx + 1,
        ...item,
      }));

      res.status(200).json({ leaderboard });
      return;
    }

    // Default overall leaderboard from PlayerStats (excluding ADMIN role)
    const stats = await prisma.playerStats.findMany({
      where: {
        user: {
          role: { not: 'ADMIN' },
        },
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true, role: true },
        },
      },
      orderBy: { totalScore: 'desc' },
      take: 50,
    });

    const leaderboard = stats.map((item, idx) => ({
      rank: idx + 1,
      userId: item.userId,
      username: item.user.username,
      avatar: item.user.avatar,
      wins: item.wins,
      totalScore: item.totalScore,
      gamesPlayed: item.gamesPlayed,
      xp: item.lifetimeXp,
      lifetimeXp: item.lifetimeXp,
      level: item.level,
      title: item.title,
    }));

    res.status(200).json({ leaderboard });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch leaderboard' });
  }
});

export default router;
