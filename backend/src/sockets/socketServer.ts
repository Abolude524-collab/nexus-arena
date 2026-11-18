import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export const setIoInstance = (io: Server): void => {
  ioInstance = io;
};

export const getIoInstance = (): Server | null => {
  return ioInstance;
};

export const getOnlineUsersCount = (): number => {
  if (!ioInstance) return 0;

  // Guests hold a socket too, because watching needs no account. Counting raw
  // sockets would let spectators inflate the player count in the lobby and the
  // admin dashboard, so only authenticated identities are counted.
  let authenticated = 0;
  for (const socket of ioInstance.sockets.sockets.values()) {
    if (socket.data?.user) authenticated += 1;
  }
  return authenticated;
};
