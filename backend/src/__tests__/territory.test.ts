import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Territory } from '../game/Territory.js';

describe('Territory Engine', () => {
  let game: Territory;

  beforeEach(() => {
    vi.useFakeTimers();
    game = new Territory('room_test');
    game.initialize([
      { id: 'user_1', username: 'PlayerOne' },
      { id: 'user_2', username: 'PlayerTwo' },
    ]);
  });

  it('initializes a 10x10 grid with player spawn positions claimed', () => {
    const state = game.getState();
    expect(state.gridWidth).toBe(10);
    expect(state.gridHeight).toBe(10);
    expect(state.cells).toHaveLength(100);

    const spawnCell1 = state.cells.find((c) => c.gridX === 0 && c.gridY === 0);
    expect(spawnCell1?.ownerId).toBe('user_1');
    expect(spawnCell1?.state).toBe('CONTROLLED');
  });

  it('moves player and updates cell capture progress on tick update', () => {
    vi.advanceTimersByTime(3000); // Wait 3s initial countdown -> PLAYING

    // Move Player 1 right from (0,0) to (1,0)
    game.handleInput('user_1', { up: false, down: false, left: false, right: true, sequence: 1 });

    // Tick update 1 second
    game.update(1.0);

    const state = game.getState();
    const targetCell = state.cells.find((c) => c.gridX === 1 && c.gridY === 0);
    expect(targetCell?.capturingPlayers).toContain('user_1');
    expect(targetCell?.captureProgress).toBeGreaterThan(0);
  });

  it('completes capture after 3 seconds of occupation', () => {
    vi.advanceTimersByTime(3000); // 3s countdown -> PLAYING

    game.handleInput('user_1', { up: false, down: false, left: false, right: true, sequence: 1 });

    // Tick update 3 seconds
    game.update(3.0);

    const state = game.getState();
    const targetCell = state.cells.find((c) => c.gridX === 1 && c.gridY === 0);
    expect(targetCell?.ownerId).toBe('user_1');
    expect(targetCell?.state).toBe('CONTROLLED');
  });

  it('marks cell as CONTESTED when opposing players occupy the same cell', () => {
    vi.advanceTimersByTime(3000); // 3s countdown -> PLAYING

    // Move both user_1 and user_2 to (1,0)
    const p1 = game.getState().players.find((p) => p.id === 'user_1')!;
    const p2 = game.getState().players.find((p) => p.id === 'user_2')!;

    p1.gridX = 1;
    p1.gridY = 0;
    p2.gridX = 1;
    p2.gridY = 0;

    game.update(0.5);

    const state = game.getState();
    const contestedCell = state.cells.find((c) => c.gridX === 1 && c.gridY === 0);
    expect(contestedCell?.state).toBe('CONTESTED');
  });

  it('generates match results with Territories metric', () => {
    const results = game.getResults();
    expect(results.gameType).toBe('Territory');
    expect(results.standings).toHaveLength(2);
    expect(results.standings[0]?.statLabel).toBe('Territories');
  });
});
