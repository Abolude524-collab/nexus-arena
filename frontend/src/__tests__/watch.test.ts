import { describe, it, expect } from 'vitest';
import { GAME_ID_TO_TYPE, GAME_TYPE_IDS } from '../shared/index.js';
import { WATCH_GAME_FILTERS } from '../store/watchStore';
import { GAME_THEMES, getGameTheme } from '../components/watch/gameTheme';

describe('WATCH directory contract', () => {
  it('uses stable game identifiers that the server can resolve', () => {
    const filterIds = WATCH_GAME_FILTERS.filter((filter) => filter.id !== 'all')
      .map((filter) => filter.id)
      .sort();

    expect(filterIds).toEqual(Object.keys(GAME_ID_TO_TYPE).sort());

    for (const id of filterIds) {
      expect(GAME_ID_TO_TYPE[id]).toBeTypeOf('string');
      expect(GAME_TYPE_IDS[GAME_ID_TO_TYPE[id]]).toBe(id);
    }
  });

  it('provides a visual theme for every supported game type', () => {
    for (const gameType of Object.keys(GAME_TYPE_IDS)) {
      expect(GAME_THEMES[gameType]).toBeDefined();
      expect(getGameTheme(gameType).label).toBe(gameType);
    }
  });

  it('falls back safely for unknown game types', () => {
    expect(getGameTheme('Mystery Mode').label).toBe('Arena Match');
    expect(getGameTheme(undefined).label).toBe('Arena Match');
  });

  it('exposes the default spectator limit from the shared contract', () => {
    expect(WATCH_GAME_FILTERS[0].id).toBe('all');
    expect(WATCH_GAME_FILTERS).toHaveLength(5);
  });
});
