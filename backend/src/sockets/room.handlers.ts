import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth.middleware.js';
import { roomManager } from '../services/room.manager.js';
import { createRoomSchema, joinRoomSchema } from '../shared/index.js';

export const registerRoomHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  const user = socket.data.user;

  if (!user) {
    return;
  }

  socket.on('room:create', (payload, callback) => {
    try {
      const validated = createRoomSchema.parse(payload);
      const room = roomManager.createRoom(
        { id: user.userId, username: user.username, avatar: 'avatar_1' },
        validated,
      );

      socket.join(room.id);
      (socket as any).currentRoomId = room.id;

      if (callback) callback({ success: true, room });
      io.emit('room:updated', room);
    } catch (err: any) {
      if (callback) callback({ success: false, error: err.message || 'Invalid room creation inputs' });
    }
  });

  socket.on('room:join', (payload, callback) => {
    try {
      const validated = joinRoomSchema.parse(payload);
      const room = roomManager.joinRoom(
        validated.roomIdOrCode,
        { id: user.userId, username: user.username, avatar: 'avatar_1' },
        validated.password,
      );

      socket.join(room.id);
      (socket as any).currentRoomId = room.id;

      if (callback) callback({ success: true, room });

      io.to(room.id).emit('room:player_joined', {
        room,
        userId: user.userId,
        username: user.username,
      });

      io.emit('room:updated', room);
    } catch (err: any) {
      if (callback) callback({ success: false, error: err.message || 'Invalid room join inputs' });
    }
  });

  socket.on('room:leave', () => {
    const roomId = (socket as any).currentRoomId;
    if (!roomId) return;

    const { room, destroyed } = roomManager.leaveRoom(roomId, user.userId);
    socket.leave(roomId);
    (socket as any).currentRoomId = undefined;

    if (destroyed) {
      io.emit('room:updated', { id: roomId, status: 'CLOSED' } as any);
    } else if (room) {
      io.to(roomId).emit('room:player_left', {
        room,
        userId: user.userId,
        username: user.username,
      });
      io.emit('room:updated', room);
    }
  });

  socket.on('room:ready', (payload) => {
    let roomId = (socket as any).currentRoomId;

    // Fallback lookup if currentRoomId was not stored on socket instance
    if (!roomId) {
      for (const room of io.sockets.adapter.rooms.keys()) {
        if (room.startsWith('room_')) {
          const roomInstance = roomManager.getRoom(room);
          if (roomInstance && roomInstance.players.some((p) => p.id === user.userId)) {
            roomId = room;
            (socket as any).currentRoomId = room;
            break;
          }
        }
      }
    }

    if (!roomId) return;

    try {
      const room = roomManager.setPlayerReady(roomId, user.userId, payload.ready);
      io.to(roomId).emit('room:updated', room);
      io.emit('room:updated', room);
    } catch (err: any) {
      socket.emit('system:error', { message: err.message });
    }
  });

  socket.on('room:kick', (payload) => {
    const roomId = (socket as any).currentRoomId;
    if (!roomId) return;

    try {
      const room = roomManager.kickPlayer(roomId, user.userId, payload.targetUserId);
      io.to(roomId).emit('room:updated', room);
      io.emit('room:updated', room);

      // Notify kicked socket
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      if (roomSockets) {
        for (const socketId of roomSockets) {
          const targetSocket = io.sockets.sockets.get(socketId) as AuthenticatedSocket;
          if (targetSocket && targetSocket.data.user?.userId === payload.targetUserId) {
            targetSocket.leave(roomId);
            (targetSocket as any).currentRoomId = undefined;
            targetSocket.emit('room:kicked', { reason: 'You were kicked by the room host.' });
          }
        }
      }
    } catch (err: any) {
      socket.emit('system:error', { message: err.message });
    }
  });

  socket.on('disconnect', () => {
    const roomId = (socket as any).currentRoomId;
    if (!roomId) return;

    roomManager.handleDisconnect(roomId, user.userId, 20000);
    const room = roomManager.getRoom(roomId);
    if (room) {
      io.to(roomId).emit('room:player_left', {
        room,
        userId: user.userId,
        username: user.username,
      });
      io.emit('room:updated', room);
    }
  });
};
