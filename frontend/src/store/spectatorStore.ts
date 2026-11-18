import { create } from 'zustand';
import {
  ChatMessage,
  MatchResult,
  SpectatorGameState,
  SpectatorRoomInfo,
  SpectatorViewerInfo,
} from '../shared/index.js';
import { socketService } from '../services/socket.service';

export type SpectatorStatus = 'idle' | 'joining' | 'watching' | 'ended' | 'error';

/** Uniform server denial message for private/unlisted matches. */
const DENIED_MESSAGE = 'Match unavailable or access denied';

const JOIN_TIMEOUT_MS = 10_000;
const MAX_CHAT_MESSAGES = 120;

type SpectatorSocket = NonNullable<ReturnType<typeof socketService.getSocket>>;

let bound: { socket: SpectatorSocket; handlers: Record<string, (...args: any[]) => void> } | null =
  null;

interface SpectatorState {
  status: SpectatorStatus;
  matchId: string | null;
  accessCode: string | undefined;
  room: SpectatorRoomInfo | null;
  /** Server-decided capabilities for this viewing session (guest or registered). */
  viewer: SpectatorViewerInfo | null;
  spectatorCount: number;
  spectatorLimit: number;
  gameState: SpectatorGameState | null;
  chatMessages: ChatMessage[];
  results: MatchResult | null;
  cancelled: boolean;
  error: string | null;
  errorCode: string | null;
  requiresAccessCode: boolean;
  chatError: string | null;
  isConnectionLost: boolean;
  initSpectatorListeners: () => void;
  cleanupSpectatorListeners: () => void;
  join: (matchId: string, accessCode?: string) => Promise<void>;
  leave: () => void;
  sendChat: (content: string) => void;
  clearChatError: () => void;
  reset: () => void;
}

const initialSession = {
  status: 'idle' as SpectatorStatus,
  matchId: null,
  accessCode: undefined,
  room: null,
  viewer: null,
  spectatorCount: 0,
  spectatorLimit: 0,
  gameState: null,
  chatMessages: [] as ChatMessage[],
  results: null,
  cancelled: false,
  error: null,
  errorCode: null,
  requiresAccessCode: false,
  chatError: null,
  isConnectionLost: false,
};

export const useSpectatorStore = create<SpectatorState>((set, get) => ({
  ...initialSession,

  initSpectatorListeners: () => {
    const socket = socketService.getSocket();
    if (!socket || bound?.socket === socket) return;

    const handlers: Record<string, (...args: any[]) => void> = {
      'spectator:joined': (payload) => {
        set({
          status: 'watching',
          // The server echoes the canonical room id, which may differ from a code join
          matchId: payload.room?.id || get().matchId,
          room: payload.room,
          viewer: payload.viewer ?? null,
          spectatorCount: payload.spectatorCount,
          spectatorLimit: payload.spectatorLimit,
          gameState: payload.snapshot,
          isConnectionLost: false,
          error: null,
          errorCode: null,
          requiresAccessCode: false,
        });
      },

      'spectator:game_state': (payload: SpectatorGameState) => {
        if (!payload || payload.roomId !== get().matchId) return;
        // A finished snapshot means the match is over even if the end event is late
        set({
          gameState: payload,
          status: payload.status === 'FINISHED' ? 'ended' : 'watching',
        });
      },

      'spectator:count_update': (payload) => {
        if (!payload || payload.roomId !== get().matchId) return;
        set({
          spectatorCount: payload.spectatorCount,
          spectatorLimit: payload.spectatorLimit,
        });
      },

      'spectator:chat_message': (message: ChatMessage) => {
        if (!message || message.roomId !== get().matchId) return;
        set((state) => ({
          chatMessages: [...state.chatMessages, message].slice(-MAX_CHAT_MESSAGES),
        }));
      },

      'spectator:match_ended': (payload) => {
        if (!payload || payload.roomId !== get().matchId) return;
        set({
          status: 'ended',
          results: payload.results,
          cancelled: payload.cancelled,
        });
      },

      'spectator:left': (payload) => {
        if (payload?.roomId !== get().matchId) return;
        set({
          status: 'ended',
          error: payload.reason || 'You are no longer watching this match',
        });
      },

      'spectator:error': (payload) => {
        if (!payload) return;
        if (get().status === 'watching') {
          set({ chatError: payload.message });
          return;
        }
        set({
          error: payload.message,
          errorCode: payload.code || null,
          requiresAccessCode:
            payload.code === 'ACCESS_DENIED' && !get().accessCode && payload.message === DENIED_MESSAGE,
        });
      },

      disconnect: () => {
        if (get().status === 'watching') {
          set({ isConnectionLost: true });
        }
      },

      connect: () => {
        const { matchId, accessCode, status } = get();
        if (!matchId || status !== 'watching') return;
        // The server drops spectator membership on disconnect, so re-join the channel
        socket.emit('spectator:join', { matchId, accessCode }, () => {});
        set({ isConnectionLost: false });
      },
    };

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event as any, handler);
    }

    bound = { socket, handlers };
  },

  cleanupSpectatorListeners: () => {
    if (!bound) return;
    for (const [event, handler] of Object.entries(bound.handlers)) {
      bound.socket.off(event as any, handler);
    }
    bound = null;
  },

  join: (matchId, accessCode) => {
    return new Promise<void>((resolve, reject) => {
      const socket = socketService.getSocket();
      if (!socket) {
        set({ status: 'error', error: 'Live connection unavailable. Please retry.' });
        reject(new Error('Live connection unavailable'));
        return;
      }

      set({
        ...initialSession,
        status: 'joining',
        matchId,
        accessCode,
      });

      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        set({ status: 'error', error: 'Timed out while joining this match.' });
        reject(new Error('Spectator join timed out'));
      }, JOIN_TIMEOUT_MS);

      socket.emit('spectator:join', { matchId, accessCode }, (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (response?.success) {
          resolve();
          return;
        }

        const message = response?.error || DENIED_MESSAGE;
        const needsCode = message === DENIED_MESSAGE && !accessCode;
        set({
          status: 'error',
          error: message,
          errorCode: needsCode ? 'ACCESS_DENIED' : get().errorCode,
          requiresAccessCode: needsCode,
        });
        reject(new Error(message));
      });
    });
  },

  leave: () => {
    const socket = socketService.getSocket();
    if (socket && get().matchId && get().status !== 'idle') {
      socket.emit('spectator:leave');
    }
    set({ ...initialSession });
  },

  sendChat: (content) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    if (trimmed.length > 300) {
      set({ chatError: 'Spectator messages cannot exceed 300 characters' });
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      set({ chatError: 'Live connection unavailable' });
      return;
    }

    set({ chatError: null });
    socket.emit('spectator:chat', { content: trimmed });
  },

  clearChatError: () => set({ chatError: null }),

  reset: () => set({ ...initialSession }),
}));
