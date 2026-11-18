import { create } from 'zustand';

/**
 * Guest conversion prompts. Watching is never blocked by these: a prompt explains
 * what an account unlocks, and only an explicit click opens the auth modal.
 */
export type AuthPromptKind = 'chat' | 'follow' | 'favourite' | 'alerts' | 'compete';

export interface AuthPromptCopy {
  title: string;
  description: string;
  action: string;
}

export const AUTH_PROMPT_COPY: Record<AuthPromptKind, AuthPromptCopy> = {
  chat: {
    title: 'SIGN IN TO JOIN THE CONVERSATION',
    description:
      'Spectator chat is open to registered members so every message has a name behind it. Your seat stays exactly where it is.',
    action: 'SIGN IN TO CHAT',
  },
  follow: {
    title: 'FOLLOW THE PLAYERS YOU WATCH',
    description:
      'Create an account to follow players, save favourites, and get notified the moment they go live.',
    action: 'CREATE ACCOUNT',
  },
  favourite: {
    title: 'SAVE YOUR FAVOURITE PLAYERS',
    description:
      'Registered accounts can build a favourites list and jump straight into those matches from the WATCH directory.',
    action: 'CREATE ACCOUNT',
  },
  alerts: {
    title: 'NEVER MISS A MATCH',
    description:
      'Match alerts are sent to registered members when a player you follow starts a live match.',
    action: 'CREATE ACCOUNT',
  },
  compete: {
    title: 'WANT TO COMPETE INSTEAD OF JUST WATCHING?',
    description:
      'Create your Nexus Arena account to enter the lobby, play all four modes, and climb the leaderboard.',
    action: 'CREATE ACCOUNT',
  },
};

interface AuthPromptState {
  /** Prompt the app should open the auth modal for, set by an explicit click. */
  pending: AuthPromptKind | null;
  /** Inline prompts the visitor dismissed during this session. */
  dismissed: AuthPromptKind[];
  requestAuth: (kind: AuthPromptKind) => void;
  clearRequest: () => void;
  dismiss: (kind: AuthPromptKind) => void;
  isDismissed: (kind: AuthPromptKind) => boolean;
}

export const useAuthPromptStore = create<AuthPromptState>((set, get) => ({
  pending: null,
  dismissed: [],

  requestAuth: (kind) => set({ pending: kind }),

  clearRequest: () => set({ pending: null }),

  dismiss: (kind) =>
    set((state) =>
      state.dismissed.includes(kind) ? state : { dismissed: [...state.dismissed, kind] },
    ),

  isDismissed: (kind) => get().dismissed.includes(kind),
}));
