import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReactionRush } from '../game/ReactionRush.js';

describe('ReactionRush Engine', () => {
  let game: ReactionRush;

  beforeEach(() => {
    vi.useFakeTimers();
    game = new ReactionRush('room_test');
    game.initialize([
      { id: 'user_1', username: 'PlayerOne' },
      { id: 'user_2', username: 'PlayerTwo' },
    ]);
  });

  it('initializes in COUNTDOWN state', () => {
    const state = game.getState();
    expect(state.status).toBe('COUNTDOWN');
    expect(state.players).toHaveLength(2);
  });

  it('transitions to ARMED and TARGET_ACTIVE after timers fire', () => {
    vi.advanceTimersByTime(3000); // Wait 3s initial countdown
    let state = game.getState();
    expect(state.status).toBe('ARMED');
    expect(state.currentRound).toBe(1);

    vi.advanceTimersByTime(4000); // Advance timer past random delay
    state = game.getState();
    expect(state.status).toBe('TARGET_ACTIVE');
    expect(state.target).not.toBeNull();
  });

  it('calculates score and awards first click bonus on target click', () => {
    vi.advanceTimersByTime(3000); // 3s countdown
    while (game.getState().status === 'ARMED') {
      vi.advanceTimersByTime(50);
    }

    const state = game.getState();
    expect(state.status).toBe('TARGET_ACTIVE');
    const target = state.target!;

    vi.advanceTimersByTime(200); // 200ms reaction time

    game.handleClick('user_1', 1, target.id);

    const updatedState = game.getState();
    expect(updatedState.status).toBe('ROUND_RESULT');
    expect(updatedState.roundWinnerId).toBe('user_1');

    const p1 = updatedState.players.find((p) => p.id === 'user_1');
    // 200ms reaction = 80 pts + 50 first click bonus = 130 pts
    expect(p1?.score).toBe(130);
  });

  it('generates match results with Avg Reaction metric upon completion', () => {
    const results = game.getResults();
    expect(results.gameType).toBe('Reaction Rush');
    expect(results.standings).toHaveLength(2);
    expect(results.standings[0]?.statLabel).toBe('Avg Reaction');
  });
});
