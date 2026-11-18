import { Server } from 'socket.io';
import { RoomDTO } from '../shared/index.js';

/**
 * Socket.IO channel naming. Players and spectators use separate channels so
 * player-only events never reach spectator sockets and vice versa.
 */
export const roomChannel = (roomId: string): string => roomId;

export const spectateChannel = (roomId: string): string => `spectate:${roomId}`;

type RoomUpdatePayload = { id: string; visibility?: RoomDTO['visibility'] };

/**
 * Room updates also refresh the public lobby, so only public rooms may be
 * broadcast platform-wide. Private and unlisted matches stay visible to their
 * own members, which prevents listeners from enumerating them.
 */
export const emitRoomUpdate = (io: Server, room: RoomUpdatePayload): void => {
  io.to(room.id).emit('room:updated', room);

  if (room.visibility === undefined || room.visibility === 'PUBLIC') {
    io.emit('room:updated', room);
  }
};

