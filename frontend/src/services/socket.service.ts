import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/index.js';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  public connect(token: string): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(SERVER_URL, {
      auth: { token },
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
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
