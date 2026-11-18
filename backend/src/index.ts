import http from 'http';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { ClientToServerEvents, ServerToClientEvents } from './shared/index.js';
import { authenticateSocket, AuthenticatedSocket } from './middleware/auth.middleware.js';
import { registerRoomHandlers } from './sockets/room.handlers.js';
import { registerChatHandlers } from './sockets/chat.handlers.js';
import { registerGameHandlers } from './sockets/game.handlers.js';
import { registerSpectatorHandlers } from './sockets/spectator.handlers.js';
import { gameManager } from './game/GameManager.js';
import { seedAdminUser } from './db/seed.js';

dotenv.config();

const PORT = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 4000;
const app = createApp();
const server = http.createServer(app);

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const clientUrl = process.env['CLIENT_URL'];
      if (!clientUrl || clientUrl === '*') return callback(null, true);
      const allowed = clientUrl.split(',').map((s) => s.trim());
      if (
        allowed.includes(origin) ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.onrender.com') ||
        origin.startsWith('http://localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

import { setIoInstance } from './sockets/socketServer.js';

gameManager.setSocketServer(io as any);
setIoInstance(io as any);

// Authenticate all socket handshakes. Anonymous connections are accepted as guests
// so that watching never requires an account; player handlers ignore them.
io.use(authenticateSocket);

/** Guests watch, but they are never counted as online players. */
const connectedPlayerCount = (): number => {
  let count = 0;
  for (const client of io.sockets.sockets.values()) {
    if ((client.data as { user?: unknown }).user) count += 1;
  }
  return count;
};

io.on('connection', (socket) => {
  const authSocket = socket as AuthenticatedSocket;
  const user = authSocket.data.user;

  if (user?.userId) {
    socket.join(`user:${user.userId}`);
  }

  console.log(
    user?.username
      ? `[Socket] Authenticated connection: ${user.username} (${socket.id})`
      : `[Socket] Guest connection: ${authSocket.data.guest?.label ?? 'unknown'} (${socket.id})`,
  );

  // Broadcast updated real-time online players count
  io.emit('system:online_count', { count: connectedPlayerCount() });

  registerRoomHandlers(io as any, authSocket);
  registerChatHandlers(io as any, authSocket);
  registerGameHandlers(io as any, authSocket);
  registerSpectatorHandlers(io as any, authSocket);

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${user?.username ?? 'guest'} (${socket.id})`);
    setTimeout(() => {
      io.emit('system:online_count', { count: connectedPlayerCount() });
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
