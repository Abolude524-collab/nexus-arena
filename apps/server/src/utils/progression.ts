export interface TitleDefinition {
  levelRequired: number;
  title: string;
}

export const DEFAULT_TITLES: TitleDefinition[] = [
  { levelRequired: 1, title: 'Rookie' },
  { levelRequired: 5, title: 'Challenger' },
  { levelRequired: 10, title: 'Contender' },
  { levelRequired: 15, title: 'Veteran' },
  { levelRequired: 20, title: 'Elite' },
  { levelRequired: 30, title: 'Champion' },
  { levelRequired: 40, title: 'Master' },
  { levelRequired: 50, title: 'Grandmaster' },
  { levelRequired: 75, title: 'Nexus Legend' },
  { levelRequired: 100, title: 'Nexus Ascendant' },
];

/**
 * Calculates XP required to advance from `currentLevel` to `currentLevel + 1`.
 * Spec: XP_TO_NEXT_LEVEL = 500 + ((currentLevel - 1) * 250)
 */
export function getXpRequiredForLevel(currentLevel: number): number {
  return 500 + (Math.max(1, currentLevel) - 1) * 250;
}

/**
 * Given a total lifetime XP, calculates the current level and leftover XP in that level.
 */
export function calculateLevelInfo(lifetimeXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
} {
  let level = 1;
  let remainingXp = Math.max(0, lifetimeXp);
  let needed = getXpRequiredForLevel(level);

  while (remainingXp >= needed) {
    remainingXp -= needed;
    level++;
    needed = getXpRequiredForLevel(level);
  }

  return {
    level,
    currentLevelXp: remainingXp,
    nextLevelXp: needed,
  };
}

/**
 * Returns title corresponding to current level.
 * Accepts optional title table to support dynamic admin title definitions in the future.
 */
export function getTitleForLevel(
  level: number,
  customTitles: TitleDefinition[] = DEFAULT_TITLES
): string {
  const sorted = [...customTitles].sort((a, b) => b.levelRequired - a.levelRequired);
  for (const t of sorted) {
    if (level >= t.levelRequired) {
      return t.title;
    }
  }
  return 'Rookie';
}
