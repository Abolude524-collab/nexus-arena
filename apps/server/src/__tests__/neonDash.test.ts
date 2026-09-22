import { describe, it, expect } from 'vitest';
import { NeonDash } from '../game/NeonDash.js';

describe('NeonDash Game Engine', () => {
  it('initializes players and collectibles correctly', () => {
    const game = new NeonDash('room_1');
    game.initialize([
      { id: 'u1', username: 'PlayerOne' },
      { id: 'u2', username: 'PlayerTwo' },
    ]);

    const state = game.getState();
    expect(state.players.length).toBe(2);
    expect(state.collectibles.length).toBeGreaterThan(0);
    expect(state.status).toBe('COUNTDOWN');
  });

  it('updates physics position on player input', () => {
    const game = new NeonDash('room_1');
    game.initialize([{ id: 'u1', username: 'PlayerOne' }]);

    // Fast-forward past countdown
    game.update(3.1);

    const initialPos = game.getState().players[0]?.x || 0;

    game.handleInput('u1', { up: false, down: false, left: false, right: true, sequence: 1 });
    game.update(0.5); // 0.5s movement right

    const newPos = game.getState().players[0]?.x || 0;
    expect(newPos).toBeGreaterThan(initialPos);
  });

  it('calculates standings and results on match end', () => {
    const game = new NeonDash('room_1');
    game.initialize([
      { id: 'u1', username: 'PlayerOne' },
      { id: 'u2', username: 'PlayerTwo' },
    ]);

    // Fast-forward past countdown and game duration
    game.update(3.5);
    game.update(185);

    expect(game.isFinished()).toBe(true);

    const results = game.getResults();
    expect(results.standings.length).toBe(2);
    expect(results.standings[0]?.rank).toBe(1);
    expect(results.standings[0]?.xpEarned).toBeGreaterThan(0);
  });
});
