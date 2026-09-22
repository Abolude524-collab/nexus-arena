import { create } from 'zustand';
import { RoomDTO, CreateRoomInput } from '@nexus-arena/shared';
import { socketService } from '../services/socket.service';
import { useAuthStore } from './authStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

interface RoomState {
  currentRoom: RoomDTO | null;
  rooms: RoomDTO[];
  onlinePlayersCount: number;
  isLoading: boolean;
  error: string | null;
  initSocketListeners: () => void;
  fetchRooms: () => Promise<void>;
  restoreMyRoom: () => Promise<void>;
  createRoom: (input: CreateRoomInput) => Promise<RoomDTO>;
  joinRoom: (roomIdOrCode: string, password?: string) => Promise<RoomDTO>;
  leaveRoom: () => void;
  toggleReady: (ready: boolean) => void;
  clearError: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  rooms: [],
  onlinePlayersCount: 0,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchRooms: async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`);
      if (res.ok) {
        const data = await res.json();
        set({
          rooms: data.rooms || [],
          onlinePlayersCount: typeof data.onlinePlayersCount === 'number' ? data.onlinePlayersCount : (get().onlinePlayersCount || 0),
        });
      }
    } catch (_err) {
      // Ignore background fetch error
    }
  },

  restoreMyRoom: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/my-room`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          const socket = socketService.getSocket();
          if (socket) {
            socket.emit('room:join', { roomIdOrCode: data.room.id });
          }
          set({ currentRoom: data.room });
        }
      }
    } catch (_err) {
      // Ignore background restore error
    }
  },

  initSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.off('room:updated');
    socket.off('room:player_joined');
    socket.off('room:player_left');
    socket.off('room:kicked');
    socket.off('system:online_count');

    socket.on('system:online_count', ({ count }) => {
      set({ onlinePlayersCount: count });
    });

    socket.on('room:updated', (updatedRoom) => {
      const current = get().currentRoom;
      const userId = useAuthStore.getState().user?.id;

      const isUserInRoom = userId && updatedRoom.players && updatedRoom.players.some((p) => p.id === userId);

      if (isUserInRoom || (current && current.id === updatedRoom.id)) {
        set({ currentRoom: updatedRoom });
      }

      set((state) => ({
        rooms: state.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
      }));
    });

    socket.on('room:player_joined', ({ room }) => {
      const userId = useAuthStore.getState().user?.id;
      const isUserInRoom = userId && room.players.some((p) => p.id === userId);

      if (isUserInRoom || get().currentRoom?.id === room.id) {
        set({ currentRoom: room });
      }
    });

    socket.on('room:player_left', ({ room }) => {
      const userId = useAuthStore.getState().user?.id;
      const isUserInRoom = userId && room.players.some((p) => p.id === userId);

      if (isUserInRoom || get().currentRoom?.id === room.id) {
        set({ currentRoom: room });
      } else if (get().currentRoom && !isUserInRoom) {
        set({ currentRoom: null });
      }
    });

    socket.on('room:kicked', ({ reason }) => {
      set({ currentRoom: null, error: reason });
    });
  },

  createRoom: (input: CreateRoomInput) => {
    return new Promise<RoomDTO>((resolve, reject) => {
      const socket = socketService.getSocket();
      if (!socket) {
        set({ error: 'Socket disconnected' });
        return reject(new Error('Socket disconnected'));
      }

      set({ isLoading: true, error: null });
      socket.emit('room:create', input, (res) => {
        set({ isLoading: false });
        if (res.success && res.room) {
          set({ currentRoom: res.room });
          get().fetchRooms();
          resolve(res.room);
        } else {
          set({ error: res.error || 'Failed to create room' });
          reject(new Error(res.error || 'Failed to create room'));
        }
      });
    });
  },

  joinRoom: (roomIdOrCode: string, password?: string) => {
    return new Promise<RoomDTO>((resolve, reject) => {
      const socket = socketService.getSocket();
      if (!socket) {
        set({ error: 'Socket disconnected' });
        return reject(new Error('Socket disconnected'));
      }

      set({ isLoading: true, error: null });
      socket.emit('room:join', { roomIdOrCode, password }, (res) => {
        set({ isLoading: false });
        if (res.success && res.room) {
          set({ currentRoom: res.room });
          resolve(res.room);
        } else {
          set({ error: res.error || 'Failed to join room' });
          reject(new Error(res.error || 'Failed to join room'));
        }
      });
    });
  },

  leaveRoom: () => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('room:leave');
    }
    set({ currentRoom: null });
    get().fetchRooms();
  },

  toggleReady: (ready: boolean) => {
    const current = get().currentRoom;
    const userId = useAuthStore.getState().user?.id;

    if (current && userId) {
      const updatedPlayers = current.players.map((p) =>
        p.id === userId ? { ...p, isReady: ready } : p,
      );
      set({ currentRoom: { ...current, players: updatedPlayers } });
    }

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('room:ready', { ready });
    }
  },
}));
