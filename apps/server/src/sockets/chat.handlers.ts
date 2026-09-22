import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth.middleware.js';
import { chatMessageSchema, ChatMessage } from '@nexus-arena/shared';

const userLastMessageTime: Map<string, number> = new Map();
const COOLDOWN_MS = 300;

export const registerChatHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  const user = socket.data.user;
  if (!user) return;

  socket.on('chat:send', (payload) => {
    try {
      const roomId = (socket as any).currentRoomId;
      if (!roomId) {
        socket.emit('system:error', { message: 'You are not in a room.' });
        return;
      }

      // Rate limiting check
      const lastTime = userLastMessageTime.get(user.userId) || 0;
      const now = Date.now();
      if (now - lastTime < COOLDOWN_MS) {
        socket.emit('system:error', { message: 'Chat rate limit reached. Slow down.' });
        return;
      }
      userLastMessageTime.set(user.userId, now);

      // Zod validation
      const validated = chatMessageSchema.parse(payload);

      const message: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        roomId,
        senderId: user.userId,
        senderName: user.username,
        content: validated.content,
        timestamp: now,
        isSystem: false,
      };

      io.to(roomId).emit('chat:message', message);
    } catch (err: any) {
      socket.emit('system:error', { message: err.message || 'Invalid chat message' });
    }
  });
};
