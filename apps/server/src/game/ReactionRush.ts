import {
  GameMode,
  GamePlayerInit,
} from './GameMode.js';
import {
  ReactionRushGameState,
  ReactionTarget,
  MatchResult,
  PlayerResult,
  PlayerInput,
} from '@nexus-arena/shared';

const TOTAL_ROUNDS = 10;
const ROUND_TIMEOUT_MS = 5000;
const INTERMISSION_MS = 2000;

export class ReactionRush implements GameMode {
  private roomId: string;
  private status: ReactionRushGameState['status'] = 'COUNTDOWN';
  private currentRound: number = 0;
  private target: ReactionTarget | null = null;
  private players: Map<
    string,
    {
      id: string;
      username: string;
      score: number;
      reactions: number[];
      hasClickedThisRound: boolean;
    }
  > = new Map();

  private startedAt: number = 0;
  private endedAt: number = 0;
  private armedTimer: NodeJS.Timeout | null = null;
  private roundTimeoutTimer: NodeJS.Timeout | null = null;
  private nextRoundTimer: NodeJS.Timeout | null = null;

  private roundWinnerId: string | null = null;
  private roundWinnerName: string | null = null;
  private roundWinnerMs: number | undefined = undefined;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  public initialize(playerInits: GamePlayerInit[]): void {
    this.startedAt = Date.now();
    this.status = 'COUNTDOWN';
    this.currentRound = 0;
    this.players.clear();

    for (const p of playerInits) {
      this.players.set(p.id, {
        id: p.id,
        username: p.username,
        score: 0,
        reactions: [],
        hasClickedThisRound: false,
      });
    }

    // Start 3-second countdown then round 1
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
    this.status = 'ARMED';
    this.target = null;
    this.roundWinnerId = null;
    this.roundWinnerName = null;
    this.roundWinnerMs = undefined;

    for (const p of this.players.values()) {
      p.hasClickedThisRound = false;
    }

    // Random delay between 1000ms and 3500ms before target appears
    const randomDelay = Math.floor(Math.random() * 2500) + 1000;

    this.armedTimer = setTimeout(() => {
      this.activateTarget();
    }, randomDelay);
  }

  private activateTarget(): void {
    if (this.status !== 'ARMED') return;

    const now = Date.now();
    const targetId = `target_${this.currentRound}_${Math.random().toString(36).substring(2, 7)}`;

    // Random coordinates within 1600x900 arena with padding
    const x = Math.floor(Math.random() * 1200) + 200;
    const y = Math.floor(Math.random() * 600) + 150;
    const radius = Math.floor(Math.random() * 20) + 40; // 40-60px radius

    this.target = {
      id: targetId,
      x,
      y,
      radius,
      activatedAt: now,
      expiresAt: now + ROUND_TIMEOUT_MS,
    };

    this.status = 'TARGET_ACTIVE';

    // Timeout if nobody clicks within 5s
    this.roundTimeoutTimer = setTimeout(() => {
      if (this.status === 'TARGET_ACTIVE') {
        this.endRound(null, undefined);
      }
    }, ROUND_TIMEOUT_MS);
  }

  public handleInput(_userId: string, _input: PlayerInput): void {
    // Standard WASD input unused for Reaction Rush
  }

  public handleClick(userId: string, roundId: number, targetId: string): void {
    const player = this.players.get(userId);
    if (!player) return;

    // Reject if pre-click before target activated
    if (this.status === 'ARMED') {
      player.hasClickedThisRound = true; // Pre-fire penalty
      return;
    }

    if (this.status !== 'TARGET_ACTIVE' || !this.target) return;
    if (roundId !== this.currentRound || targetId !== this.target.id) return;
    if (player.hasClickedThisRound) return; // Ignore duplicate clicks

    const now = Date.now();
    const reactionMs = Math.max(1, now - this.target.activatedAt);

    player.hasClickedThisRound = true;
    player.reactions.push(reactionMs);

    // Calculate score based on reaction time
    let points = 0;
    if (reactionMs < 150) points = 100;
    else if (reactionMs <= 250) points = 80;
    else if (reactionMs <= 400) points = 60;
    else if (reactionMs <= 600) points = 40;
    else points = 20;

    // First valid click bonus (+50)
    const isFirstClick = this.roundWinnerId === null;
    if (isFirstClick) {
      points += 50;
      this.roundWinnerId = player.id;
      this.roundWinnerName = player.username;
      this.roundWinnerMs = reactionMs;
    }

    player.score += points;

    // End round immediately on first click
    this.endRound(player.id, reactionMs);
  }

  private endRound(_winnerId: string | null, _winnerMs?: number): void {
    if (this.armedTimer) clearTimeout(this.armedTimer);
    if (this.roundTimeoutTimer) clearTimeout(this.roundTimeoutTimer);

    this.status = 'ROUND_RESULT';

    this.nextRoundTimer = setTimeout(() => {
      if (this.status !== 'FINISHED') {
        this.startNextRound();
      }
    }, INTERMISSION_MS);
  }

  private finishGame(): void {
    this.status = 'FINISHED';
    this.endedAt = Date.now();

    if (this.armedTimer) clearTimeout(this.armedTimer);
    if (this.roundTimeoutTimer) clearTimeout(this.roundTimeoutTimer);
    if (this.nextRoundTimer) clearTimeout(this.nextRoundTimer);
  }

  public update(_deltaSeconds: number): void {
    // Timer checks handled asynchronously
  }

  public getState(): ReactionRushGameState {
    return {
      roomId: this.roomId,
      status: this.status,
      currentRound: this.currentRound,
      totalRounds: TOTAL_ROUNDS,
      target: this.target,
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        username: p.username,
        score: p.score,
        lastReactionMs: p.reactions[p.reactions.length - 1],
      })),
      roundWinnerId: this.roundWinnerId,
      roundWinnerName: this.roundWinnerName,
      roundWinnerMs: this.roundWinnerMs,
    };
  }

  public isFinished(): boolean {
    return this.status === 'FINISHED';
  }

  public getResults(): MatchResult {
    const sorted = Array.from(this.players.values()).sort((a, b) => b.score - a.score);

    const standings: PlayerResult[] = sorted.map((p, idx) => {
      const avgMs =
        p.reactions.length > 0
          ? Math.round(p.reactions.reduce((sum, r) => sum + r, 0) / p.reactions.length)
          : 0;

      return {
        userId: p.id,
        username: p.username,
        score: p.score,
        rank: idx + 1,
        xpEarned: Math.max(20, p.score / 2),
        statLabel: 'Avg Reaction',
        statValue: avgMs > 0 ? `${avgMs}ms` : 'N/A',
      };
    });

    return {
      matchId: `match_${Date.now()}`,
      roomId: this.roomId,
      gameType: 'Reaction Rush',
      startedAt: this.startedAt,
      endedAt: this.endedAt || Date.now(),
      winnerId: standings[0]?.userId || null,
      standings,
    };
  }

  public destroy(): void {
    if (this.armedTimer) clearTimeout(this.armedTimer);
    if (this.roundTimeoutTimer) clearTimeout(this.roundTimeoutTimer);
    if (this.nextRoundTimer) clearTimeout(this.nextRoundTimer);
  }
}
