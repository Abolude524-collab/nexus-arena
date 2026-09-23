import { GameMode, GamePlayerInit } from './GameMode.js';
import {
  TerritoryGameState,
  TerritoryCell,
  TerritoryPlayerState,
  MatchResult,
  PlayerResult,
  PlayerInput,
} from '../shared/index.js';

const GRID_SIZE = 10;
const MATCH_DURATION_SECONDS = 300; // 5 minutes
const CAPTURE_TIME_SECONDS = 3;

const PLAYER_COLORS = [
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#6366F1', // Indigo
];

export class Territory implements GameMode {
  private roomId: string;
  private status: TerritoryGameState['status'] = 'COUNTDOWN';
  private startedAt: number = 0;
  private endsAt: number = 0;
  private cells: Map<string, TerritoryCell> = new Map();
  private players: Map<string, TerritoryPlayerState> = new Map();
  private scoreAccumulator: Map<string, number> = new Map();
  private defendTimers: Map<string, number> = new Map(); // key: `${cellId}_${ownerId}` -> elapsed seconds

  constructor(roomId: string) {
    this.roomId = roomId;
    this.initGrid();
  }

  private initGrid(): void {
    this.cells.clear();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const id = `cell_${x}_${y}`;
        this.cells.set(id, {
          id,
          gridX: x,
          gridY: y,
          ownerId: null,
          state: 'NEUTRAL',
          captureProgress: 0,
          capturingPlayers: [],
        });
      }
    }
  }

  public initialize(playerInits: GamePlayerInit[]): void {
    this.startedAt = Date.now();
    this.endsAt = this.startedAt + MATCH_DURATION_SECONDS * 1000 + 3000;
    this.status = 'COUNTDOWN';
    this.players.clear();
    this.scoreAccumulator.clear();

    const spawnPositions = [
      { x: 0, y: 0 },
      { x: 9, y: 9 },
      { x: 9, y: 0 },
      { x: 0, y: 9 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 4 },
    ];

    playerInits.forEach((p, idx) => {
      const pos = spawnPositions[idx % spawnPositions.length] || { x: 0, y: 0 };
      const color = PLAYER_COLORS[idx % PLAYER_COLORS.length] || '#8B5CF6';

      this.players.set(p.id, {
        id: p.id,
        username: p.username,
        color,
        gridX: pos.x,
        gridY: pos.y,
        score: 0,
        territoriesControlled: 0,
      });

      this.scoreAccumulator.set(p.id, 0);

      // Claim initial spawn cell immediately
      const spawnCellId = `cell_${pos.x}_${pos.y}`;
      const spawnCell = this.cells.get(spawnCellId);
      if (spawnCell) {
        spawnCell.ownerId = p.id;
        spawnCell.state = 'CONTROLLED';
        spawnCell.captureProgress = 100;
      }
    });

    setTimeout(() => {
      if (this.status !== 'FINISHED') {
        this.status = 'PLAYING';
      }
    }, 3000);
  }

  public handleInput(userId: string, input: PlayerInput): void {
    if (this.status !== 'PLAYING') return;

    const player = this.players.get(userId);
    if (!player) return;

    let newX = player.gridX;
    let newY = player.gridY;

    if (input.up) newY = Math.max(0, player.gridY - 1);
    if (input.down) newY = Math.min(GRID_SIZE - 1, player.gridY + 1);
    if (input.left) newX = Math.max(0, player.gridX - 1);
    if (input.right) newX = Math.min(GRID_SIZE - 1, player.gridX + 1);

    player.gridX = newX;
    player.gridY = newY;
  }

  public update(deltaSeconds: number): void {
    if (this.status !== 'PLAYING') return;

    const now = Date.now();
    if (now >= this.endsAt) {
      this.finishGame();
      return;
    }

    // 1. Group players by current cell
    const cellOccupants: Map<string, string[]> = new Map();
    for (const cellId of this.cells.keys()) {
      cellOccupants.set(cellId, []);
    }

    for (const player of this.players.values()) {
      const cellId = `cell_${player.gridX}_${player.gridY}`;
      if (cellOccupants.has(cellId)) {
        cellOccupants.get(cellId)!.push(player.id);
      }
    }

    // 2. Update capture progress and states
    const playerControlledCount: Map<string, number> = new Map();
    for (const pId of this.players.keys()) {
      playerControlledCount.set(pId, 0);
    }

    for (const [cellId, cell] of this.cells.entries()) {
      const occupants = cellOccupants.get(cellId) || [];
      cell.capturingPlayers = occupants;

      if (occupants.length === 0) {
        // Unoccupied
        if (cell.ownerId) {
          cell.state = 'CONTROLLED';
        } else {
          cell.state = 'NEUTRAL';
          cell.captureProgress = 0;
        }
      } else if (occupants.length === 1) {
        const occupantId = occupants[0];
        if (cell.ownerId === occupantId) {
          // Owner present
          cell.state = 'CONTROLLED';
          cell.captureProgress = 100;
        } else {
          // Single attacker capturing
          cell.state = 'CAPTURING';
          const increment = (100 / CAPTURE_TIME_SECONDS) * deltaSeconds;
          cell.captureProgress = Math.min(100, cell.captureProgress + increment);

          if (cell.captureProgress >= 100 && occupantId) {
            cell.ownerId = occupantId;
            cell.state = 'CONTROLLED';
            const capturer = this.players.get(occupantId);
            if (capturer) {
              capturer.score += 100; // Capture bonus (+100)
            }
          }
        }
      } else {
        // Multiple occupants -> Contested
        const uniqueTeams = new Set(occupants);
        if (uniqueTeams.size > 1) {
          cell.state = 'CONTESTED';
          // Progress freezes while contested
        } else {
          cell.state = 'CAPTURING';
        }
      }

      if (cell.ownerId && cell.state === 'CONTROLLED') {
        playerControlledCount.set(
          cell.ownerId,
          (playerControlledCount.get(cell.ownerId) || 0) + 1,
        );

        // Track defend bonus (+25 per 10s)
        const defendKey = `${cell.id}_${cell.ownerId}`;
        const prevDefend = this.defendTimers.get(defendKey) || 0;
        const newDefend = prevDefend + deltaSeconds;
        if (newDefend >= 10) {
          const owner = this.players.get(cell.ownerId);
          if (owner) owner.score += 25;
          this.defendTimers.set(defendKey, 0);
        } else {
          this.defendTimers.set(defendKey, newDefend);
        }
      }
    }

    // 3. Accumulate +10 pts/sec per controlled territory
    for (const [pId, count] of playerControlledCount.entries()) {
      const player = this.players.get(pId);
      if (!player) continue;

      player.territoriesControlled = count;
      const currentAcc = (this.scoreAccumulator.get(pId) || 0) + count * 10 * deltaSeconds;
      if (currentAcc >= 1) {
        const added = Math.floor(currentAcc);
        player.score += added;
        this.scoreAccumulator.set(pId, currentAcc - added);
      } else {
        this.scoreAccumulator.set(pId, currentAcc);
      }

      // Full map control bonus (+500)
      if (count >= GRID_SIZE * GRID_SIZE) {
        player.score += 500;
        this.finishGame();
        return;
      }
    }
  }

  private finishGame(): void {
    this.status = 'FINISHED';
  }

  public getState(): TerritoryGameState {
    return {
      roomId: this.roomId,
      status: this.status,
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      gridWidth: GRID_SIZE,
      gridHeight: GRID_SIZE,
      cells: Array.from(this.cells.values()),
      players: Array.from(this.players.values()),
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
      statLabel: 'Territories',
      statValue: `${p.territoriesControlled} Cells`,
    }));

    return {
      matchId: `match_${Date.now()}`,
      roomId: this.roomId,
      gameType: 'Territory',
      startedAt: this.startedAt,
      endedAt: Date.now(),
      winnerId: standings[0]?.userId || null,
      standings,
    };
  }
}
