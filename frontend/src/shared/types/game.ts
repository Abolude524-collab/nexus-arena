import { SpectatorRoomInfo } from './room.js';

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sequence: number;
}

export interface PlayerState {
  id: string;
  username: string;
  color: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  score: number;
  activePowerUps: string[];
  connected: boolean;
}

export type CollectibleType = 'ENERGY' | 'GOLDEN' | 'POWER_CORE';

export interface Collectible {
  id: string;
  type: CollectibleType;
  x: number;
  y: number;
  radius: number;
  value: number;
}

export interface GameObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  roomId: string;
  status: 'COUNTDOWN' | 'PLAYING' | 'FINISHED';
  countdownSeconds: number;
  startedAt: number;
  endsAt: number;
  arenaWidth: number;
  arenaHeight: number;
  players: PlayerState[];
  collectibles: Collectible[];
  obstacles: GameObstacle[];
}

export interface PlayerResult {
  userId: string;
  username: string;
  score: number;
  rank: number;
  xpEarned: number;
  statLabel?: string;
  statValue?: string | number;
}

export interface MatchResult {
  matchId: string;
  roomId: string;
  gameType: string;
  startedAt: number;
  endedAt: number;
  winnerId: string | null;
  standings: PlayerResult[];
}

// ------------------------------------------------------------------
// REACTION RUSH TYPES
// ------------------------------------------------------------------
export interface ReactionTarget {
  id: string;
  x: number;
  y: number;
  radius: number;
  activatedAt: number;
  expiresAt: number;
}

export interface ReactionPlayerState {
  id: string;
  username: string;
  score: number;
  lastReactionMs?: number;
}

export interface ReactionRushGameState {
  roomId: string;
  status: 'COUNTDOWN' | 'ARMED' | 'TARGET_ACTIVE' | 'ROUND_RESULT' | 'INTERMISSION' | 'FINISHED';
  currentRound: number;
  totalRounds: number;
  target: ReactionTarget | null;
  players: ReactionPlayerState[];
  roundWinnerId?: string | null;
  roundWinnerName?: string | null;
  roundWinnerMs?: number;
}

// ------------------------------------------------------------------
// TERRITORY TYPES
// ------------------------------------------------------------------
export type TerritoryCellState = 'NEUTRAL' | 'CONTROLLED' | 'CONTESTED' | 'CAPTURING';

export interface TerritoryCell {
  id: string;
  gridX: number;
  gridY: number;
  ownerId: string | null;
  state: TerritoryCellState;
  captureProgress: number;
  capturingPlayers: string[];
}

export interface TerritoryPlayerState {
  id: string;
  username: string;
  color: string;
  gridX: number;
  gridY: number;
  score: number;
  territoriesControlled: number;
}

export interface TerritoryGameState {
  roomId: string;
  status: 'COUNTDOWN' | 'PLAYING' | 'FINISHED';
  startedAt: number;
  endsAt: number;
  gridWidth: number;
  gridHeight: number;
  cells: TerritoryCell[];
  players: TerritoryPlayerState[];
}

// ------------------------------------------------------------------
// WORD BLITZ TYPES
// ------------------------------------------------------------------
export interface WordChallenge {
  id: string;
  prompt: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface WordBlitzPlayerSubmission {
  userId: string;
  username: string;
  submittedAt: number;
  reactionMs: number;
  isCorrect: boolean;
  scoreEarned: number;
}

export interface WordBlitzPlayerState {
  id: string;
  username: string;
  score: number;
  hasSubmitted: boolean;
  correctCount: number;
  lastResult?: WordBlitzPlayerSubmission;
}

export interface WordBlitzGameState {
  roomId: string;
  status: 'COUNTDOWN' | 'ROUND_ACTIVE' | 'ROUND_END' | 'FINISHED';
  currentRound: number;
  totalRounds: number;
  challenge: WordChallenge | null;
  startedAt: number;
  endsAt: number;
  players: WordBlitzPlayerState[];
}

// ------------------------------------------------------------------
// WATCH / SPECTATOR TYPES
// ------------------------------------------------------------------

/** Stable identifiers for game filters. Never use display labels for filtering. */
export const GAME_TYPE_IDS: Record<string, string> = {
  'Neon Dash': 'neon-dash',
  'Reaction Rush': 'reaction-rush',
  Territory: 'territory',
  'Word Blitz': 'word-blitz',
};

export const GAME_ID_TO_TYPE: Record<string, string> = Object.entries(GAME_TYPE_IDS).reduce(
  (acc, [type, id]) => {
    acc[id] = type;
    return acc;
  },
  {} as Record<string, string>,
);

export const GAME_TYPES: string[] = Object.keys(GAME_TYPE_IDS);

export const getGameId = (gameType: string): string => GAME_TYPE_IDS[gameType] || 'unknown';

export const SPECTATOR_DEFAULT_LIMIT = 50;

/** Server-built, spectator-safe game snapshot. Sensitive fields are removed server-side. */
export interface SpectatorGameState {
  roomId: string;
  gameType: string;
  status: string;
  serverTime: number;
  state: Record<string, any>;
}

export interface SpectatorMatchEndedPayload {
  roomId: string;
  cancelled: boolean;
  results: MatchResult | null;
}

export interface SpectatorCountUpdate {
  roomId: string;
  spectatorCount: number;
  spectatorLimit: number;
}

/**
 * The spectator session's own capabilities, decided by the server.
 * Guests can watch everything public but cannot chat, follow, or earn rewards.
 */
export interface SpectatorViewerInfo {
  isGuest: boolean;
  canChat: boolean;
  canFollow: boolean;
  /** Ephemeral server handle for this viewing session. Never a user id. */
  viewerHandle: string;
}

export interface SpectatorJoinedPayload {
  room: SpectatorRoomInfo;
  spectatorCount: number;
  spectatorLimit: number;
  snapshot: SpectatorGameState | null;
  viewer: SpectatorViewerInfo;
}
