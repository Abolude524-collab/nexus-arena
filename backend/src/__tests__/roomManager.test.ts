import { describe, it, expect, beforeEach } from 'vitest';
import { roomManager } from '../services/room.manager.js';

describe('RoomManager Service', () => {
  beforeEach(() => {
    roomManager.clearAll();
  });

  const hostUser = { id: 'user_1', username: 'HostPlayer', avatar: 'avatar_1' };
  const player2 = { id: 'user_2', username: 'GuestPlayer', avatar: 'avatar_2' };
  const player3 = { id: 'user_3', username: 'ExtraPlayer', avatar: 'avatar_3' };

  it('creates room with host as first player', () => {
    const room = roomManager.createRoom(hostUser, {
      name: 'Test Arena',
      gameType: 'Neon Dash',
      maxPlayers: 4,
    });

    expect(room.name).toBe('Test Arena');
    expect(room.hostId).toBe(hostUser.id);
    expect(room.currentPlayers).toBe(1);
    expect(room.players[0]?.id).toBe(hostUser.id);
    expect(room.players[0]?.isHost).toBe(true);
    expect(room.players[0]?.isReady).toBe(true);
  });

  it('allows second player to join room', () => {
    const room = roomManager.createRoom(hostUser, { name: 'Test Arena', maxPlayers: 4 });
    const joined = roomManager.joinRoom(room.id, player2);

    expect(joined.currentPlayers).toBe(2);
    expect(joined.players.find((p) => p.id === player2.id)).toBeDefined();
  });

  it('enforces max player capacity', () => {
    const room = roomManager.createRoom(hostUser, { name: 'Small Room', maxPlayers: 2 });
    roomManager.joinRoom(room.id, player2);

    expect(() => roomManager.joinRoom(room.id, player3)).toThrow('Room is full');
  });

  it('reassigns host when host leaves room', () => {
    const room = roomManager.createRoom(hostUser, { name: 'Test Arena', maxPlayers: 4 });
    roomManager.joinRoom(room.id, player2);

    const result = roomManager.leaveRoom(room.id, hostUser.id);
    expect(result.destroyed).toBe(false);
    expect(result.room?.hostId).toBe(player2.id);
    expect(result.room?.players[0]?.isHost).toBe(true);
  });

  it('destroys room when last player leaves', () => {
    const room = roomManager.createRoom(hostUser, { name: 'Test Arena', maxPlayers: 4 });
    const result = roomManager.leaveRoom(room.id, hostUser.id);

    expect(result.destroyed).toBe(true);
    expect(roomManager.getRoom(room.id)).toBeUndefined();
  });
});
