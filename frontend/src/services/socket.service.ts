import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/index.js';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

type ArenaSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketService {
  private socket: ArenaSocket | null = null;
  private token: string | null = null;

  /**
   * Watching never requires an account: a handshake without a token becomes a
   * server-issued guest session. When the identity changes (login, logout, or a
   * switched account) the same socket instance re-handshakes so the server can
   * re-resolve the viewer, while existing listeners stay attached.
   */
  public connect(token?: string | null): ArenaSocket {
    const nextToken = token ?? null;

    if (this.socket && this.token === nextToken) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }

    if (this.socket) {
      this.token = nextToken;
      this.socket.auth = nextToken ? { token: nextToken } : {};
      this.socket.disconnect().connect();
      return this.socket;
    }

    this.token = nextToken;
    this.socket = io(SERVER_URL, {
      auth: nextToken ? { token: nextToken } : {},
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[SocketClient] Connected to server:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SocketClient] Connection error:', err.message);
    });

    return this.socket;
  }

  public disconnect(): void {
    this.token = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): ArenaSocket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();

// The realtime channel opens as a guest immediately. App upgrades the session in
// place once authentication resolves, so the WATCH directory is never waiting
// on a login screen or a session check.
if (import.meta.env.MODE !== 'test') {
  socketService.connect(null);
}
