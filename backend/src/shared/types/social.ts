/**
 * Social layer for registered spectators only. Guests have no identity to
 * persist, so these shapes are never produced for anonymous sessions.
 */

export const MAX_FOLLOWS_PER_USER = 100;

export interface FollowedPlayer {
  playerId: string;
  username: string;
  isFavourite: boolean;
  notifyLive: boolean;
  followedAt: string;
}

export interface FollowMutationResponse {
  success: boolean;
  error?: string;
  follow?: FollowedPlayer;
}

/** Pushed to followers when a tracked player's match goes live. */
export interface MatchLiveNotification {
  roomId: string;
  roomName: string;
  gameType: string;
  playerId: string;
  playerName: string;
  startedAt: number;
}
