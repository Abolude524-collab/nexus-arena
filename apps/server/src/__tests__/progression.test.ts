import { describe, it, expect } from 'vitest';
import { getXpRequiredForLevel, calculateLevelInfo, getTitleForLevel } from '../utils/progression.js';
import { XPService } from '../services/xp.service.js';
import { PlayerResult } from '@nexus-arena/shared';

describe('Player Progression Utilities', () => {
  it('calculates level XP requirements according to spec formula', () => {
    // XP_TO_NEXT_LEVEL = 500 + ((currentLevel - 1) * 250)
    expect(getXpRequiredForLevel(1)).toBe(500);
    expect(getXpRequiredForLevel(2)).toBe(750);
    expect(getXpRequiredForLevel(3)).toBe(1000);
    expect(getXpRequiredForLevel(4)).toBe(1250);
    expect(getXpRequiredForLevel(10)).toBe(2750);
  });

  it('calculates level and progress XP accurately from lifetime XP', () => {
    // Level 1: 0 to 499 XP (needs 500)
    const lvl1 = calculateLevelInfo(300);
    expect(lvl1.level).toBe(1);
    expect(lvl1.currentLevelXp).toBe(300);
    expect(lvl1.nextLevelXp).toBe(500);

    // Level 2: 500 XP (500 needed for L1->L2, 0 left in L2, needs 750 for L2->L3)
    const lvl2 = calculateLevelInfo(500);
    expect(lvl2.level).toBe(2);
    expect(lvl2.currentLevelXp).toBe(0);
    expect(lvl2.nextLevelXp).toBe(750);

    // Level 3: 500 + 750 = 1250 XP
    const lvl3 = calculateLevelInfo(1500); // 1250 for L1 & L2, 250 in L3
    expect(lvl3.level).toBe(3);
    expect(lvl3.currentLevelXp).toBe(250);
    expect(lvl3.nextLevelXp).toBe(1000);
  });

  it('resolves correct title for levels based on threshold ladder', () => {
    expect(getTitleForLevel(1)).toBe('Rookie');
    expect(getTitleForLevel(4)).toBe('Rookie');
    expect(getTitleForLevel(5)).toBe('Challenger');
    expect(getTitleForLevel(10)).toBe('Contender');
    expect(getTitleForLevel(15)).toBe('Veteran');
    expect(getTitleForLevel(20)).toBe('Elite');
    expect(getTitleForLevel(30)).toBe('Champion');
    expect(getTitleForLevel(40)).toBe('Master');
    expect(getTitleForLevel(50)).toBe('Grandmaster');
    expect(getTitleForLevel(75)).toBe('Nexus Legend');
    expect(getTitleForLevel(100)).toBe('Nexus Ascendant');
  });

  it('supports custom title tables for future admin customization', () => {
    const custom = [
      { levelRequired: 1, title: 'Novice' },
      { levelRequired: 10, title: 'Warlord' },
    ];
    expect(getTitleForLevel(1, custom)).toBe('Novice');
    expect(getTitleForLevel(12, custom)).toBe('Warlord');
  });
});

describe('XP Calculation Service', () => {
  const dummyPlayer: PlayerResult = {
    userId: 'user-1',
    username: 'TestPlayer',
    rank: 1,
    score: 500,
    xpEarned: 0,
  };

  it('awards base completion (+50), 1st placement (+100), performance, and daily bonus (+50)', () => {
    const xp = XPService.calculateXP(dummyPlayer, 'Reaction Rush', true);
    expect(xp.completion).toBe(50);
    expect(xp.placement).toBe(100);
    expect(xp.dailyBonus).toBe(50);
    // Performance cap is 50
    expect(xp.performance).toBeLessThanOrEqual(50);
    expect(xp.total).toBe(xp.completion + xp.placement + xp.performance + xp.dailyBonus);
  });

  it('awards correct placement XP for 2nd (+75) and 3rd (+50)', () => {
    const p2 = { ...dummyPlayer, rank: 2 };
    const xp2 = XPService.calculateXP(p2, 'Territory', false);
    expect(xp2.placement).toBe(75);
    expect(xp2.dailyBonus).toBe(0);

    const p3 = { ...dummyPlayer, rank: 3 };
    const xp3 = XPService.calculateXP(p3, 'Word Blitz', false);
    expect(xp3.placement).toBe(50);
  });

  it('correctly detects different UTC calendar days for daily first match bonus', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(XPService.isDifferentDay(yesterday, new Date())).toBe(true);

    const today = new Date();
    expect(XPService.isDifferentDay(today, today)).toBe(false);
  });
});
