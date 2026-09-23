import { Server } from 'socket.io';
import { GameMode } from './GameMode.js';
import { NeonDash } from './NeonDash.js';
import { ReactionRush } from './ReactionRush.js';
import { Territory } from './Territory.js';
import { WordBlitz } from './WordBlitz.js';
import { PlayerInput } from '../shared/index.js';
import { MatchService } from '../services/match.service.js';
import { roomManager } from '../services/room.manager.js';

const TICK_RATE = 60;
const TICK_INTERVAL_MS = 1000 / TICK_RATE;

export class GameManager {
  private static instance: GameManager;
  private io: Server | null = null;
  private activeGames: Map<string, { game: GameMode; timer: NodeJS.Timeout }> = new Map();

  private constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public setSocketServer(io: Server): void {
    this.io = io;
  }

  public startGame(roomId: string, playerInits: { id: string; username: string }[]): GameMode {
    if (this.activeGames.has(roomId)) {
      return this.activeGames.get(roomId)!.game;
    }

    const room = roomManager.getRoom(roomId);
    const gameType = room ? room.gameType : 'Neon Dash';

    let game: GameMode;
    if (gameType === 'Reaction Rush') {
      game = new ReactionRush(roomId);
    } else if (gameType === 'Territory') {
      game = new Territory(roomId);
    } else if (gameType === 'Word Blitz') {
      game = new WordBlitz(roomId);
    } else {
      game = new NeonDash(roomId);
    }

    game.initialize(playerInits);

    // Update room status in room manager and DB
    const updatedRoom = roomManager.updateStatus(roomId, 'PLAYING');

    // Broadcast room:updated to ALL players in room and global lobby
    if (this.io) {
      this.io.to(roomId).emit('room:updated', updatedRoom);
      this.io.emit('room:updated', updatedRoom);

      // Immediately emit initial state snapshot
      this.io.to(roomId).emit('game:state', game.getState());
    }

    let lastTick = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - lastTick) / 1000;
      lastTick = now;

      game.update(deltaSeconds);
      const state = game.getState();

      if (this.io) {
        this.io.to(roomId).emit('game:state', state);
      }

      if (game.isFinished()) {
        this.endGame(roomId);
      }
    }, TICK_INTERVAL_MS);

    this.activeGames.set(roomId, { game, timer });

    return game;
  }

  public handleInput(roomId: string, userId: string, input: PlayerInput): void {
    const entry = this.activeGames.get(roomId);
    if (entry) {
      entry.game.handleInput(userId, input);
    }
  }

  public handleReactionClick(roomId: string, userId: string, roundId: number, targetId: string): void {
    const entry = this.activeGames.get(roomId);
    if (entry && entry.game instanceof ReactionRush) {
      entry.game.handleClick(userId, roundId, targetId);
    }
  }

  public handleWordSubmit(roomId: string, userId: string, roundId: number, answer: string): void {
    const entry = this.activeGames.get(roomId);
    if (entry && entry.game instanceof WordBlitz) {
      entry.game.handleSubmit(userId, roundId, answer);
    }
  }

  public endGame(roomId: string): void {
    const entry = this.activeGames.get(roomId);
    if (!entry) return;

    clearInterval(entry.timer);
    const results = entry.game.getResults();
    this.activeGames.delete(roomId);

    const updatedRoom = roomManager.updateStatus(roomId, 'FINISHED');

    if (this.io) {
      this.io.to(roomId).emit('room:updated', updatedRoom);
      this.io.emit('room:updated', updatedRoom);
      this.io.to(roomId).emit('game:ended', results);
    }

    // Persist results asynchronously
    MatchService.persistMatchResult(results);
  }

  public getGame(roomId: string): GameMode | undefined {
    return this.activeGames.get(roomId)?.game;
  }

  public removeGame(roomId: string): void {
    const entry = this.activeGames.get(roomId);
    if (entry) {
      clearInterval(entry.timer);
      this.activeGames.delete(roomId);
    }
  }
}

export const gameManager = GameManager.getInstance();
