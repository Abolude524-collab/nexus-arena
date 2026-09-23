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
  return ioInstance.sockets?.sockets?.size ?? 0;
};
