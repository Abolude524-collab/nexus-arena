import { create } from 'zustand';
import { UserDTO, LoginInput, RegisterInput, AuthResponse } from '../shared/index.js';
import { socketService } from '../services/socket.service';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

interface AuthState {
  token: string | null;
  user: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('nexus_token'),
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (input: LoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const { token, user }: AuthResponse = data;
      localStorage.setItem('nexus_token', token);
      socketService.connect(token);

      set({ token, user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  register: async (input: RegisterInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      const { token, user }: AuthResponse = data;
      localStorage.setItem('nexus_token', token);
      socketService.connect(token);

      set({ token, user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('nexus_token');
    socketService.disconnect();
    set({ token: null, user: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const res = await fetch(`${SERVER_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Session expired');
      }

      const data = await res.json();
      socketService.connect(token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (_err) {
      localStorage.removeItem('nexus_token');
      socketService.disconnect();
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
