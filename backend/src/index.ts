import http from 'http';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { ClientToServerEvents, ServerToClientEvents } from './shared/index.js';
import { authenticateSocket, AuthenticatedSocket } from './middleware/auth.middleware.js';
import { registerRoomHandlers } from './sockets/room.handlers.js';
import { registerChatHandlers } from './sockets/chat.handlers.js';
import { registerGameHandlers } from './sockets/game.handlers.js';
import { gameManager } from './game/GameManager.js';
import { seedAdminUser } from './db/seed.js';

dotenv.config();

const PORT = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 4000;
const app = createApp();
const server = http.createServer(app);

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: process.env['CLIENT_URL'] || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

import { setIoInstance } from './sockets/socketServer.js';

gameManager.setSocketServer(io as any);
setIoInstance(io as any);

// Authenticate all socket handshakes
io.use(authenticateSocket);

io.on('connection', (socket) => {
  const authSocket = socket as AuthenticatedSocket;
  const user = authSocket.data.user;

  if (user?.userId) {
    socket.join(`user:${user.userId}`);
  }

  console.log(`[Socket] Authenticated connection: ${user?.username} (${socket.id})`);

  // Broadcast updated real-time online players count
  io.emit('system:online_count', { count: io.sockets.sockets.size });

  registerRoomHandlers(io as any, authSocket);
  registerChatHandlers(io as any, authSocket);
  registerGameHandlers(io as any, authSocket);

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${user?.username} (${socket.id})`);
    setTimeout(() => {
      io.emit('system:online_count', { count: io.sockets.sockets.size });
    }, 100);
  });
});

if (process.env['NODE_ENV'] !== 'test') {
  seedAdminUser();
  server.listen(PORT, () => {
    console.log(`⚡ NEXUS ARENA Server listening on port ${PORT}`);
  });
}

export { server, io };
