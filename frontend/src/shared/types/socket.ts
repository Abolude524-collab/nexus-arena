import { RoomDTO } from './room.js';
import { GameState, PlayerInput, MatchResult } from './game.js';
import { ProgressionPayload, LevelUpPayload } from './user.js';

import { CreateRoomInput } from '../schemas/room.js';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface ClientToServerEvents {
  'room:create': (
    payload: CreateRoomInput,
    callback?: (response: { success: boolean; room?: RoomDTO; error?: string }) => void
  ) => void;
  'room:join': (
    payload: { roomIdOrCode: string; password?: string },
    callback?: (response: { success: boolean; room?: RoomDTO; error?: string }) => void
  ) => void;
  'room:leave': () => void;
  'room:ready': (payload: { ready: boolean }) => void;
  'room:kick': (payload: { targetUserId: string }) => void;
  'game:start': () => void;
  'game:input': (input: PlayerInput) => void;
  'chat:send': (payload: { content: string }) => void;

  // Reaction Rush
  'reaction:ready': () => void;
  'reaction:click': (payload: { roundId: number; targetId: string }) => void;
  'reaction:leave': () => void;

  // Territory
  'territory:input': (input: { up: boolean; down: boolean; left: boolean; right: boolean }) => void;
  'territory:ready': () => void;
  'territory:leave': () => void;

  // Word Blitz
  'word:ready': () => void;
  'word:submit': (payload: { roundId: number; answer: string }) => void;
  'word:leave': () => void;
}

export interface ServerToClientEvents {
  'room:created': (room: RoomDTO) => void;
  'room:updated': (room: RoomDTO) => void;
  'room:player_joined': (payload: { room: RoomDTO; userId: string; username: string }) => void;
  'room:player_left': (payload: { room: RoomDTO; userId: string; username: string }) => void;
  'room:kicked': (payload: { reason: string }) => void;
  'game:countdown': (seconds: number) => void;
  'game:state': (state: GameState | any) => void;
  'game:player_joined': (payload: { userId: string; username: string }) => void;
  'game:player_left': (payload: { userId: string; username: string }) => void;
  'game:score_updated': (payload: { userId: string; score: number; delta: number }) => void;
  'game:ended': (results: MatchResult) => void;
  'chat:message': (message: ChatMessage) => void;
  'system:online_count': (payload: { count: number }) => void;
  'system:error': (payload: { message: string; code?: string }) => void;

  // Progression Events
  'progression:xp-earned': (payload: ProgressionPayload) => void;
  'progression:level-up': (payload: LevelUpPayload) => void;

  // Reaction Rush
  'reaction:countdown': (seconds: number) => void;
  'reaction:target': (payload: { target: any; roundId: number }) => void;
  'reaction:round_result': (payload: { roundId: number; winnerId: string | null; winnerMs?: number; scores: Record<string, number> }) => void;
  'reaction:score_update': (scores: Record<string, number>) => void;
  'reaction:next_round': (payload: { roundId: number }) => void;
  'reaction:game_end': (results: MatchResult) => void;

  // Territory
  'territory:state': (state: any) => void;
  'territory:delta': (delta: any) => void;
  'territory:captured': (payload: { territoryId: string; ownerId: string }) => void;
  'territory:contested': (payload: { territoryId: string }) => void;
  'territory:score': (scores: Record<string, number>) => void;
  'territory:game_end': (results: MatchResult) => void;

  // Word Blitz
  'word:countdown': (seconds: number) => void;
  'word:round_start': (payload: { roundId: number; challenge: any; startedAt: number; endsAt: number }) => void;
  'word:submission_result': (payload: { userId: string; isCorrect: boolean; reactionMs: number; scoreEarned: number }) => void;
  'word:score_update': (scores: Record<string, number>) => void;
  'word:round_end': (payload: { roundId: number; correctAnswers: Record<string, boolean>; scores: Record<string, number> }) => void;
  'word:next_round': (payload: { roundId: number }) => void;
  'word:game_end': (results: MatchResult) => void;
}

