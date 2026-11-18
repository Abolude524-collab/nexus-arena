import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth.middleware.js';
import { roomManager } from '../services/room.manager.js';
import { gameManager } from '../game/GameManager.js';
import { emitRoomUpdate, spectateChannel } from './channels.js';
import { peerAddress, resolveViewer } from './viewer.js';
import {
  spectatorJoinSchema,
  spectatorChatSchema,
  ChatMessage,
  SpectatorCountUpdate,
  SpectatorJoinedPayload,
  SpectatorJoinResponse,
} from '../shared/index.js';
import { RateLimiter } from '../utils/rateLimiter.js';

// Join attempts and chat are rate limited per viewer. Guests are additionally
// limited per connection address so reconnecting cannot reset the allowance.
export const spectatorJoinLimiter = new RateLimiter(8, 10_000);
export const guestJoinLimiter = new RateLimiter(12, 60_000);
export const spectatorChatLimiter = new RateLimiter(2, 1_000);

const DENIED_MESSAGE = 'Match unavailable or access denied';
const CHAT_LOCKED_MESSAGE = 'Sign in to join the spectator chat';

const broadcastSpectatorCount = (io: Server, roomId: string): void => {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const update: SpectatorCountUpdate = {
    roomId,
    spectatorCount: roomManager.getSpectatorCount(roomId),
    spectatorLimit: room.spectatorLimit,
  };

  io.to(spectateChannel(roomId)).emit('spectator:count_update', update);
  // Players may also see how many people are watching
  io.to(roomId).emit('spectator:count_update', update);

  const dto = roomManager.getRoomDTO(roomId);
  if (dto) {
    // Keeps the WATCH directory and lobby fresh without extra client polling
    emitRoomUpdate(io, dto);
  }
};

export const registerSpectatorHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  // Guests reach this handler too: watching never requires an account
  const viewer = resolveViewer(socket);

  const currentSpectatingRoom = (): string | undefined => (socket as any).spectatingRoomId;

  const respond = (callback: unknown, response: SpectatorJoinResponse): void => {
    if (typeof callback === 'function') {
      (callback as (res: SpectatorJoinResponse) => void)(response);
    }
  };

  const deny = (callback: unknown, message: string, code?: string): void => {
    socket.emit('spectator:error', { message, code });
    respond(callback, { success: false, error: message });
  };

  /** Detach presence and the broadcast channel for the current session. */
  const stopWatching = (notifySelf = false): void => {
    const roomId = currentSpectatingRoom();
    if (!roomId) return;

    (socket as any).spectatingRoomId = undefined;
    socket.leave(spectateChannel(roomId));
    roomManager.removeSpectator(roomId, viewer.key, socket.id);

    if (notifySelf) {
      socket.emit('spectator:left', { roomId });
    }
    broadcastSpectatorCount(io, roomId);
  };

  socket.on('spectator:join', (payload, callback) => {
    if (!spectatorJoinLimiter.consume(`spectator-join:${viewer.key}`)) {
      deny(callback, 'Too many spectator join attempts. Please wait a moment.', 'RATE_LIMITED');
      return;
    }

    if (viewer.isGuest && !guestJoinLimiter.consume(`guest-join:${peerAddress(socket)}`)) {
      deny(callback, 'Too many connections from this network. Try again shortly.', 'RATE_LIMITED');
      return;
    }

    let parsed: { matchId: string; accessCode?: string };
    try {
      parsed = spectatorJoinSchema.parse(payload ?? {});
    } catch {
      deny(callback, 'Invalid spectator request', 'INVALID_PAYLOAD');
      return;
    }

    const room = roomManager.getRoomByCodeOrId(parsed.matchId);
    if (!room) {
      deny(callback, DENIED_MESSAGE, 'NOT_FOUND');
      return;
    }

    const denial = roomManager.getSpectatorDenialReason(room);
    if (denial) {
      deny(callback, denial, 'NOT_AVAILABLE');
      return;
    }

    // A registered player cannot watch the match they are competing in
    if (viewer.userId && room.players.some((p) => p.id === viewer.userId)) {
      deny(callback, 'You are already a player in this match', 'ALREADY_PLAYER');
      return;
    }

    if (!roomManager.verifySpectatorAccess(room, parsed.accessCode)) {
      deny(callback, DENIED_MESSAGE, 'ACCESS_DENIED');
      return;
    }

    // One spectating session per socket: switching matches releases the old seat
    if (currentSpectatingRoom() && currentSpectatingRoom() !== room.id) {
      stopWatching();
    }

    let count: number;
    try {
      count = roomManager.addSpectator(
        room.id,
        viewer.key,
        viewer.username,
        socket.id,
        viewer.isGuest,
      );
    } catch (err: any) {
      deny(callback, err?.message || 'Unable to join as spectator', 'LIMIT_REACHED');
      return;
    }

    // Only now is the socket allowed into the match's spectator broadcast channel
    socket.join(spectateChannel(room.id));
    (socket as any).spectatingRoomId = room.id;

    const game = gameManager.getGame(room.id);
    const payloadOut: SpectatorJoinedPayload = {
      room: roomManager.toSpectatorRoomInfo(room.id, {
        profilesVisible: !viewer.isGuest,
      }) as SpectatorJoinedPayload['room'],
      spectatorCount: count,
      spectatorLimit: room.spectatorLimit,
      snapshot: game ? game.getSpectatorState() : null,
      viewer: {
        isGuest: viewer.isGuest,
        canChat: !viewer.isGuest,
        canFollow: !viewer.isGuest,
        viewerHandle: viewer.handle,
      },
    };

    socket.emit('spectator:joined', payloadOut);
    respond(callback, { success: true, payload: payloadOut });
    broadcastSpectatorCount(io, room.id);
  });

  socket.on('spectator:leave', () => {
    stopWatching(true);
  });

  socket.on('spectator:chat', (payload) => {
    // Guests watch as first-class viewers but never get a chat identity
    if (viewer.isGuest || !viewer.userId) {
      socket.emit('spectator:error', {
        message: CHAT_LOCKED_MESSAGE,
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const roomId = currentSpectatingRoom();
    if (!roomId || !roomManager.isSpectator(roomId, viewer.key)) {
      socket.emit('spectator:error', { message: 'You are not spectating a match', code: 'NOT_SPECTATING' });
      return;
    }

    const room = roomManager.getRoom(roomId);
    if (!room || room.status !== 'PLAYING') {
      socket.emit('spectator:error', { message: 'This match is no longer live', code: 'NOT_LIVE' });
      return;
    }

    if (!spectatorChatLimiter.consume(`spectator-chat:${viewer.userId}`)) {
      socket.emit('spectator:error', { message: 'Chat rate limit reached. Slow down.', code: 'RATE_LIMITED' });
      return;
    }

    try {
      const validated = spectatorChatSchema.parse(payload ?? {});
      const message: ChatMessage = {
        id: `smsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        roomId,
        senderId: viewer.userId,
        senderName: viewer.username,
        content: validated.content,
        timestamp: Date.now(),
        isSystem: false,
        isSpectator: true,
      };

      // Spectator chat only reaches other spectators (never player chat)
      io.to(spectateChannel(roomId)).emit('spectator:chat_message', message);
    } catch (err: any) {
      socket.emit('spectator:error', {
        message: err?.issues?.[0]?.message || err?.message || 'Invalid spectator message',
        code: 'INVALID_PAYLOAD',
      });
    }
  });

  socket.on('disconnect', () => {
    stopWatching();
  });
};
