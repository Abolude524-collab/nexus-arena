import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import {
  RoomDTO,
  RoomPlayer,
  RoomStatus,
  CreateRoomInput,
  RoomVisibility,
  LiveMatchSummary,
  SpectatorRoomInfo,
  SpectatorMember,
  SPECTATOR_DEFAULT_LIMIT,
  getGameId,
} from '../shared/index.js';
import { prisma } from '../db/prisma.js';

const SPECTATOR_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SPECTATOR_CODE_LENGTH = 10;
const MAX_SPECTATOR_LIMIT = 200;

export interface RoomInstance extends RoomDTO {
  passwordHash?: string;
  spectatorAccessCode?: string;
  spectatorAccessCodeHash?: string;
  matchStartedAt?: string;
}

export interface SpectatorSettingsInput {
  allowSpectators?: boolean;
  spectatorLimit?: number;
}

// A module can be evaluated more than once (test runners, bundler cycles).
// Room registry, spectator presence and access codes must stay identical for
// every importer, so the singleton lives on the global object instead of on
// the class, which is recreated with each evaluation.
const roomRegistry = globalThis as typeof globalThis & {
  __nexusRoomManager?: RoomManager;
};

export class RoomManager {
  private rooms: Map<string, RoomInstance> = new Map();
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  // Ephemeral spectator presence: roomId -> userId -> member. Never persisted as membership.
  private spectators: Map<string, Map<string, SpectatorMember>> = new Map();

  private constructor() {
    this.loadRoomsFromDb();
  }

  public static getInstance(): RoomManager {
    if (!roomRegistry.__nexusRoomManager) {
      roomRegistry.__nexusRoomManager = new RoomManager();
    }
    return roomRegistry.__nexusRoomManager;
  }

  private async loadRoomsFromDb(): Promise<void> {
    try {
      const dbRooms = await prisma.room.findMany({
        where: { status: { not: 'CLOSED' } },
      });

      for (const r of dbRooms) {
        if (!this.rooms.has(r.id)) {
          this.rooms.set(r.id, {
            id: r.id,
            code: r.code,
            name: r.name,
            hostId: r.hostId,
            gameType: r.gameType,
            status: r.status as RoomStatus,
            maxPlayers: r.maxPlayers,
            currentPlayers: 0,
            isPrivate: r.isPrivate,
            visibility: this.normalizeVisibility(r.visibility, r.isPrivate),
            allowSpectators: r.allowSpectators,
            spectatorLimit: r.spectatorLimit,
            spectatorCount: 0,
            passwordHash: r.passwordHash || undefined,
            spectatorAccessCodeHash: r.spectatorAccessCodeHash || undefined,
            players: [],
            createdAt: r.createdAt.toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('[RoomManager] Failed to load rooms from DB:', err);
    }
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public createRoom(
    hostUser: { id: string; username: string; avatar: string },
    options: CreateRoomInput,
  ): RoomDTO {
    const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const code = this.generateCode();
    const visibility = this.resolveVisibility(options);
    const allowSpectators = options.allowSpectators !== false;
    const spectatorLimit = this.clampSpectatorLimit(options.spectatorLimit);

    const hostPlayer: RoomPlayer = {
      id: hostUser.id,
      username: hostUser.username,
      avatar: hostUser.avatar,
      isHost: true,
      isReady: true,
      connected: true,
    };

    const room: RoomInstance = {
      id,
      code,
      name: options.name,
      hostId: hostUser.id,
      gameType: options.gameType || 'Neon Dash',
      status: 'WAITING',
      maxPlayers: options.maxPlayers || 8,
      currentPlayers: 1,
      isPrivate: visibility === 'PRIVATE',
      visibility,
      allowSpectators,
      spectatorLimit,
      spectatorCount: 0,
      passwordHash: visibility === 'PRIVATE' ? options.password : undefined,
      players: [hostPlayer],
      createdAt: new Date().toISOString(),
    };

    // Private / unlisted matches always require a spectator access code
    if (visibility !== 'PUBLIC') {
      const spectatorCode = this.generateSpectatorCode();
      room.spectatorAccessCode = spectatorCode;
      room.spectatorAccessCodeHash = this.hashSpectatorCode(spectatorCode);
    }

    this.rooms.set(id, room);

    // Persist to DB asynchronously
    prisma.room
      .create({
        data: {
          id: room.id,
          code: room.code,
          name: room.name,
          hostId: room.hostId,
          gameType: room.gameType,
          status: room.status,
          maxPlayers: room.maxPlayers,
          isPrivate: room.isPrivate,
          visibility: room.visibility,
          allowSpectators: room.allowSpectators,
          spectatorLimit: room.spectatorLimit,
          passwordHash: room.passwordHash,
          spectatorAccessCodeHash: room.spectatorAccessCodeHash,
        },
      })
      .catch((err) => console.error('[RoomManager] Failed to persist room to DB:', err));

    return this.toDTO(room);
  }

  public getRoom(roomId: string): RoomInstance | undefined {
    return this.rooms.get(roomId);
  }

  public getRoomDTO(roomId: string): RoomDTO | undefined {
    const room = this.rooms.get(roomId);
    return room ? this.toDTO(room) : undefined;
  }

  public getRoomByCodeOrId(identifier: string): RoomInstance | undefined {
    const byId = this.rooms.get(identifier);
    if (byId) return byId;

    for (const room of this.rooms.values()) {
      if (room.code.toUpperCase() === identifier.toUpperCase()) {
        return room;
      }
    }
    return undefined;
  }

  public findRoomByUserId(userId: string): RoomInstance | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.id === userId)) {
        return room;
      }
    }
    return undefined;
  }

  public listRooms(): RoomDTO[] {
    const publicRooms: RoomDTO[] = [];
    for (const room of this.rooms.values()) {
      if (
        room.visibility === 'PUBLIC' &&
        room.status !== 'CLOSED' &&
        room.status !== 'FINISHED'
      ) {
        publicRooms.push(this.toDTO(room));
      }
    }
    return publicRooms;
  }

  public joinRoom(
    identifier: string,
    user: { id: string; username: string; avatar: string },
    password?: string,
  ): RoomDTO {
    const room = this.getRoomByCodeOrId(identifier);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status === 'FINISHED' || room.status === 'CLOSED') {
      throw new Error('This match has finished and is no longer joinable');
    }

    if (room.status !== 'WAITING' && room.status !== 'COUNTDOWN' && room.status !== 'PLAYING') {
      throw new Error('Room is closed');
    }

    if (room.isPrivate && room.passwordHash && room.passwordHash !== password) {
      throw new Error('Invalid room password');
    }

    // Cancel pending disconnect timer if rejoining
    const timerKey = `${room.id}_${user.id}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey)!);
      this.disconnectTimers.delete(timerKey);
    }

    const existingPlayer = room.players.find((p) => p.id === user.id);
    if (existingPlayer) {
      existingPlayer.connected = true;
      return this.toDTO(room);
    }

    // Taking a player slot supersedes any spectator presence for the same match
    this.removeSpectator(room.id, user.id);

    if (room.currentPlayers >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    const newPlayer: RoomPlayer = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      isHost: room.players.length === 0,
      isReady: room.players.length === 0,
      connected: true,
    };

    if (newPlayer.isHost) {
      room.hostId = user.id;
    }

    room.players.push(newPlayer);
    room.currentPlayers = room.players.length;

    return this.toDTO(room);
  }

  public handleDisconnect(roomId: string, userId: string, delayMs = 20000): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === userId);
    if (player) {
      player.connected = false;
    }

    const timerKey = `${roomId}_${userId}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey)!);
    }

    // 20-second grace period for temporary socket disconnect / page refresh
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(timerKey);
      const currentRoom = this.rooms.get(roomId);
      if (currentRoom) {
        const p = currentRoom.players.find((item) => item.id === userId);
        if (p && !p.connected) {
          this.leaveRoom(roomId, userId);
        }
      }
    }, delayMs);

    this.disconnectTimers.set(timerKey, timer);
  }

  public leaveRoom(roomId: string, userId: string): { room?: RoomDTO; destroyed: boolean } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { destroyed: false };
    }

    const timerKey = `${roomId}_${userId}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey)!);
      this.disconnectTimers.delete(timerKey);
    }

    room.players = room.players.filter((p) => p.id !== userId);
    room.currentPlayers = room.players.length;

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.clearSpectators(roomId);
      prisma.room
        .update({
          where: { id: roomId },
          data: { status: 'CLOSED' },
        })
        .catch(() => {});
      return { destroyed: true };
    }

    if (room.hostId === userId) {
      const nextHost = room.players[0];
      if (nextHost) {
        nextHost.isHost = true;
        nextHost.isReady = true;
        room.hostId = nextHost.id;
      }
    }

    return { room: this.toDTO(room), destroyed: false };
  }

  public setPlayerReady(roomId: string, userId: string, isReady: boolean): RoomDTO {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const player = room.players.find((p) => p.id === userId);
    if (!player) {
      throw new Error('Player not in room');
    }

    player.isReady = isReady;
    return this.toDTO(room);
  }

  public updateStatus(roomId: string, status: RoomStatus): RoomDTO {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.status = status;
    if (status === 'PLAYING') {
      room.matchStartedAt = new Date().toISOString();
    }
    prisma.room.update({ where: { id: roomId }, data: { status } }).catch(() => {});

    return this.toDTO(room);
  }

  public kickPlayer(roomId: string, hostId: string, targetUserId: string): RoomDTO {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.hostId !== hostId) {
      throw new Error('Only the room host can kick players');
    }

    if (hostId === targetUserId) {
      throw new Error('Host cannot kick themselves');
    }

    return this.leaveRoom(roomId, targetUserId).room || this.toDTO(room);
  }

  public closeRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Clear all pending disconnect timers for this room
    for (const player of room.players) {
      const timerKey = `${roomId}_${player.id}`;
      if (this.disconnectTimers.has(timerKey)) {
        clearTimeout(this.disconnectTimers.get(timerKey)!);
        this.disconnectTimers.delete(timerKey);
      }
    }

    this.rooms.delete(roomId);
    this.clearSpectators(roomId);
    prisma.room
      .update({
        where: { id: roomId },
        data: { status: 'CLOSED' },
      })
      .catch(() => {});

    return true;
  }

  // ------------------------------------------------------------------
  // WATCH / SPECTATOR
  // ------------------------------------------------------------------

  public setSpectatorSettings(
    roomId: string,
    hostId: string,
    settings: SpectatorSettingsInput,
  ): RoomDTO {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    if (room.hostId !== hostId) {
      throw new Error('Only the room host can change spectator settings');
    }

    if (typeof settings.allowSpectators === 'boolean') {
      room.allowSpectators = settings.allowSpectators;
    }
    if (typeof settings.spectatorLimit === 'number') {
      room.spectatorLimit = this.clampSpectatorLimit(settings.spectatorLimit);
    }

    prisma.room
      .update({
        where: { id: roomId },
        data: { allowSpectators: room.allowSpectators, spectatorLimit: room.spectatorLimit },
      })
      .catch(() => {});

    return this.toDTO(room);
  }

  /** Host-only. Returns the plaintext spectator code, generating or rotating it when needed. */
  public getSpectatorAccessCode(roomId: string, hostId: string, rotate = false): string {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    if (room.hostId !== hostId) {
      throw new Error('Only the room host can view the spectator code');
    }
    if (room.visibility === 'PUBLIC') {
      throw new Error('Public matches do not require a spectator code');
    }

    if (!room.spectatorAccessCode || rotate) {
      const code = this.generateSpectatorCode();
      room.spectatorAccessCode = code;
      room.spectatorAccessCodeHash = this.hashSpectatorCode(code);
      prisma.room
        .update({
          where: { id: roomId },
          data: { spectatorAccessCodeHash: room.spectatorAccessCodeHash },
        })
        .catch(() => {});
    }

    return room.spectatorAccessCode as string;
  }

  /** Returns null when the match may be spectated, otherwise a safe public reason. */
  public getSpectatorDenialReason(room: RoomInstance | undefined): string | null {
    if (!room) return 'Match unavailable or access denied';
    if (room.status !== 'PLAYING') return 'This match is not live right now';
    if (!room.allowSpectators) return 'Spectating is disabled for this match';
    if (room.spectatorLimit <= 0) return 'Spectating is disabled for this match';
    return null;
  }

  public verifySpectatorAccess(room: RoomInstance, accessCode?: string): boolean {
    if (room.visibility === 'PUBLIC') return true;
    if (!room.spectatorAccessCode) return false;
    return this.safeCompare(room.spectatorAccessCode, accessCode);
  }

  public addSpectator(
    roomId: string,
    userId: string,
    username: string,
    socketId: string,
    isGuest = false,
  ): number {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Match unavailable or access denied');
    }

    let members = this.spectators.get(roomId);
    if (!members) {
      members = new Map<string, SpectatorMember>();
      this.spectators.set(roomId, members);
    }

    const existing = members.get(userId);
    if (existing) {
      if (socketId && !existing.socketIds.includes(socketId)) {
        existing.socketIds.push(socketId);
      }
      return members.size;
    }

    if (members.size >= room.spectatorLimit) {
      throw new Error('Spectator limit reached for this match');
    }

    members.set(userId, {
      userId,
      username,
      joinedAt: Date.now(),
      socketIds: socketId ? [socketId] : [],
      isGuest,
    });

    return members.size;
  }

  public removeSpectator(roomId: string, userId: string, socketId?: string): number {
    const members = this.spectators.get(roomId);
    if (!members) return 0;

    const member = members.get(userId);
    if (!member) return members.size;

    if (socketId) {
      member.socketIds = member.socketIds.filter((id) => id !== socketId);
      if (member.socketIds.length > 0) {
        return members.size;
      }
    }

    members.delete(userId);
    if (members.size === 0) {
      this.spectators.delete(roomId);
    }
    return members.size;
  }

  public getSpectatorCount(roomId: string): number {
    return this.spectators.get(roomId)?.size ?? 0;
  }

  public isSpectator(roomId: string, userId: string): boolean {
    return this.spectators.get(roomId)?.has(userId) ?? false;
  }

  public listSpectators(roomId: string): SpectatorMember[] {
    return Array.from(this.spectators.get(roomId)?.values() ?? []);
  }

  public clearSpectators(roomId: string): SpectatorMember[] {
    const members = this.listSpectators(roomId);
    this.spectators.delete(roomId);
    return members;
  }

  /** Public WATCH directory: only live, spectatable, public matches. */
  public listLiveMatches(filter: { gameType?: string; search?: string } = {}): LiveMatchSummary[] {
    const search = (filter.search || '').trim().toLowerCase();
    const matches: LiveMatchSummary[] = [];

    for (const room of this.rooms.values()) {
      if (room.visibility !== 'PUBLIC') continue;
      if (room.status !== 'PLAYING') continue;
      if (!room.allowSpectators || room.spectatorLimit <= 0) continue;
      if (filter.gameType && room.gameType !== filter.gameType) continue;

      const summary = this.toLiveMatchSummary(room);

      if (search) {
        const haystack = [summary.name, summary.hostName, ...summary.players.map((p) => p.username)]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) continue;
      }

      matches.push(summary);
    }

    return matches.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }

  public getLiveMatchSummary(roomId: string): LiveMatchSummary | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    if (room.visibility !== 'PUBLIC') return undefined;
    if (room.status !== 'PLAYING' || !room.allowSpectators) return undefined;
    if (room.spectatorLimit <= 0) return undefined;
    return this.toLiveMatchSummary(room);
  }

  /**
   * Spectator-safe room descriptor: never contains room codes or access codes.
   * Anonymous viewers receive seat handles instead of stable player ids.
   */
  public toSpectatorRoomInfo(
    roomId: string,
    options: { profilesVisible?: boolean } = {},
  ): SpectatorRoomInfo | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const profilesVisible = options.profilesVisible !== false;

    return {
      id: room.id,
      name: room.name,
      gameType: room.gameType,
      visibility: room.visibility,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      startedAt: room.matchStartedAt || room.createdAt,
      players: room.players.map((p, index) => ({
        id: profilesVisible ? p.id : `seat_${index + 1}`,
        username: p.username,
        avatar: p.avatar,
      })),
      hostName: room.players.find((p) => p.isHost)?.username || 'HOST',
      profilesVisible,
    };
  }

  /** Resolve a live private/unlisted match from a hashed spectator code. */
  public findSpectatorMatchByCodeHash(hashedCode: string): RoomInstance | undefined {
    for (const room of this.rooms.values()) {
      if (room.visibility === 'PUBLIC') continue;
      if (!room.allowSpectators || room.spectatorLimit <= 0) continue;
      if (room.status !== 'PLAYING') continue;
      if (
        room.spectatorAccessCodeHash &&
        this.safeCompare(room.spectatorAccessCodeHash, hashedCode)
      ) {
        return room;
      }
    }
    return undefined;
  }

  public static hashAccessCode(code: string): string {
    return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
  }

  private toLiveMatchSummary(room: RoomInstance): LiveMatchSummary {
    return {
      id: room.id,
      name: room.name,
      gameType: room.gameType,
      gameId: getGameId(room.gameType),
      status: room.status,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      spectatorCount: this.getSpectatorCount(room.id),
      spectatorLimit: room.spectatorLimit,
      hostName: room.players.find((p) => p.isHost)?.username || 'HOST',
      startedAt: room.matchStartedAt || room.createdAt,
      players: room.players.map((p) => ({ id: p.id, username: p.username, avatar: p.avatar })),
      // Directory entries are public by construction, so no code is ever needed
      guestAccess: room.visibility === 'PUBLIC',
    };
  }

  private resolveVisibility(options: CreateRoomInput): RoomVisibility {
    const requested = options.visibility;
    if (requested === 'PUBLIC' || requested === 'PRIVATE' || requested === 'UNLISTED') {
      return requested;
    }
    if (options.isPrivate || options.password) return 'PRIVATE';
    return 'PUBLIC';
  }

  private normalizeVisibility(
    value: string | null | undefined,
    isPrivate: boolean,
  ): RoomVisibility {
    if (value === 'PUBLIC' || value === 'PRIVATE' || value === 'UNLISTED') return value;
    return isPrivate ? 'PRIVATE' : 'PUBLIC';
  }

  private clampSpectatorLimit(limit?: number): number {
    if (typeof limit !== 'number' || Number.isNaN(limit)) return SPECTATOR_DEFAULT_LIMIT;
    return Math.max(0, Math.min(MAX_SPECTATOR_LIMIT, Math.floor(limit)));
  }

  private generateSpectatorCode(): string {
    const bytes = randomBytes(SPECTATOR_CODE_LENGTH);
    let code = '';
    for (let i = 0; i < SPECTATOR_CODE_LENGTH; i++) {
      code += SPECTATOR_CODE_ALPHABET.charAt(
        (bytes[i] ?? 0) % SPECTATOR_CODE_ALPHABET.length,
      );
    }
    return code;
  }

  private hashSpectatorCode(code: string): string {
    return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
  }

  private safeCompare(expected: string, provided?: string): boolean {
    if (!provided) return false;
    const a = Buffer.from(expected.trim().toUpperCase());
    const b = Buffer.from(provided.trim().toUpperCase());
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  private toDTO(room: RoomInstance): RoomDTO {
    const {
      passwordHash: _hash,
      spectatorAccessCode: _code,
      spectatorAccessCodeHash: _codeHash,
      matchStartedAt: _startedAt,
      ...dto
    } = room;
    return { ...dto, spectatorCount: this.getSpectatorCount(room.id) };
  }

  public clearAll(): void {
    this.rooms.clear();
    this.spectators.clear();
    for (const t of this.disconnectTimers.values()) {
      clearTimeout(t);
    }
    this.disconnectTimers.clear();
  }
}

export const roomManager = RoomManager.getInstance();
