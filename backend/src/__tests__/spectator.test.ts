import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RoomManager, roomManager } from '../services/room.manager.js';
import { WordBlitz } from '../game/WordBlitz.js';
import { ReactionRush } from '../game/ReactionRush.js';
import { NeonDash } from '../game/NeonDash.js';
import { Territory } from '../game/Territory.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { emitRoomUpdate } from '../sockets/channels.js';

const host = { id: 'host_1', username: 'HostPlayer', avatar: 'avatar_1' };
const guest = { id: 'guest_1', username: 'GuestPlayer', avatar: 'avatar_2' };
const watcher = { id: 'spec_1', username: 'WatcherOne' };

/** Creates a room and moves it into the live PLAYING state used by the directory. */
const createLiveRoom = (overrides: Partial<Parameters<typeof roomManager.createRoom>[1]> = {}) => {
  const room = roomManager.createRoom(host, {
    name: 'Live Arena',
    gameType: 'Neon Dash',
    maxPlayers: 4,
    ...overrides,
  });
  try {
    roomManager.joinRoom(room.id, guest);
  } catch {
    // Private rooms require their password, which is irrelevant to these cases
  }
  roomManager.updateStatus(room.id, 'PLAYING');
  return room;
};

describe('WATCH directory', () => {
  beforeEach(() => {
    roomManager.clearAll();
  });

  it('lists only live, public, spectatable matches', () => {
    const live = createLiveRoom({ name: 'Public Brawl' });

    const privateRoom = createLiveRoom({
      name: 'Private Brawl',
      visibility: 'PRIVATE',
      password: 'secret',
    });
    const unlisted = createLiveRoom({ name: 'Unlisted Brawl', visibility: 'UNLISTED' });
    const noSpectators = createLiveRoom({ name: 'Locked Brawl', allowSpectators: false });
    const waiting = roomManager.createRoom(host, { name: 'Warmup', maxPlayers: 4 });

    const listedIds = roomManager.listLiveMatches().map((match) => match.id);

    expect(listedIds).toEqual([live.id]);
    expect(listedIds).not.toContain(privateRoom.id);
    expect(listedIds).not.toContain(unlisted.id);
    expect(listedIds).not.toContain(noSpectators.id);
    expect(listedIds).not.toContain(waiting.id);
  });

  it('filters by stable game type and searches public metadata only', () => {
    const dash = createLiveRoom({ name: 'Dash Room', gameType: 'Neon Dash' });
    const words = createLiveRoom({ name: 'Words Room', gameType: 'Word Blitz' });
    createLiveRoom({ name: 'Hidden Words', gameType: 'Word Blitz', visibility: 'PRIVATE' });

    expect(roomManager.listLiveMatches({ gameType: 'Word Blitz' }).map((m) => m.id)).toEqual([
      words.id,
    ]);

    const searched = roomManager.listLiveMatches({ search: 'dash' });
    expect(searched.map((m) => m.id)).toEqual([dash.id]);

    // Private matches are never returned by search
    expect(roomManager.listLiveMatches({ search: 'hidden' })).toHaveLength(0);
  });

  it('exposes game identifiers and live spectator counts in summaries', () => {
    const live = createLiveRoom({ name: 'Counted Arena', gameType: 'Reaction Rush' });
    roomManager.addSpectator(live.id, watcher.id, watcher.username, 'sock_w1');

    const [summary] = roomManager.listLiveMatches();
    expect(summary.gameId).toBe('reaction-rush');
    expect(summary.playerCount).toBe(2);
    expect(summary.spectatorCount).toBe(1);
    expect(summary.hostName).toBe(host.username);
    expect(summary.startedAt).toBeTruthy();
  });

  it('returns spectator-info only for public live matches', () => {
    const live = createLiveRoom();
    const privateRoom = createLiveRoom({
      name: 'Private Info',
      visibility: 'PRIVATE',
      password: 'secret',
    });

    expect(roomManager.getLiveMatchSummary(live.id)?.id).toBe(live.id);
    expect(roomManager.getLiveMatchSummary(privateRoom.id)).toBeUndefined();
  });
});

describe('Spectator access control', () => {
  beforeEach(() => {
    roomManager.clearAll();
  });

  it('requires the access code for private matches and rejects room-id knowledge', () => {
    const room = roomManager.createRoom(host, {
      name: 'Private Arena',
      visibility: 'PRIVATE',
      password: 'pw',
      maxPlayers: 4,
    });
    roomManager.updateStatus(room.id, 'PLAYING');
    const instance = roomManager.getRoom(room.id)!;

    expect(roomManager.getSpectatorDenialReason(instance)).toBeNull();
    // Knowing the room ID is not authorization
    expect(roomManager.verifySpectatorAccess(instance)).toBe(false);
    expect(roomManager.verifySpectatorAccess(instance, 'GUESSED1')).toBe(false);

    const code = roomManager.getSpectatorAccessCode(room.id, host.id);
    expect(code).toHaveLength(10);
    expect(roomManager.verifySpectatorAccess(instance, code)).toBe(true);

    expect(roomManager.findSpectatorMatchByCodeHash(RoomManager.hashAccessCode(code))?.id).toBe(
      room.id,
    );
    expect(
      roomManager.findSpectatorMatchByCodeHash(RoomManager.hashAccessCode('WRONGCODE1')),
    ).toBeUndefined();
  });

  it('keeps unlisted matches out of listings but reachable by code', () => {
    const room = roomManager.createRoom(host, {
      name: 'Unlisted Arena',
      visibility: 'UNLISTED',
      maxPlayers: 4,
    });
    roomManager.updateStatus(room.id, 'PLAYING');

    expect(roomManager.listLiveMatches()).toHaveLength(0);

    const code = roomManager.getSpectatorAccessCode(room.id, host.id);
    expect(roomManager.findSpectatorMatchByCodeHash(RoomManager.hashAccessCode(code))?.id).toBe(
      room.id,
    );
  });

  it('never exposes secrets in client DTOs', () => {
    const room = roomManager.createRoom(host, {
      name: 'Secret Arena',
      visibility: 'PRIVATE',
      password: 'pw',
      maxPlayers: 4,
    });
    roomManager.getSpectatorAccessCode(room.id, host.id);

    const dto = roomManager.getRoomDTO(room.id) as any;
    expect(dto.passwordHash).toBeUndefined();
    expect(dto.spectatorAccessCode).toBeUndefined();
    expect(dto.spectatorAccessCodeHash).toBeUndefined();
    expect(dto.visibility).toBe('PRIVATE');
    expect(dto.allowSpectators).toBe(true);
  });

  it('restricts spectator settings and code retrieval to the host', () => {
    const room = roomManager.createRoom(host, {
      name: 'Host Rules',
      visibility: 'PRIVATE',
      password: 'pw',
      maxPlayers: 4,
    });
    roomManager.joinRoom(room.id, guest, 'pw');

    expect(() =>
      roomManager.setSpectatorSettings(room.id, guest.id, { allowSpectators: false }),
    ).toThrow();
    expect(() => roomManager.getSpectatorAccessCode(room.id, guest.id)).toThrow();

    const updated = roomManager.setSpectatorSettings(room.id, host.id, {
      allowSpectators: false,
      spectatorLimit: 5,
    });
    expect(updated.allowSpectators).toBe(false);
    expect(updated.spectatorLimit).toBe(5);
  });

  it('reports a denial reason when the match is not live or spectating is disabled', () => {
    const room = roomManager.createRoom(host, { name: 'Denied Arena', maxPlayers: 4 });
    const instance = roomManager.getRoom(room.id)!;

    expect(roomManager.getSpectatorDenialReason(instance)).toBe('This match is not live right now');

    roomManager.updateStatus(room.id, 'PLAYING');
    roomManager.setSpectatorSettings(room.id, host.id, { allowSpectators: false });
    expect(roomManager.getSpectatorDenialReason(instance)).toBe(
      'Spectating is disabled for this match',
    );
  });
});

describe('Spectator presence', () => {
  beforeEach(() => {
    roomManager.clearAll();
  });

  it('uses no player slots and enforces the spectator limit', () => {
    const room = createLiveRoom({ name: 'Capacity Arena', spectatorLimit: 2 });
    const dtoBefore = roomManager.getRoomDTO(room.id)!;

    expect(roomManager.addSpectator(room.id, 'spec_a', 'WatcherA', 'sock_a')).toBe(1);
    expect(roomManager.addSpectator(room.id, 'spec_b', 'WatcherB', 'sock_b')).toBe(2);
    expect(() => roomManager.addSpectator(room.id, 'spec_c', 'WatcherC', 'sock_c')).toThrow(
      'Spectator limit reached',
    );

    const dtoAfter = roomManager.getRoomDTO(room.id)!;
    expect(dtoAfter.currentPlayers).toBe(dtoBefore.currentPlayers);
    expect(dtoAfter.players).toHaveLength(2);
    expect(dtoAfter.spectatorCount).toBe(2);
  });

  it('deduplicates the same spectator across tabs and releases on final disconnect', () => {
    const room = createLiveRoom();

    expect(roomManager.addSpectator(room.id, watcher.id, watcher.username, 'sock_1')).toBe(1);
    expect(roomManager.addSpectator(room.id, watcher.id, watcher.username, 'sock_2')).toBe(1);

    expect(roomManager.removeSpectator(room.id, watcher.id, 'sock_1')).toBe(1);
    expect(roomManager.isSpectator(room.id, watcher.id)).toBe(true);

    expect(roomManager.removeSpectator(room.id, watcher.id, 'sock_2')).toBe(0);
    expect(roomManager.isSpectator(room.id, watcher.id)).toBe(false);
  });

  it('drops spectator membership when the user takes a player slot', () => {
    const room = roomManager.createRoom(host, { name: 'Switch Arena', maxPlayers: 4 });
    roomManager.addSpectator(room.id, guest.id, guest.username, 'sock_g');
    expect(roomManager.isSpectator(room.id, guest.id)).toBe(true);

    roomManager.joinRoom(room.id, guest);
    expect(roomManager.isSpectator(room.id, guest.id)).toBe(false);
    expect(roomManager.getRoom(room.id)!.players.some((p) => p.id === guest.id)).toBe(true);
  });

  it('clears all spectators when the room is destroyed', () => {
    const room = roomManager.createRoom(host, { name: 'Closing Arena', maxPlayers: 4 });
    roomManager.addSpectator(room.id, watcher.id, watcher.username, 'sock_1');

    roomManager.leaveRoom(room.id, host.id);
    expect(roomManager.getSpectatorCount(room.id)).toBe(0);
  });
});

describe('WATCH privacy gates', () => {
  beforeEach(() => {
    roomManager.clearAll();
  });

  it('never advertises or admits a zero-capacity match', () => {
    const room = createLiveRoom({ name: 'No Seats', spectatorLimit: 0 });
    const instance = roomManager.getRoom(room.id)!;

    expect(roomManager.listLiveMatches()).toHaveLength(0);
    expect(roomManager.getLiveMatchSummary(room.id)).toBeUndefined();
    expect(roomManager.getSpectatorDenialReason(instance)).toBe(
      'Spectating is disabled for this match',
    );
    expect(() => roomManager.addSpectator(room.id, 'spec_x', 'WatcherX', 'sock_x')).toThrow(
      'Spectator limit reached',
    );
  });

  it('keeps private and unlisted rooms out of the global lobby broadcast', () => {
    const calls: { scope: string; event: string }[] = [];
    const io = {
      to: (scope: string) => ({ emit: (event: string) => calls.push({ scope, event }) }),
      emit: (event: string) => calls.push({ scope: 'global', event }),
    } as any;

    emitRoomUpdate(io, { id: 'room_public', visibility: 'PUBLIC' });
    emitRoomUpdate(io, { id: 'room_private', visibility: 'PRIVATE' });
    emitRoomUpdate(io, { id: 'room_unlisted', visibility: 'UNLISTED' });

    expect(calls).toEqual([
      { scope: 'room_public', event: 'room:updated' },
      { scope: 'global', event: 'room:updated' },
      { scope: 'room_private', event: 'room:updated' },
      { scope: 'room_unlisted', event: 'room:updated' },
    ]);
  });

  it('describes a room for spectators without exposing codes or player identities internals', () => {
    const room = createLiveRoom({ name: 'Described Arena' });
    const info = roomManager.toSpectatorRoomInfo(room.id) as any;

    expect(info.id).toBe(room.id);
    expect(info.code).toBeUndefined();
    expect(info.passwordHash).toBeUndefined();
    expect(info.spectatorAccessCodeHash).toBeUndefined();
    expect(info.players[0]).toEqual({
      id: host.id,
      username: host.username,
      avatar: host.avatar,
    });
  });
});

describe('Spectator rate limiting', () => {
  it('blocks attempts past the window allowance and recovers afterwards', () => {
    const limiter = new RateLimiter(2, 1000);

    expect(limiter.consume('user', 0)).toBe(true);
    expect(limiter.consume('user', 10)).toBe(true);
    expect(limiter.consume('user', 20)).toBe(false);
    // A different key has its own allowance
    expect(limiter.consume('other', 20)).toBe(true);
    // The window slides past the first two attempts
    expect(limiter.consume('user', 1500)).toBe(true);
  });
});

describe('Spectator-safe game projections', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Word Blitz withholds the answer until the round is revealed', () => {
    vi.useFakeTimers();
    const game = new WordBlitz('room_test');
    game.initialize([
      { id: 'user_1', username: 'PlayerOne' },
      { id: 'user_2', username: 'PlayerTwo' },
    ]);

    vi.advanceTimersByTime(3000);
    const answer = game.getState().challenge!.prompt;

    const active = game.getSpectatorState();
    expect(active.state.status).toBe('ROUND_ACTIVE');
    expect(active.state.challenge.prompt).toBeNull();
    expect(active.state.challenge.promptLength).toBe(answer.length);
    expect(active.state.challenge.id).toBeTruthy();

    game.handleSubmit('user_1', 1, answer);
    vi.advanceTimersByTime(10000);

    const revealed = game.getSpectatorState();
    expect(revealed.state.status).toBe('ROUND_END');
    expect(revealed.state.challenge.prompt).toBe(answer);
  });

  it('Reaction Rush hides target timing and round results until revealed', () => {
    vi.useFakeTimers();
    const game = new ReactionRush('room_test');
    game.initialize([
      { id: 'user_1', username: 'PlayerOne' },
      { id: 'user_2', username: 'PlayerTwo' },
    ]);

    vi.advanceTimersByTime(3000); // ARMED
    expect(game.getSpectatorState().state.target).toBeNull();

    while (game.getState().status === 'ARMED') {
      vi.advanceTimersByTime(50);
    }

    const active = game.getSpectatorState();
    expect(active.state.target).not.toBeNull();
    expect(active.state.target.activatedAt).toBeUndefined();
    expect(active.state.target.expiresAt).toBeUndefined();
    expect(active.state.roundWinnerId).toBeNull();
    expect(active.state.players[0].lastReactionMs).toBeUndefined();

    const target = game.getState().target!;
    game.handleClick('user_1', 1, target.id);

    const result = game.getSpectatorState();
    expect(result.state.status).toBe('ROUND_RESULT');
    expect(result.state.roundWinnerId).toBe('user_1');
    expect(result.state.players[0].lastReactionMs).toBeTypeOf('number');
  });

  it('Neon Dash projects positions without connection internals', () => {
    vi.useFakeTimers();
    const game = new NeonDash('room_test');
    game.initialize([
      { id: 'user_1', username: 'PlayerOne' },
      { id: 'user_2', username: 'PlayerTwo' },
    ]);

    const snapshot = game.getSpectatorState();
    expect(snapshot.gameType).toBe('Neon Dash');
    expect(snapshot.state.players).toHaveLength(2);
    expect(snapshot.state.players[0].x).toBeTypeOf('number');
    expect(snapshot.state.players[0].y).toBeTypeOf('number');
    expect(snapshot.state.players[0].connected).toBeUndefined();
    expect(Array.isArray(snapshot.state.collectibles)).toBe(true);
    expect(Array.isArray(snapshot.state.obstacles)).toBe(true);
  });

  it('Territory projects the shared grid and public player state', () => {
    vi.useFakeTimers();
    const game = new Territory('room_test');
    game.initialize([
      { id: 'user_1', username: 'PlayerOne' },
      { id: 'user_2', username: 'PlayerTwo' },
    ]);

    const snapshot = game.getSpectatorState();
    expect(snapshot.gameType).toBe('Territory');
    expect(snapshot.state.cells).toHaveLength(100);
    expect(snapshot.state.players).toHaveLength(2);
    expect(snapshot.state.players[0].gridX).toBeTypeOf('number');
    expect(snapshot.roomId).toBe('room_test');
    expect(snapshot.serverTime).toBeTypeOf('number');
  });
});
