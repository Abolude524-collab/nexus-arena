import { GameMode, GamePlayerInit } from './GameMode.js';
import {
  WordBlitzGameState,
  WordChallenge,
  WordBlitzPlayerSubmission,
  MatchResult,
  PlayerResult,
  PlayerInput,
} from '../shared/index.js';

const TOTAL_ROUNDS = 10;
const ROUND_DURATION_MS = 10000;
const INTERMISSION_MS = 2000;

// Curated pool of gaming, tech, and arena word challenges
const CHALLENGE_POOL: WordChallenge[] = [
  { id: 'wb_1', prompt: 'NEON', difficulty: 'EASY' },
  { id: 'wb_2', prompt: 'ARENA', difficulty: 'EASY' },
  { id: 'wb_3', prompt: 'MULTIPLAYER', difficulty: 'MEDIUM' },
  { id: 'wb_4', prompt: 'SYNCHRONIZED', difficulty: 'MEDIUM' },
  { id: 'wb_5', prompt: 'AUTHORITATIVE', difficulty: 'HARD' },
  { id: 'wb_6', prompt: 'VELOCITY', difficulty: 'EASY' },
  { id: 'wb_7', prompt: 'CYBERPUNK', difficulty: 'MEDIUM' },
  { id: 'wb_8', prompt: 'LEADERBOARD', difficulty: 'MEDIUM' },
  { id: 'wb_9', prompt: 'DETERMINISTIC', difficulty: 'HARD' },
  { id: 'wb_10', prompt: 'CHAMPION', difficulty: 'EASY' },
  { id: 'wb_11', prompt: 'BANDWIDTH', difficulty: 'MEDIUM' },
  { id: 'wb_12', prompt: 'LATENCY', difficulty: 'EASY' },
  { id: 'wb_13', prompt: 'ALGORITHM', difficulty: 'HARD' },
  { id: 'wb_14', prompt: 'SPECTRUM', difficulty: 'MEDIUM' },
  { id: 'wb_15', prompt: 'DOMINANCE', difficulty: 'MEDIUM' },
];

export class WordBlitz implements GameMode {
  private roomId: string;
  private status: WordBlitzGameState['status'] = 'COUNTDOWN';
  private currentRound: number = 0;
  private currentChallenge: WordChallenge | null = null;
  private startedAt: number = 0;
  private endsAt: number = 0;
  private roundFirstCorrectWinnerId: string | null = null;

  private players: Map<
    string,
    {
      id: string;
      username: string;
      score: number;
      hasSubmitted: boolean;
      correctCount: number;
      lastResult?: WordBlitzPlayerSubmission;
    }
  > = new Map();

  private roundTimer: NodeJS.Timeout | null = null;
  private intermissionTimer: NodeJS.Timeout | null = null;
  private usedChallengeIds: Set<string> = new Set();

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  public initialize(playerInits: GamePlayerInit[]): void {
    this.status = 'COUNTDOWN';
    this.currentRound = 0;
    this.players.clear();
    this.usedChallengeIds.clear();

    for (const p of playerInits) {
      this.players.set(p.id, {
        id: p.id,
        username: p.username,
        score: 0,
        hasSubmitted: false,
        correctCount: 0,
      });
    }

    // 3-second initial countdown
    setTimeout(() => {
      if (this.status !== 'FINISHED') {
        this.startNextRound();
      }
    }, 3000);
  }

  private startNextRound(): void {
    if (this.currentRound >= TOTAL_ROUNDS) {
      this.finishGame();
      return;
    }

    this.currentRound += 1;
    this.status = 'ROUND_ACTIVE';
    this.roundFirstCorrectWinnerId = null;

    // Pick unique challenge from pool
    const unused = CHALLENGE_POOL.filter((c) => !this.usedChallengeIds.has(c.id));
    const pool = unused.length > 0 ? unused : CHALLENGE_POOL;
    const selected = (pool[Math.floor(Math.random() * pool.length)] || CHALLENGE_POOL[0]) as WordChallenge;
    this.currentChallenge = selected;
    this.usedChallengeIds.add(selected.id);

    const now = Date.now();
    this.startedAt = now;
    this.endsAt = now + ROUND_DURATION_MS;

    for (const p of this.players.values()) {
      p.hasSubmitted = false;
      p.lastResult = undefined;
    }

    this.roundTimer = setTimeout(() => {
      if (this.status === 'ROUND_ACTIVE') {
        this.endRound();
      }
    }, ROUND_DURATION_MS);
  }

  public handleInput(_userId: string, _input: PlayerInput): void {
    // Unused for Word Blitz
  }

  public handleSubmit(userId: string, roundId: number, answer: string): WordBlitzPlayerSubmission | null {
    if (this.status !== 'ROUND_ACTIVE' || !this.currentChallenge) return null;
    if (roundId !== this.currentRound) return null;

    const player = this.players.get(userId);
    if (!player || player.hasSubmitted) return null;

    const now = Date.now();
    if (now > this.endsAt + 500) return null; // Expired submission check

    player.hasSubmitted = true;
    const reactionMs = Math.max(1, now - this.startedAt);

    // Normalize: trim and lowercase
    const normalizedClientAnswer = (answer || '').trim().toLowerCase();
    const normalizedCorrectAnswer = this.currentChallenge.prompt.trim().toLowerCase();

    const isCorrect = normalizedClientAnswer === normalizedCorrectAnswer;
    let scoreEarned = 0;

    if (isCorrect) {
      scoreEarned += 100; // Base score (+100)

      // Speed bonus
      const sec = reactionMs / 1000;
      if (sec < 1.0) scoreEarned += 100;
      else if (sec <= 2.0) scoreEarned += 75;
      else if (sec <= 4.0) scoreEarned += 50;
      else if (sec <= 7.0) scoreEarned += 25;
      else scoreEarned += 10;

      // First correct bonus (+50)
      if (this.roundFirstCorrectWinnerId === null) {
        this.roundFirstCorrectWinnerId = player.id;
        scoreEarned += 50;
      }

      player.score += scoreEarned;
      player.correctCount += 1;
    }

    const submission: WordBlitzPlayerSubmission = {
      userId: player.id,
      username: player.username,
      submittedAt: now,
      reactionMs,
      isCorrect,
      scoreEarned,
    };

    player.lastResult = submission;

    // If all players have submitted, end round immediately
    const allSubmitted = Array.from(this.players.values()).every((p) => p.hasSubmitted);
    if (allSubmitted) {
      if (this.roundTimer) clearTimeout(this.roundTimer);
      this.endRound();
    }

    return submission;
  }

  private endRound(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.status = 'ROUND_END';

    this.intermissionTimer = setTimeout(() => {
      if (this.status !== 'FINISHED') {
        this.startNextRound();
      }
    }, INTERMISSION_MS);
  }

  private finishGame(): void {
    this.status = 'FINISHED';
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.intermissionTimer) clearTimeout(this.intermissionTimer);
  }

  public update(_deltaSeconds: number): void {
    // Timers handle state transitions
  }

  public getState(): WordBlitzGameState {
    return {
      roomId: this.roomId,
      status: this.status,
      currentRound: this.currentRound,
      totalRounds: TOTAL_ROUNDS,
      challenge: this.currentChallenge
        ? {
            id: this.currentChallenge.id,
            prompt: this.currentChallenge.prompt,
            difficulty: this.currentChallenge.difficulty,
          }
        : null,
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        username: p.username,
        score: p.score,
        hasSubmitted: p.hasSubmitted,
        correctCount: p.correctCount,
        lastResult: p.lastResult,
      })),
    };
  }

  public isFinished(): boolean {
    return this.status === 'FINISHED';
  }

  public getResults(): MatchResult {
    const sorted = Array.from(this.players.values()).sort((a, b) => b.score - a.score);

    const standings: PlayerResult[] = sorted.map((p, idx) => ({
      userId: p.id,
      username: p.username,
      score: p.score,
      rank: idx + 1,
      xpEarned: Math.max(20, Math.floor(p.score / 2)),
      statLabel: 'Words Correct',
      statValue: `${p.correctCount}/${TOTAL_ROUNDS}`,
    }));

    return {
      matchId: `match_${Date.now()}`,
      roomId: this.roomId,
      gameType: 'Word Blitz',
      startedAt: this.startedAt,
      endedAt: Date.now(),
      winnerId: standings[0]?.userId || null,
      standings,
    };
  }

  public destroy(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.intermissionTimer) clearTimeout(this.intermissionTimer);
  }
}
