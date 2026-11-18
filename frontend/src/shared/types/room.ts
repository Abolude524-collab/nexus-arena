export type RoomStatus = 'WAITING' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED' | 'CLOSED';

export type RoomVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';

export type RoomRole = 'PLAYER' | 'HOST' | 'SPECTATOR';

export interface RoomPlayer {
  id: string;
  username: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
}

export interface RoomDTO {
  id: string;
  code: string;
  name: string;
  hostId: string;
  gameType: string;
  status: RoomStatus;
  maxPlayers: number;
  currentPlayers: number;
  isPrivate: boolean;
  visibility: RoomVisibility;
  allowSpectators: boolean;
  spectatorLimit: number;
  spectatorCount: number;
  players: RoomPlayer[];
  createdAt: string;
}

/** Public, spectator-safe view of a match. Never contains room codes or access codes. */
export interface SpectatorRoomInfo {
  id: string;
  name: string;
  gameType: string;
  visibility: RoomVisibility;
  playerCount: number;
  maxPlayers: number;
  startedAt: string;
  players: Array<Pick<RoomPlayer, 'id' | 'username' | 'avatar'>>;
  hostName: string;
  /** Guests receive anonymised player handles and no profile affordances. */
  profilesVisible: boolean;
}

/** A single card in the public WATCH directory. */
export interface LiveMatchSummary {
  id: string;
  name: string;
  gameType: string;
  gameId: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  spectatorCount: number;
  spectatorLimit: number;
  hostName: string;
  startedAt: string;
  players: Array<Pick<RoomPlayer, 'id' | 'username' | 'avatar'>>;
  /** True when the match can be watched without an account or access code. */
  guestAccess: boolean;
}

export interface SpectatorMember {
  /** Registered user id, or the ephemeral guest handle for anonymous viewers. */
  userId: string;
  username: string;
  joinedAt: number;
  socketIds: string[];
  isGuest: boolean;
}
