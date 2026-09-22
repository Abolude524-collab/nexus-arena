import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WordBlitz } from '../game/WordBlitz.js';

describe('WordBlitz Engine', () => {
  let game: WordBlitz;

  beforeEach(() => {
    vi.useFakeTimers();
    game = new WordBlitz('room_test');
    game.initialize([
      { id: 'user_1', username: 'PlayerOne' },
      { id: 'user_2', username: 'PlayerTwo' },
    ]);
  });

  it('initializes in COUNTDOWN state and starts round 1', () => {
    let state = game.getState();
    expect(state.status).toBe('COUNTDOWN');

    vi.advanceTimersByTime(3000); // 3s initial countdown

    state = game.getState();
    expect(state.status).toBe('ROUND_ACTIVE');
    expect(state.currentRound).toBe(1);
    expect(state.challenge).not.toBeNull();
  });

  it('validates normalized answer and calculates score with first correct bonus', () => {
    vi.advanceTimersByTime(3000); // Start round 1

    const state = game.getState();
    const prompt = state.challenge!.prompt;

    vi.advanceTimersByTime(500); // 500ms reaction time

    // Submit with extra whitespace and mixed casing
    const submission = game.handleSubmit('user_1', 1, `  ${prompt.toLowerCase()}  `);
    expect(submission).not.toBeNull();
    expect(submission?.isCorrect).toBe(true);

    const player1 = game.getState().players.find((p) => p.id === 'user_1');
    // 500ms (<1s): 100 base + 100 speed bonus + 50 first correct = 250 pts
    expect(player1?.score).toBe(250);
  });

  it('rejects duplicate submission from the same player in a round', () => {
    vi.advanceTimersByTime(3000);
    const prompt = game.getState().challenge!.prompt;

    const first = game.handleSubmit('user_1', 1, prompt);
    expect(first).not.toBeNull();

    const second = game.handleSubmit('user_1', 1, prompt);
    expect(second).toBeNull();
  });

  it('generates match results with Words Correct metric', () => {
    const results = game.getResults();
    expect(results.gameType).toBe('Word Blitz');
    expect(results.standings).toHaveLength(2);
    expect(results.standings[0]?.statLabel).toBe('Words Correct');
  });
});
