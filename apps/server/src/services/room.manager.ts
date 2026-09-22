import { RoomDTO, RoomPlayer, RoomStatus, CreateRoomInput } from '@nexus-arena/shared';
import { prisma } from '../db/prisma.js';

export interface RoomInstance extends RoomDTO {
  passwordHash?: string;
}

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, RoomInstance> = new Map();
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.loadRoomsFromDb();
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
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
            passwordHash: r.passwordHash || undefined,
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
      isPrivate: !!options.isPrivate,
      passwordHash: options.password || undefined,
      players: [hostPlayer],
      createdAt: new Date().toISOString(),
    };

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
          passwordHash: room.passwordHash,
        },
      })
      .catch((err) => console.error('[RoomManager] Failed to persist room to DB:', err));

    return this.toDTO(room);
  }

  public getRoom(roomId: string): RoomInstance | undefined {
    return this.rooms.get(roomId);
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
      if (!room.isPrivate && room.status !== 'CLOSED' && room.status !== 'FINISHED') {
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
    prisma.room
      .update({
        where: { id: roomId },
        data: { status: 'CLOSED' },
      })
      .catch(() => {});

    return true;
  }

  private toDTO(room: RoomInstance): RoomDTO {
    const { passwordHash: _hash, ...dto } = room;
    return dto;
  }

  public clearAll(): void {
    this.rooms.clear();
    for (const t of this.disconnectTimers.values()) {
      clearTimeout(t);
    }
    this.disconnectTimers.clear();
  }
}

export const roomManager = RoomManager.getInstance();
