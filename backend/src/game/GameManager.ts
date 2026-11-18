import { Server } from 'socket.io';
import { GameMode } from './GameMode.js';
import { NeonDash } from './NeonDash.js';
import { ReactionRush } from './ReactionRush.js';
import { Territory } from './Territory.js';
import { WordBlitz } from './WordBlitz.js';
import { PlayerInput } from '../shared/index.js';
import { MatchService } from '../services/match.service.js';
import { roomManager } from '../services/room.manager.js';
import { followService } from '../services/follow.service.js';
import { emitRoomUpdate, spectateChannel } from '../sockets/channels.js';

const TICK_RATE = 60;
const TICK_INTERVAL_MS = 1000 / TICK_RATE;
// Spectators do not need the full 60Hz authoritative tick; 10Hz keeps the view smooth.
const SPECTATOR_BROADCAST_INTERVAL_MS = 100;

// Mirrors the room registry: active matches and their tick timers must be
// shared even if this module is evaluated twice (test runners, bundler cycles).
const gameRegistry = globalThis as typeof globalThis & {
  __nexusGameManager?: GameManager;
};

export class GameManager {
  private io: Server | null = null;
  private activeGames: Map<string, { game: GameMode; timer: NodeJS.Timeout }> = new Map();

  private constructor() {}

  public static getInstance(): GameManager {
    if (!gameRegistry.__nexusGameManager) {
      gameRegistry.__nexusGameManager = new GameManager();
    }
    return gameRegistry.__nexusGameManager;
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

    // Broadcast room:updated to the room and, when public, the global lobby
    if (this.io) {
      emitRoomUpdate(this.io, updatedRoom);

      // Immediately emit initial state snapshot
      this.io.to(roomId).emit('game:state', game.getState());
      this.io.to(spectateChannel(roomId)).emit('spectator:game_state', game.getSpectatorState());

      // Registered followers are notified once, off the game loop, and never mid-match
      followService
        .notifyMatchLive(
          this.io,
          roomId,
          updatedRoom.name,
          updatedRoom.gameType,
          updatedRoom.players.map((p) => ({ id: p.id, username: p.username })),
        )
        .catch(() => {
          // Notifications are best-effort and must never block a match start
        });
    }

    let lastTick = Date.now();
    let lastSpectatorBroadcast = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - lastTick) / 1000;
      lastTick = now;

      game.update(deltaSeconds);
      const state = game.getState();

      if (this.io) {
        this.io.to(roomId).emit('game:state', state);

        if (now - lastSpectatorBroadcast >= SPECTATOR_BROADCAST_INTERVAL_MS) {
          lastSpectatorBroadcast = now;
          this.io
            .to(spectateChannel(roomId))
            .emit('spectator:game_state', game.getSpectatorState());
        }
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
      emitRoomUpdate(this.io, updatedRoom);
      this.io.to(roomId).emit('game:ended', results);
      this.io.to(spectateChannel(roomId)).emit('spectator:match_ended', {
        roomId,
        cancelled: false,
        results,
      });
      this.io.in(spectateChannel(roomId)).socketsLeave(spectateChannel(roomId));
    }

    roomManager.clearSpectators(roomId);

    // Persist results asynchronously
    MatchService.persistMatchResult(results);
  }

  /** Notify spectators that a match was cancelled (room closed / host ended it). */
  public notifySpectatorsMatchCancelled(roomId: string): void {
    if (this.io) {
      this.io.to(spectateChannel(roomId)).emit('spectator:match_ended', {
        roomId,
        cancelled: true,
        results: null,
      });
      this.io.in(spectateChannel(roomId)).socketsLeave(spectateChannel(roomId));
    }
    roomManager.clearSpectators(roomId);
  }

  /** Remove all spectators from a live match (e.g. the host disabled spectating). */
  public evictSpectators(roomId: string, reason: string): void {
    if (this.io) {
      this.io.to(spectateChannel(roomId)).emit('spectator:left', { roomId, reason });
      this.io.in(spectateChannel(roomId)).socketsLeave(spectateChannel(roomId));
    }
    roomManager.clearSpectators(roomId);
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
