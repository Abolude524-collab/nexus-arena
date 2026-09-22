import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticateHttp, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/me', authenticateHttp, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stats = await prisma.playerStats.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatar: true },
        },
      },
    });

    const matches = await prisma.matchParticipant.findMany({
      where: { userId: req.user.userId },
      include: {
        match: true,
      },
      orderBy: { match: { endedAt: 'desc' } },
      take: 20,
    });

    res.status(200).json({
      stats: stats || {
        userId: req.user.userId,
        gamesPlayed: 0,
        wins: 0,
        totalScore: 0,
        xp: 0,
      },
      matches,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user stats' });
  }
});

export default router;
