import {
  GameState,
  PlayerState,
  Collectible,
  GameObstacle,
  PlayerInput,
  MatchResult,
  PlayerResult,
} from '../shared/index.js';
import { GameMode, GamePlayerInit } from './GameMode.js';

const PLAYER_COLORS = [
  '#8B5CF6', // Violet
  '#22D3EE', // Cyan
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#A855F7', // Purple
];

export class NeonDash implements GameMode {
  private roomId: string;
  private matchId: string;
  private status: 'COUNTDOWN' | 'PLAYING' | 'FINISHED' = 'COUNTDOWN';
  private countdownSeconds = 3;
  private startedAt = 0;
  private durationSeconds = 180; // 3 minutes
  private endsAt = 0;
  private elapsedTime = 0;

  private arenaWidth = 1600;
  private arenaHeight = 900;
  private playerRadius = 18;
  private playerSpeed = 360; // units per second

  private players: Map<string, PlayerState> = new Map();
  private playerSequences: Map<string, number> = new Map();
  private collectibles: Map<string, Collectible> = new Map();
  private obstacles: GameObstacle[] = [];

  constructor(roomId: string) {
    this.roomId = roomId;
    this.matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.setupObstacles();
  }

  private setupObstacles(): void {
    this.obstacles = [
      { id: 'obs_1', x: 400, y: 250, width: 120, height: 120 },
      { id: 'obs_2', x: 1080, y: 250, width: 120, height: 120 },
      { id: 'obs_3', x: 740, y: 400, width: 120, height: 100 },
      { id: 'obs_4', x: 400, y: 530, width: 120, height: 120 },
      { id: 'obs_5', x: 1080, y: 530, width: 120, height: 120 },
    ];
  }

  public initialize(playerInits: GamePlayerInit[]): void {
    this.status = 'COUNTDOWN';
    this.startedAt = Date.now();
    this.endsAt = this.startedAt + (this.durationSeconds + this.countdownSeconds) * 1000;
    this.elapsedTime = 0;

    // Initialize players at spread out start positions
    playerInits.forEach((p, idx) => {
      const color = PLAYER_COLORS[idx % PLAYER_COLORS.length] || '#8B5CF6';
      const startX = 200 + (idx % 4) * 350;
      const startY = 200 + Math.floor(idx / 4) * 500;

      this.players.set(p.id, {
        id: p.id,
        username: p.username,
        color,
        x: startX,
        y: startY,
        velocityX: 0,
        velocityY: 0,
        radius: this.playerRadius,
        score: 0,
        activePowerUps: [],
        connected: true,
      });

      this.playerSequences.set(p.id, 0);
    });

    // Populate initial collectibles
    this.spawnCollectibles();
  }

  private spawnCollectibles(): void {
    const targetEnergy = 20;
    const targetGolden = 4;
    const targetPowerCore = 2;

    let energyCount = 0;
    let goldenCount = 0;
    let powerCoreCount = 0;

    for (const item of this.collectibles.values()) {
      if (item.type === 'ENERGY') energyCount++;
      if (item.type === 'GOLDEN') goldenCount++;
      if (item.type === 'POWER_CORE') powerCoreCount++;
    }

    while (energyCount < targetEnergy) {
      this.createCollectible('ENERGY');
      energyCount++;
    }
    while (goldenCount < targetGolden) {
      this.createCollectible('GOLDEN');
      goldenCount++;
    }
    while (powerCoreCount < targetPowerCore) {
      this.createCollectible('POWER_CORE');
      powerCoreCount++;
    }
  }

  private createCollectible(type: 'ENERGY' | 'GOLDEN' | 'POWER_CORE'): void {
    const id = `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${Math.random()}`;
    let radius = 10;
    let value = 10;

    if (type === 'GOLDEN') {
      radius = 14;
      value = 50;
    } else if (type === 'POWER_CORE') {
      radius = 18;
      value = 100;
    }

    let x = 100;
    let y = 100;
    let attempts = 0;
    let valid = false;

    while (!valid && attempts < 50) {
      attempts++;
      x = radius + Math.random() * (this.arenaWidth - radius * 2);
      y = radius + Math.random() * (this.arenaHeight - radius * 2);

      valid = !this.obstacles.some(
        (obs) =>
          x + radius >= obs.x &&
          x - radius <= obs.x + obs.width &&
          y + radius >= obs.y &&
          y - radius <= obs.y + obs.height,
      );
    }

    if (!valid) {
      x = 100 + Math.random() * 200;
      y = 100 + Math.random() * 200;
    }

    this.collectibles.set(id, { id, type, x, y, radius, value });
  }

  public handleInput(userId: string, input: PlayerInput): void {
    if (this.status !== 'PLAYING') return;

    const player = this.players.get(userId);
    if (!player) return;

    const lastSeq = this.playerSequences.get(userId) || 0;
    if (input.sequence <= lastSeq && lastSeq > 0) {
      return; // Ignore out-of-order stale inputs
    }
    this.playerSequences.set(userId, input.sequence);

    let moveX = 0;
    let moveY = 0;

    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.7071;
      moveY *= 0.7071;
    }

    player.velocityX = moveX * this.playerSpeed;
    player.velocityY = moveY * this.playerSpeed;
  }

  public update(deltaSeconds: number): void {
    this.elapsedTime += deltaSeconds;

    if (this.status === 'COUNTDOWN') {
      if (this.elapsedTime >= this.countdownSeconds) {
        this.status = 'PLAYING';
      }
      return;
    }

    if (this.status === 'PLAYING') {
      if (this.elapsedTime >= this.countdownSeconds + this.durationSeconds) {
        this.status = 'FINISHED';
        return;
      }

      // Continuously ensure arena is populated with collectibles
      this.spawnCollectibles();

      // Update positions and handle collisions
      for (const player of this.players.values()) {
        if (!player.connected) continue;

        let nextX = player.x + player.velocityX * deltaSeconds;
        let nextY = player.y + player.velocityY * deltaSeconds;

        // Arena boundary clamping
        nextX = Math.max(player.radius, Math.min(this.arenaWidth - player.radius, nextX));
        nextY = Math.max(player.radius, Math.min(this.arenaHeight - player.radius, nextY));

        // Obstacle collision resolution
        for (const obs of this.obstacles) {
          if (
            nextX + player.radius > obs.x &&
            nextX - player.radius < obs.x + obs.width &&
            nextY + player.radius > obs.y &&
            nextY - player.radius < obs.y + obs.height
          ) {
            nextX = player.x;
            nextY = player.y;
            break;
          }
        }

        player.x = nextX;
        player.y = nextY;

        // Check collectible collisions
        for (const [colId, col] of this.collectibles.entries()) {
          const dx = player.x - col.x;
          const dy = player.y - col.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < player.radius + col.radius) {
            player.score += col.value;
            this.collectibles.delete(colId);
            this.createCollectible(col.type);
          }
        }
      }
    }
  }

  public getState(): GameState {
    return {
      roomId: this.roomId,
      status: this.status,
      countdownSeconds: Math.max(0, Math.ceil(this.countdownSeconds - this.elapsedTime)),
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      arenaWidth: this.arenaWidth,
      arenaHeight: this.arenaHeight,
      players: Array.from(this.players.values()),
      collectibles: Array.from(this.collectibles.values()),
      obstacles: this.obstacles,
    };
  }

  public isFinished(): boolean {
    return this.status === 'FINISHED';
  }

  public getResults(): MatchResult {
    const standings: PlayerResult[] = Array.from(this.players.values())
      .sort((a, b) => b.score - a.score)
      .map((p, idx) => ({
        userId: p.id,
        username: p.username,
        score: p.score,
        rank: idx + 1,
        xpEarned: Math.round(p.score * 0.1) + (idx === 0 ? 250 : idx === 1 ? 150 : 50),
      }));

    const winner = standings[0];

    return {
      matchId: this.matchId,
      roomId: this.roomId,
      gameType: 'Neon Dash',
      startedAt: this.startedAt,
      endedAt: Date.now(),
      winnerId: winner ? winner.userId : null,
      standings,
    };
  }
}
