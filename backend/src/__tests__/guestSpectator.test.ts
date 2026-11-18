import { describe, it, expect, beforeEach } from 'vitest';
import { roomManager } from '../services/room.manager.js';
import { registerSpectatorHandlers, spectatorJoinLimiter, guestJoinLimiter, spectatorChatLimiter } from '../sockets/spectator.handlers.js';
import { registerGameHandlers } from '../sockets/game.handlers.js';
import { registerRoomHandlers } from '../sockets/room.handlers.js';
import { registerChatHandlers } from '../sockets/chat.handlers.js';
import { spectateChannel } from '../sockets/channels.js';
import { JwtPayload } from '../services/auth.service.js';

const host = { id: 'host_1', username: 'HostPlayer', avatar: 'avatar_1' };
const rival = { id: 'rival_1', username: 'RivalPlayer', avatar: 'avatar_2' };

const registeredUser = (suffix: string): JwtPayload => ({
  userId: `user_${suffix}`,
  username: `User_${suffix}`,
  email: `${suffix}@arena.test`,
  role: 'USER',
});

/** Minimal Socket.IO doubles: enough to exercise handler contracts. */
interface FakeSocket {
  id: string;
  data: Record<string, any>;
  handshake: { address: string; headers: Record<string, string> };
  rooms: Set<string>;
  handlers: Map<string, ((...args: any[]) => void)[]>;
  emitted: { event: string; payload: any }[];
  on: (event: string, handler: (...args: any[]) => void) => void;
  emit: (event: string, payload?: any) => void;
  join: (channel: string) => void;
  leave: (channel: string) => void;
  trigger: (event: string, payload?: any, callback?: any) => void;
}

let socketSeq = 0;

const makeSocket = (user?: JwtPayload, address = '127.0.0.1'): FakeSocket => {
  const handlers = new Map<string, ((...args: any[]) => void)[]>();
  const rooms = new Set<string>();
  const emitted: { event: string; payload: any }[] = [];

  const socket: FakeSocket = {
    id: `sock_${++socketSeq}`,
    data: user ? { user } : {},
    handshake: { address, headers: {} },
    rooms,
    handlers,
    emitted,
    on: (event, handler) => {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    emit: (event, payload) => {
      emitted.push({ event, payload });
    },
    join: (channel) => {
      rooms.add(channel);
    },
    leave: (channel) => {
      rooms.delete(channel);
    },
    trigger: (event, payload, callback) => {
      for (const handler of handlers.get(event) ?? []) {
        handler(payload, callback);
      }
    },
  };

  return socket;
};

const makeIo = () => {
  const emissions: { channel: string; event: string; payload: any }[] = [];
  const io = {
    to: (channel: string) => ({
      emit: (event: string, payload: any) => emissions.push({ channel, event, payload }),
    }),
    emit: (event: string, payload: any) => emissions.push({ channel: 'global', event, payload }),
    in: () => ({ socketsLeave: () => undefined }),
    emissions,
  };
  return io as any;
};

const createLiveRoom = (overrides: Record<string, unknown> = {}) => {
  const room = roomManager.createRoom(host, {
    name: 'Guest Arena',
    gameType: 'Neon Dash',
    maxPlayers: 4,
    ...overrides,
  } as any);
  try {
    roomManager.joinRoom(room.id, rival);
  } catch {
    // Private rooms need their password, which is irrelevant here
  }
  roomManager.updateStatus(room.id, 'PLAYING');
  return room;
};

const joinAsSpectator = (socket: FakeSocket, matchId: string, accessCode?: string) => {
  let response: any;
  socket.trigger('spectator:join', { matchId, accessCode }, (res: any) => {
    response = res;
  });
  return response;
};

beforeEach(() => {
  roomManager.clearAll();
  spectatorJoinLimiter.reset();
  guestJoinLimiter.reset();
  spectatorChatLimiter.reset();
});

describe('Guest spectator access', () => {
  it('lets an unauthenticated visitor watch a public live match', () => {
    const room = createLiveRoom();
    const io = makeIo();
    const guest = makeSocket();

    registerSpectatorHandlers(io, guest as any);
    const response = joinAsSpectator(guest, room.id);

    expect(response.success).toBe(true);
    expect(response.payload.viewer.isGuest).toBe(true);
    expect(response.payload.viewer.canChat).toBe(false);
    expect(response.payload.viewer.canFollow).toBe(false);
    // Anonymous viewers never receive stable player identifiers
    expect(response.payload.room.profilesVisible).toBe(false);
    expect(response.payload.room.players.map((p: any) => p.id)).toEqual(['seat_1', 'seat_2']);
    expect(guest.rooms.has(spectateChannel(room.id))).toBe(true);
    expect(roomManager.getSpectatorCount(room.id)).toBe(1);
  });

  it('gives registered viewers full profile data and chat rights', () => {
    const room = createLiveRoom();
    const io = makeIo();
    const member = makeSocket(registeredUser('a'));

    registerSpectatorHandlers(io, member as any);
    const response = joinAsSpectator(member, room.id);

    expect(response.success).toBe(true);
    expect(response.payload.viewer).toMatchObject({ isGuest: false, canChat: true, canFollow: true });
    expect(response.payload.room.profilesVisible).toBe(true);
    expect(response.payload.room.players[0].id).toBe(host.id);
  });

  it('keeps a private match sealed until the spectator code is supplied', () => {
    const room = createLiveRoom({ visibility: 'PRIVATE', password: 'join-secret' });
    const code = roomManager.getSpectatorAccessCode(room.id, host.id);
    const io = makeIo();

    const blocked = makeSocket();
    registerSpectatorHandlers(io, blocked as any);
    expect(joinAsSpectator(blocked, room.id).success).toBe(false);
    expect(roomManager.getSpectatorCount(room.id)).toBe(0);

    const authorised = makeSocket();
    registerSpectatorHandlers(io, authorised as any);
    const response = joinAsSpectator(authorised, room.id, code);

    expect(response.success).toBe(true);
    expect(roomManager.getSpectatorCount(room.id)).toBe(1);
  });

  it('keeps unlisted matches out of the public directory while allowing link access', () => {
    const room = createLiveRoom({ visibility: 'UNLISTED' });
    expect(roomManager.listLiveMatches()).toHaveLength(0);
    expect(roomManager.getLiveMatchSummary(room.id)).toBeUndefined();

    const io = makeIo();
    const guest = makeSocket();
    registerSpectatorHandlers(io, guest as any);

    // The link alone is not authorisation: the host's code is still required
    expect(joinAsSpectator(guest, room.id).success).toBe(false);
    const code = roomManager.getSpectatorAccessCode(room.id, host.id);
    expect(joinAsSpectator(guest, room.id, code).success).toBe(true);
  });

  it('never grants a guest player powers', () => {
    const guest = makeSocket();
    const io = makeIo();

    registerGameHandlers(io, guest as any);
    registerRoomHandlers(io, guest as any);
    registerChatHandlers(io, guest as any);

    // Player-only handlers are not even attached to a guest socket
    for (const event of [
      'game:start',
      'game:input',
      'reaction:click',
      'territory:input',
      'word:submit',
      'room:create',
      'room:join',
      'chat:send',
    ]) {
      expect(guest.handlers.has(event)).toBe(false);
    }
  });

  it('cleans up guest presence when the connection drops', () => {
    const room = createLiveRoom();
    const io = makeIo();
    const guest = makeSocket();

    registerSpectatorHandlers(io, guest as any);
    joinAsSpectator(guest, room.id);
    expect(roomManager.getSpectatorCount(room.id)).toBe(1);

    guest.trigger('disconnect');

    expect(roomManager.getSpectatorCount(room.id)).toBe(0);
    expect(roomManager.listSpectators(room.id)).toHaveLength(0);
  });

  it('counts one seat per registered viewer across multiple tabs', () => {
    const room = createLiveRoom();
    const io = makeIo();
    const user = registeredUser('tabs');

    const first = makeSocket(user);
    const second = makeSocket(user);
    registerSpectatorHandlers(io, first as any);
    registerSpectatorHandlers(io, second as any);

    joinAsSpectator(first, room.id);
    joinAsSpectator(second, room.id);
    expect(roomManager.getSpectatorCount(room.id)).toBe(1);

    // Closing one tab keeps the seat while the other socket is still watching
    first.trigger('disconnect');
    expect(roomManager.getSpectatorCount(room.id)).toBe(1);

    second.trigger('disconnect');
    expect(roomManager.getSpectatorCount(room.id)).toBe(0);
  });

  it('reports an accurate mixed guest + registered spectator count', () => {
    const room = createLiveRoom();
    const io = makeIo();
    const guest = makeSocket();
    const member = makeSocket(registeredUser('counted'));

    registerSpectatorHandlers(io, guest as any);
    registerSpectatorHandlers(io, member as any);

    joinAsSpectator(guest, room.id);
    joinAsSpectator(member, room.id);

    expect(roomManager.getSpectatorCount(room.id)).toBe(2);
    expect(roomManager.getLiveMatchSummary(room.id)?.spectatorCount).toBe(2);

    const countEvents = io.emissions.filter((e: any) => e.event === 'spectator:count_update');
    expect(countEvents[countEvents.length - 1]?.payload.spectatorCount).toBe(2);
  });
});

describe('Spectator chat permissions', () => {
  it('refuses guest chat and keeps the message off the wire', () => {
    const room = createLiveRoom();
    const io = makeIo();
    const guest = makeSocket();

    registerSpectatorHandlers(io, guest as any);
    joinAsSpectator(guest, room.id);

    guest.trigger('spectator:chat', { content: 'hello arena' });

    const error = guest.emitted.find((e) => e.event === 'spectator:error');
    expect(error?.payload).toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(io.emissions.some((e: any) => e.event === 'spectator:chat_message')).toBe(false);
  });

  it('delivers registered spectator chat only to the spectator channel', () => {
    const room = createLiveRoom();
    const io = makeIo();
    const member = makeSocket(registeredUser('chatty'));

    registerSpectatorHandlers(io, member as any);
    joinAsSpectator(member, room.id);
    member.trigger('spectator:chat', { content: 'great match' });

    const message = io.emissions.find((e: any) => e.event === 'spectator:chat_message');
    expect(message?.channel).toBe(spectateChannel(room.id));
    expect(message?.payload).toMatchObject({
      senderName: 'User_chatty',
      content: 'great match',
      isSpectator: true,
    });
    // Player chat is a different channel and never sees spectator messages
    expect(io.emissions.some((e: any) => e.channel === room.id && e.event === 'spectator:chat_message')).toBe(false);
  });

  it('rejects chat from a registered user who is not watching', () => {
    const io = makeIo();
    const member = makeSocket(registeredUser('idle'));

    registerSpectatorHandlers(io, member as any);
    member.trigger('spectator:chat', { content: 'nobody hears me' });

    expect(member.emitted[member.emitted.length - 1]?.payload).toMatchObject({ code: 'NOT_SPECTATING' });
  });
});

describe('Guest rate limiting', () => {
  it('caps repeated join attempts from one connection', () => {
    const room = createLiveRoom();
    const io = makeIo();

    const guest = makeSocket(undefined, '203.0.113.9');
    registerSpectatorHandlers(io, guest as any);

    for (let i = 0; i < 8; i += 1) {
      joinAsSpectator(guest, room.id);
    }
    const blocked = joinAsSpectator(guest, room.id);

    expect(blocked.success).toBe(false);
    expect(blocked.error).toMatch(/Too many spectator join attempts/);
  });

  it('caps guest joins per network address across sockets', () => {
    const room = createLiveRoom();
    const io = makeIo();

    for (let i = 0; i < 12; i += 1) {
      const guest = makeSocket(undefined, '198.51.100.7');
      registerSpectatorHandlers(io, guest as any);
      joinAsSpectator(guest, room.id);
    }

    const extra = makeSocket(undefined, '198.51.100.7');
    registerSpectatorHandlers(io, extra as any);
    const blocked = joinAsSpectator(extra, room.id);

    expect(blocked.success).toBe(false);
    expect(blocked.error).toMatch(/Too many connections/);
  });
});

describe('Spectator isolation', () => {
  it('refuses to seat a registered player of the same match', () => {
    const room = createLiveRoom();
    const io = makeIo();
    const playerSocket = makeSocket({
      userId: host.id,
      username: host.username,
      email: 'host@arena.test',
      role: 'USER',
    });

    registerSpectatorHandlers(io, playerSocket as any);
    const response = joinAsSpectator(playerSocket, room.id);

    expect(response.success).toBe(false);
    expect(roomManager.getSpectatorCount(room.id)).toBe(0);
  });

  it('does not advertise matches with spectating disabled', () => {
    const room = createLiveRoom({ allowSpectators: false });
    const io = makeIo();
    const guest = makeSocket();

    registerSpectatorHandlers(io, guest as any);
    expect(joinAsSpectator(guest, room.id).success).toBe(false);
    expect(roomManager.listLiveMatches()).toHaveLength(0);
  });

  it('releases the previous seat when a socket switches matches', () => {
    const first = createLiveRoom({ name: 'First' });
    const second = createLiveRoom({ name: 'Second' });
    const io = makeIo();
    const guest = makeSocket();

    registerSpectatorHandlers(io, guest as any);
    joinAsSpectator(guest, first.id);
    joinAsSpectator(guest, second.id);

    expect(roomManager.getSpectatorCount(first.id)).toBe(0);
    expect(roomManager.getSpectatorCount(second.id)).toBe(1);
    expect(guest.rooms.has(spectateChannel(first.id))).toBe(false);
  });
});

describe('Spectator-safe room projection', () => {
  it('never leaks room codes or access codes to guests', () => {
    const room = createLiveRoom({ visibility: 'PRIVATE', password: 'join-secret' });
    roomManager.getSpectatorAccessCode(room.id, host.id);

    const info = roomManager.toSpectatorRoomInfo(room.id, { profilesVisible: false }) as any;

    expect(info.id).toBe(room.id);
    expect(info.code).toBeUndefined();
    expect(info.passwordHash).toBeUndefined();
    expect(info.spectatorAccessCode).toBeUndefined();
    expect(info.spectatorAccessCodeHash).toBeUndefined();
    expect(info.profilesVisible).toBe(false);
  });

  it('marks public directory entries as guest accessible', () => {
    const room = createLiveRoom();
    const [summary] = roomManager.listLiveMatches();
    expect(summary.id).toBe(room.id);
    expect(summary.guestAccess).toBe(true);
  });
});
