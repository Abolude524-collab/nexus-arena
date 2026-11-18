import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth.middleware.js';
import { gameManager } from '../game/GameManager.js';
import { roomManager } from '../services/room.manager.js';

export const registerGameHandlers = (_io: Server, socket: AuthenticatedSocket): void => {
  const user = socket.data.user;
  if (!user) return;

  /**
   * Player-only actions require membership of the room channel. Spectator sockets
   * only ever join the separate spectate channel, so they are rejected here even
   * if they forge a room id in the payload.
   */
  const playerRoomId = (): string | undefined => {
    const roomId = (socket as any).currentRoomId;
    if (!roomId) return undefined;
    if (!socket.rooms.has(roomId)) return undefined;
    return roomId;
  };

  socket.on('game:start', () => {
    const roomId = playerRoomId();
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) {
      socket.emit('system:error', { message: 'Room not found' });
      return;
    }

    if (room.hostId !== user.userId) {
      socket.emit('system:error', { message: 'Only the host can start the match' });
      return;
    }

    if (room.players.length < 2) {
      socket.emit('system:error', { message: 'Minimum 2 players required to start match' });
      return;
    }

    try {
      const playerInits = room.players.map((p) => ({ id: p.id, username: p.username }));
      gameManager.startGame(roomId, playerInits);
    } catch (err: any) {
      socket.emit('system:error', { message: err.message || 'Failed to start match' });
    }
  });

  socket.on('game:input', (input) => {
    const roomId = playerRoomId();
    if (!roomId) return;

    gameManager.handleInput(roomId, user.userId, input);
  });

  socket.on('reaction:click', (payload) => {
    const roomId = playerRoomId();
    if (!roomId || !payload) return;

    gameManager.handleReactionClick(roomId, user.userId, payload.roundId, payload.targetId);
  });

  socket.on('territory:input', (input) => {
    const roomId = playerRoomId();
    if (!roomId || !input) return;

    gameManager.handleInput(roomId, user.userId, {
      up: !!input.up,
      down: !!input.down,
      left: !!input.left,
      right: !!input.right,
      sequence: 0,
    });
  });

  socket.on('word:submit', (payload) => {
    const roomId = playerRoomId();
    if (!roomId || !payload) return;

    gameManager.handleWordSubmit(roomId, user.userId, payload.roundId, payload.answer);
  });
};
