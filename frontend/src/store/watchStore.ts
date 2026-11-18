import { create } from 'zustand';
import { LiveMatchSummary } from '../shared/index.js';
import { socketService } from '../services/socket.service';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

/** Game filters use stable identifiers, never display labels. */
export const WATCH_GAME_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'ALL GAMES' },
  { id: 'neon-dash', label: 'NEON DASH' },
  { id: 'reaction-rush', label: 'REACTION RUSH' },
  { id: 'territory', label: 'TERRITORY' },
  { id: 'word-blitz', label: 'WORD BLITZ' },
];

// Realtime room updates can arrive in bursts; the directory refreshes on a trailing edge.
const REFRESH_DEBOUNCE_MS = 500;

const boundSockets = new WeakSet<object>();
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

interface WatchState {
  matches: LiveMatchSummary[];
  liveCount: number;
  totalPlayers: number;
  totalSpectators: number;
  gameFilter: string;
  search: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  initWatchListeners: () => void;
  setGameFilter: (gameFilter: string) => void;
  setSearch: (search: string) => void;
  fetchLiveMatches: (options?: { silent?: boolean }) => Promise<void>;
  resolveAccessCode: (code: string) => Promise<string>;
}

export const useWatchStore = create<WatchState>((set, get) => ({
  matches: [],
  liveCount: 0,
  totalPlayers: 0,
  totalSpectators: 0,
  gameFilter: 'all',
  search: '',
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastUpdated: null,

  initWatchListeners: () => {
    const socket = socketService.getSocket();
    if (!socket || boundSockets.has(socket)) return;
    boundSockets.add(socket);

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void useWatchStore.getState().fetchLiveMatches({ silent: true });
      }, REFRESH_DEBOUNCE_MS);
    };

    socket.on('room:updated', (room) => {
      // Closed/finished matches leave the directory immediately
      if (!room || room.status === 'CLOSED') {
        if (!room) return;
        set((state) => {
          const matches = state.matches.filter((m) => m.id !== room.id);
          return { matches, liveCount: matches.length };
        });
        return;
      }
      scheduleRefresh();
    });

    // Recover the directory after a dropped connection without a manual refresh
    socket.on('connect', () => {
      if (useWatchStore.getState().lastUpdated) {
        scheduleRefresh();
      }
    });
  },

  setGameFilter: (gameFilter) => {
    if (get().gameFilter === gameFilter) return;
    set({ gameFilter });
    void get().fetchLiveMatches();
  },

  setSearch: (search) => set({ search }),

  fetchLiveMatches: async (options) => {
    const { gameFilter, search, lastUpdated } = get();

    if (options?.silent) {
      set({ isRefreshing: true });
    } else {
      set({ isLoading: true });
    }
    set({ error: null });

    try {
      const params = new URLSearchParams();
      if (gameFilter && gameFilter !== 'all') params.set('gameType', gameFilter);
      if (search.trim()) params.set('search', search.trim().slice(0, 60));

      const query = params.toString();
      const res = await fetch(`${SERVER_URL}/api/matches/live${query ? `?${query}` : ''}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to load live matches');
      }

      const data = await res.json();
      set({
        matches: data.matches || [],
        liveCount: typeof data.liveCount === 'number' ? data.liveCount : (data.matches || []).length,
        totalPlayers: typeof data.totalPlayers === 'number' ? data.totalPlayers : 0,
        totalSpectators: typeof data.totalSpectators === 'number' ? data.totalSpectators : 0,
        lastUpdated: Date.now(),
      });
    } catch (err: any) {
      set({
        error: err?.message || 'Unable to load live matches',
        // Keep the previous snapshot visible instead of blanking the directory
        lastUpdated: lastUpdated ?? null,
      });
    } finally {
      set({ isLoading: false, isRefreshing: false });
    }
  },

  resolveAccessCode: async (code: string) => {
    const res = await fetch(`${SERVER_URL}/api/matches/spectate/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body.matchId) {
      throw new Error(body.error || 'No live match found for that code');
    }

    return body.matchId as string;
  },
}));
