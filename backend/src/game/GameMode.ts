import { PlayerInput, MatchResult, SpectatorGameState } from '../shared/index.js';

export interface GamePlayerInit {
  id: string;
  username: string;
}

export interface GameMode {
  initialize(players: GamePlayerInit[]): void;
  update(deltaSeconds: number): void;
  handleInput(userId: string, input: PlayerInput): void;
  getState(): any;
  /** Spectator-safe projection of the authoritative state. Never leaks hidden data. */
  getSpectatorState(): SpectatorGameState;
  isFinished(): boolean;
  getResults(): MatchResult;
}
