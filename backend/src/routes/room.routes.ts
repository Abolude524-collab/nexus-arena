import { Router, Response } from 'express';
import { roomManager } from '../services/room.manager.js';
import { authenticateHttp, AuthenticatedRequest } from '../middleware/auth.middleware.js';

import { getOnlineUsersCount } from '../sockets/socketServer.js';

const router = Router();

router.get('/', (_req, res: Response) => {
  try {
    const rooms = roomManager.listRooms();
    const activeRoomPlayers = rooms.reduce((acc, r) => acc + r.currentPlayers, 0);
    const socketCount = getOnlineUsersCount();
    const onlinePlayersCount = socketCount > 0 ? socketCount : activeRoomPlayers;

    res.status(200).json({ rooms, onlinePlayersCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list rooms' });
  }
});

router.get('/my-room', authenticateHttp, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const room = roomManager.findRoomByUserId(req.user.userId);
    if (!room) {
      res.status(200).json({ room: null });
      return;
    }

    res.status(200).json({ room });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user room' });
  }
});

export default router;
