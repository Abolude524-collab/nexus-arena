import { Server } from 'socket.io';
import { prisma } from '../db/prisma.js';
import { FollowedPlayer, MAX_FOLLOWS_PER_USER, MatchLiveNotification } from '../shared/index.js';

interface FollowRow {
  playerId: string;
  isFavourite: boolean;
  notifyLive: boolean;
  createdAt: Date;
  player: { username: string };
}

const toFollowedPlayer = (row: FollowRow): FollowedPlayer => ({
  playerId: row.playerId,
  username: row.player.username,
  isFavourite: row.isFavourite,
  notifyLive: row.notifyLive,
  followedAt: row.createdAt.toISOString(),
});

export interface FollowOptions {
  isFavourite?: boolean;
  notifyLive?: boolean;
}

/**
 * Durable social graph for registered users. Guests never reach this service:
 * they have no user id to key a follow on and no mailbox to notify.
 */
export class FollowService {
  private static instance: FollowService;

  public static getInstance(): FollowService {
    if (!FollowService.instance) {
      FollowService.instance = new FollowService();
    }
    return FollowService.instance;
  }

  public async list(followerId: string): Promise<FollowedPlayer[]> {
    const rows = await prisma.playerFollow.findMany({
      where: { followerId },
      orderBy: [{ isFavourite: 'desc' }, { createdAt: 'desc' }],
      include: { player: { select: { username: true } } },
    });

    return rows.map(toFollowedPlayer);
  }

  public async follow(
    followerId: string,
    playerId: string,
    options: FollowOptions = {},
  ): Promise<FollowedPlayer> {
    if (followerId === playerId) {
      throw new Error('You cannot follow yourself');
    }

    const target = await prisma.user.findUnique({
      where: { id: playerId },
      select: { username: true },
    });
    if (!target) {
      throw new Error('Player not found');
    }

    const existing = await prisma.playerFollow.findUnique({
      where: { followerId_playerId: { followerId, playerId } },
      select: { id: true },
    });

    if (!existing) {
      const count = await prisma.playerFollow.count({ where: { followerId } });
      if (count >= MAX_FOLLOWS_PER_USER) {
        throw new Error(`You can follow up to ${MAX_FOLLOWS_PER_USER} players`);
      }
    }

    const row = await prisma.playerFollow.upsert({
      where: { followerId_playerId: { followerId, playerId } },
      create: {
        followerId,
        playerId,
        isFavourite: options.isFavourite ?? false,
        notifyLive: options.notifyLive ?? true,
      },
      update: {
        ...(options.isFavourite !== undefined ? { isFavourite: options.isFavourite } : {}),
        ...(options.notifyLive !== undefined ? { notifyLive: options.notifyLive } : {}),
      },
      include: { player: { select: { username: true } } },
    });

    return toFollowedPlayer(row);
  }

  public async unfollow(followerId: string, playerId: string): Promise<boolean> {
    const result = await prisma.playerFollow.deleteMany({ where: { followerId, playerId } });
    return result.count > 0;
  }

  /**
   * Pushes a single notification per follower when a tracked player goes live.
   * Players in the match are never notified about their own game.
   */
  public async notifyMatchLive(
    io: Server,
    roomId: string,
    roomName: string,
    gameType: string,
    players: { id: string; username: string }[],
  ): Promise<number> {
    if (players.length === 0) return 0;

    const playerIds = players.map((p) => p.id);
    const rows = await prisma.playerFollow.findMany({
      where: {
        playerId: { in: playerIds },
        notifyLive: true,
        followerId: { notIn: playerIds },
      },
      select: { followerId: true, playerId: true },
    });

    if (rows.length === 0) return 0;

    const nameByPlayerId = new Map(players.map((p) => [p.id, p.username]));
    const notified = new Set<string>();

    for (const row of rows) {
      if (notified.has(row.followerId)) continue;
      notified.add(row.followerId);

      const payload: MatchLiveNotification = {
        roomId,
        roomName,
        gameType,
        playerId: row.playerId,
        playerName: nameByPlayerId.get(row.playerId) || 'PLAYER',
        startedAt: Date.now(),
      };

      io.to(`user:${row.followerId}`).emit('notification:match_live', payload);
    }

    return notified.size;
  }
}

export const followService = FollowService.getInstance();
