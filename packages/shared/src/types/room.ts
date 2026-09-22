export type RoomStatus = 'WAITING' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED' | 'CLOSED';

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
  players: RoomPlayer[];
  createdAt: string;
}
