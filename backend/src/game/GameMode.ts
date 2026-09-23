import { PlayerInput, MatchResult } from '../shared/index.js';

export interface GamePlayerInit {
  id: string;
  username: string;
}

export interface GameMode {
  initialize(players: GamePlayerInit[]): void;
  update(deltaSeconds: number): void;
  handleInput(userId: string, input: PlayerInput): void;
  getState(): any;
  isFinished(): boolean;
  getResults(): MatchResult;
}
