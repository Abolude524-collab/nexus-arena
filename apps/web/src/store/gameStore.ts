import { create } from 'zustand';
import { GameState, MatchResult, PlayerInput } from '@nexus-arena/shared';
import { socketService } from '../services/socket.service';

interface GameStoreState {
  gameState: GameState | null;
  matchResults: MatchResult | null;
  sequence: number;
  initGameSocketListeners: () => void;
  startGame: () => void;
  sendInput: (inputKeys: { up: boolean; down: boolean; left: boolean; right: boolean }) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  matchResults: null,
  sequence: 0,

  initGameSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.off('game:state');
    socket.off('game:ended');

    socket.on('game:state', (state: GameState) => {
      set({ gameState: state });
    });

    socket.on('game:ended', (results: MatchResult) => {
      set({ matchResults: results, gameState: null });
    });
  },

  startGame: () => {
    const socket = socketService.getSocket();
    if (socket) {
      get().initGameSocketListeners();
      socket.emit('game:start');
    }
  },

  sendInput: (inputKeys) => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const nextSeq = get().sequence + 1;
    set({ sequence: nextSeq });

    const payload: PlayerInput = {
      up: inputKeys.up,
      down: inputKeys.down,
      left: inputKeys.left,
      right: inputKeys.right,
      sequence: nextSeq,
    };

    socket.emit('game:input', payload);
  },

  clearGame: () => set({ gameState: null, matchResults: null, sequence: 0 }),
}));
