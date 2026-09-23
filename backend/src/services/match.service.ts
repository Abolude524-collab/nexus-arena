import { prisma } from '../db/prisma.js';
import { MatchResult, ProgressionPayload, LevelUpPayload } from '../shared/index.js';
import { XPService } from './xp.service.js';
import { calculateLevelInfo, getTitleForLevel } from '../utils/progression.js';
import { getIoInstance } from '../sockets/socketServer.js';

export class MatchService {
  static async persistMatchResult(results: MatchResult): Promise<void> {
    try {
      // Anti-abuse deduplication check: Ensure match hasn't already been processed
      const existingMatch = await prisma.match.findUnique({
        where: { id: results.matchId },
      });
      if (existingMatch) {
        console.log(`[MatchService] Match ${results.matchId} already processed. Skipping duplicate XP.`);
        return;
      }

      await prisma.$transaction(
        async (tx) => {
          // 1. Create Match record
          const match = await tx.match.create({
            data: {
              id: results.matchId,
              roomId: results.roomId,
              gameType: results.gameType,
              startedAt: new Date(results.startedAt),
              endedAt: new Date(results.endedAt),
              winnerId: results.winnerId,
            },
          });

          const io = getIoInstance();

          // 2. Process each participant for MatchParticipant, XPTransactions, and PlayerStats update
          for (const p of results.standings) {
            const userObj = await tx.user.findUnique({
              where: { id: p.userId },
              include: { stats: true },
            });

            if (!userObj) continue;

            // 2a. Create MatchParticipant record
            await tx.matchParticipant.create({
              data: {
                matchId: match.id,
                userId: p.userId,
                score: p.score,
                rank: p.rank,
                xpEarned: 0,
              },
            });

            // 2b. Calculate XP Breakdown
            const isDailyMatch = XPService.isDifferentDay(userObj.stats?.lastDailyMatchAt);
            const xpCalc = XPService.calculateXP(p, results.gameType, isDailyMatch);

            // Update MatchParticipant with calculated XP
            await tx.matchParticipant.updateMany({
              where: { matchId: match.id, userId: p.userId },
              data: { xpEarned: xpCalc.total },
            });

            // 2c. Create XP Audit Transactions in a single batch
            const xpRecords: Array<{
              userId: string;
              amount: number;
              source: 'MATCH_COMPLETION' | 'PLACEMENT' | 'PERFORMANCE' | 'DAILY_BONUS';
              gameType: string;
              matchId: string;
            }> = [];

            if (xpCalc.completion > 0) {
              xpRecords.push({
                userId: p.userId,
                amount: xpCalc.completion,
                source: 'MATCH_COMPLETION',
                gameType: results.gameType,
                matchId: match.id,
              });
            }
            if (xpCalc.placement > 0) {
              xpRecords.push({
                userId: p.userId,
                amount: xpCalc.placement,
                source: 'PLACEMENT',
                gameType: results.gameType,
                matchId: match.id,
              });
            }
            if (xpCalc.performance > 0) {
              xpRecords.push({
                userId: p.userId,
                amount: xpCalc.performance,
                source: 'PERFORMANCE',
                gameType: results.gameType,
                matchId: match.id,
              });
            }
            if (xpCalc.dailyBonus > 0) {
              xpRecords.push({
                userId: p.userId,
                amount: xpCalc.dailyBonus,
                source: 'DAILY_BONUS',
                gameType: results.gameType,
                matchId: match.id,
              });
            }

            if (xpRecords.length > 0) {
              await tx.xPTransaction.createMany({
                data: xpRecords,
              });
            }

          // 2d. Calculate Level Progression & Stats
          const currentStats = userObj.stats || {
            gamesPlayed: 0,
            wins: 0,
            mvpCount: 0,
            currentWinStreak: 0,
            bestWinStreak: 0,
            totalScore: 0,
            lifetimeXp: 0,
            level: 1,
            title: 'Rookie',
          };

          const newLifetimeXp = (currentStats.lifetimeXp || 0) + xpCalc.total;
          const levelInfo = calculateLevelInfo(newLifetimeXp);
          const newLevel = levelInfo.level;
          const prevLevel = currentStats.level || 1;
          const isLevelUp = newLevel > prevLevel;
          const newTitle = getTitleForLevel(newLevel);

          const isWin = p.rank === 1;
          const newWinStreak = isWin ? (currentStats.currentWinStreak || 0) + 1 : 0;
          const newBestStreak = Math.max(currentStats.bestWinStreak || 0, newWinStreak);
          const newMvpCount = (currentStats.mvpCount || 0) + (isWin ? 1 : 0);

          // Update PlayerStats in DB
          await tx.playerStats.upsert({
            where: { userId: p.userId },
            update: {
              gamesPlayed: { increment: 1 },
              wins: { increment: isWin ? 1 : 0 },
              totalScore: { increment: p.score },
              xp: levelInfo.currentLevelXp,
              lifetimeXp: newLifetimeXp,
              level: newLevel,
              title: newTitle,
              mvpCount: newMvpCount,
              currentWinStreak: newWinStreak,
              bestWinStreak: newBestStreak,
              lastDailyMatchAt: new Date(),
            },
            create: {
              userId: p.userId,
              gamesPlayed: 1,
              wins: isWin ? 1 : 0,
              totalScore: p.score,
              xp: levelInfo.currentLevelXp,
              lifetimeXp: newLifetimeXp,
              level: newLevel,
              title: newTitle,
              mvpCount: isWin ? 1 : 0,
              currentWinStreak: isWin ? 1 : 0,
              bestWinStreak: isWin ? 1 : 0,
              lastDailyMatchAt: new Date(),
            },
          });

          // 2e. Emit Socket Progression Events
          if (io) {
            const xpPayload: ProgressionPayload = {
              userId: p.userId,
              xpEarned: xpCalc.total,
              totalXp: newLifetimeXp,
              level: newLevel,
              title: newTitle,
              currentLevelXp: levelInfo.currentLevelXp,
              nextLevelXp: levelInfo.nextLevelXp,
              breakdown: {
                completion: xpCalc.completion,
                placement: xpCalc.placement,
                performance: xpCalc.performance,
                dailyBonus: xpCalc.dailyBonus,
              },
              levelUp: isLevelUp,
              previousLevel: prevLevel,
              newLevel: newLevel,
              newTitle: newTitle,
            };

            io.to(`user:${p.userId}`).emit('progression:xp-earned', xpPayload);

            if (isLevelUp) {
              const levelUpPayload: LevelUpPayload = {
                userId: p.userId,
                previousLevel: prevLevel,
                newLevel: newLevel,
                newTitle: newTitle,
                unlockedAt: new Date().toISOString(),
              };
              io.to(`user:${p.userId}`).emit('progression:level-up', levelUpPayload);
            }
          }
        }
      },
      { maxWait: 10000, timeout: 20000 }
    );
      console.log(`[MatchService] Successfully persisted match ${results.matchId} with progression.`);
    } catch (err) {
      console.error(`[MatchService] Failed to persist match ${results.matchId}:`, err);
    }
  }
}
