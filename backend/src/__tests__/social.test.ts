import { describe, it, expect, beforeEach, vi } from 'vitest';

interface FollowRow {
  followerId: string;
  playerId: string;
  isFavourite: boolean;
  notifyLive: boolean;
  createdAt: Date;
}

const store = {
  users: [
    { id: 'user_a', username: 'Alpha' },
    { id: 'user_b', username: 'Bravo' },
    { id: 'user_c', username: 'Charlie' },
    { id: 'user_d', username: 'Delta' },
  ],
  follows: [] as FollowRow[],
};

vi.mock('../db/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: any) =>
        store.users.find((user) => user.id === where.id) ?? null,
    },
    playerFollow: {
      findMany: async ({ where }: any) => {
        const playerIds: string[] = where?.playerId?.in ?? [];
        const excluded: string[] = where?.followerId?.notIn ?? [];

        const rows = store.follows.filter((row) => {
          // `followerId` is either an equality filter or a `{ notIn }` exclusion
          if (typeof where?.followerId === 'string' && row.followerId !== where.followerId) {
            return false;
          }
          if (playerIds.length > 0 && !playerIds.includes(row.playerId)) return false;
          if (excluded.includes(row.followerId)) return false;
          if (where?.notifyLive === true && !row.notifyLive) return false;
          return true;
        });

        // Shape mirrors the `include: { player }` projection used by the service
        return rows.map((row) => ({
          ...row,
          player: {
            username: store.users.find((user) => user.id === row.playerId)?.username ?? 'PLAYER',
          },
        }));
      },
      findUnique: async ({ where }: any) => {
        const key = where.followerId_playerId;
        const row = store.follows.find(
          (entry) => entry.followerId === key.followerId && entry.playerId === key.playerId,
        );
        return row ? { id: `${row.followerId}:${row.playerId}` } : null;
      },
      count: async ({ where }: any) =>
        store.follows.filter((row) => row.followerId === where.followerId).length,
      upsert: async ({ where, create, update }: any) => {
        const key = where.followerId_playerId;
        const existing = store.follows.find(
          (entry) => entry.followerId === key.followerId && entry.playerId === key.playerId,
        );

        let row: FollowRow;
        if (existing) {
          Object.assign(existing, update);
          row = existing;
        } else {
          row = { ...create, createdAt: new Date('2026-01-01T00:00:00.000Z') };
          store.follows.push(row);
        }

        return {
          ...row,
          player: {
            username: store.users.find((user) => user.id === row.playerId)?.username ?? 'PLAYER',
          },
        };
      },
      deleteMany: async ({ where }: any) => {
        const before = store.follows.length;
        store.follows = store.follows.filter(
          (row) => !(row.followerId === where.followerId && row.playerId === where.playerId),
        );
        return { count: before - store.follows.length };
      },
    },
  },
}));

const { followService } = await import('../services/follow.service.js');

const makeIo = () => {
  const emissions: { channel: string; event: string; payload: any }[] = [];
  const io = {
    to: (channel: string) => ({
      emit: (event: string, payload: any) => emissions.push({ channel, event, payload }),
    }),
    emissions,
  };
  return io as any;
};

beforeEach(() => {
  store.follows = [];
});

describe('Follow service', () => {
  it('creates a follow with notification enabled by default', async () => {
    const follow = await followService.follow('user_a', 'user_b');

    expect(follow).toMatchObject({
      playerId: 'user_b',
      username: 'Bravo',
      isFavourite: false,
      notifyLive: true,
    });
  });

  it('updates flags on an existing follow without duplicating it', async () => {
    await followService.follow('user_a', 'user_b');
    const updated = await followService.follow('user_a', 'user_b', {
      isFavourite: true,
      notifyLive: false,
    });

    expect(store.follows).toHaveLength(1);
    expect(updated).toMatchObject({ isFavourite: true, notifyLive: false });
  });

  it('refuses self-follow and unknown players', async () => {
    await expect(followService.follow('user_a', 'user_a')).rejects.toThrow(/cannot follow yourself/i);
    await expect(followService.follow('user_a', 'user_missing')).rejects.toThrow(/Player not found/i);
  });

  it('removes a follow', async () => {
    await followService.follow('user_a', 'user_b');
    expect(await followService.unfollow('user_a', 'user_b')).toBe(true);
    expect(store.follows).toHaveLength(0);
    expect(await followService.unfollow('user_a', 'user_b')).toBe(false);
  });
});

describe('Match-live notifications', () => {
  it('notifies each follower once and skips players in the match', async () => {
    // user_a is playing, so following a teammate must not notify them
    await followService.follow('user_a', 'user_b');
    // user_c follows both players: still a single notification
    await followService.follow('user_c', 'user_b');
    await followService.follow('user_c', 'user_a');
    await followService.follow('user_d', 'user_b');

    const io = makeIo();
    const notified = await followService.notifyMatchLive(io, 'room_1', 'Finals', 'Neon Dash', [
      { id: 'user_a', username: 'Alpha' },
      { id: 'user_b', username: 'Bravo' },
    ]);

    const liveEvents = io.emissions.filter((e: any) => e.event === 'notification:match_live');
    expect(liveEvents).toHaveLength(2);
    expect(notified).toBe(2);
    expect(liveEvents.map((e: any) => e.channel).sort()).toEqual(['user:user_c', 'user:user_d']);
    expect(liveEvents[0]?.payload).toMatchObject({ roomId: 'room_1', gameType: 'Neon Dash' });
  });

  it('sends nothing when no follower has notifications enabled', async () => {
    await followService.follow('user_a', 'user_b', { notifyLive: false });

    const io = makeIo();
    const notified = await followService.notifyMatchLive(io, 'room_1', 'Finals', 'Territory', [
      { id: 'user_b', username: 'Bravo' },
    ]);

    expect(notified).toBe(0);
    expect(io.emissions).toHaveLength(0);
  });
});
