import { PlayerResult } from '../shared/index.js';

export interface CalculatedXP {
  completion: number;
  placement: number;
  performance: number;
  dailyBonus: number;
  total: number;
}

export class XPService {
  /**
   * Calculates XP breakdown for a player's match performance.
   */
  static calculateXP(
    participant: PlayerResult,
    gameType: string,
    isFirstMatchOfDay: boolean
  ): CalculatedXP {
    // 1. Base Match Completion
    const completion = 50;

    // 2. Placement Bonus
    let placement = 0;
    if (participant.rank === 1) {
      placement = 100;
    } else if (participant.rank === 2) {
      placement = 75;
    } else if (participant.rank === 3) {
      placement = 50;
    }

    // 3. Performance Bonus (Capped at 50 XP max)
    let performance = 0;
    const score = Math.max(0, participant.score);

    switch (gameType) {
      case 'Reaction Rush':
        performance = Math.min(50, Math.floor(score / 15));
        break;
      case 'Territory':
        performance = Math.min(50, Math.floor(score / 10));
        break;
      case 'Word Blitz':
        performance = Math.min(50, Math.floor(score / 10));
        break;
      case 'Neon Dash':
      default:
        performance = Math.min(50, Math.floor(score / 50));
        break;
    }

    // 4. Daily First Match Bonus
    const dailyBonus = isFirstMatchOfDay ? 50 : 0;

    const total = completion + placement + performance + dailyBonus;

    return {
      completion,
      placement,
      performance,
      dailyBonus,
      total,
    };
  }

  /**
   * Helper to check if a timestamp is on a different calendar day (UTC) than today.
   */
  static isDifferentDay(lastMatchDate: Date | null | undefined, now: Date = new Date()): boolean {
    if (!lastMatchDate) return true;
    return (
      lastMatchDate.getUTCFullYear() !== now.getUTCFullYear() ||
      lastMatchDate.getUTCMonth() !== now.getUTCMonth() ||
      lastMatchDate.getUTCDate() !== now.getUTCDate()
    );
  }
}
