import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { roomManager } from '../services/room.manager.js';
import { authenticateHttp, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';

const router = Router();

import { getOnlineUsersCount, getIoInstance } from '../sockets/socketServer.js';

// Protect all admin routes with HTTP auth and requireAdmin
router.use(authenticateHttp);
router.use(requireAdmin);

router.get('/metrics', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalMatches = await prisma.match.count();
    const activeRooms = roomManager.listRooms();
    const activeRoomPlayers = activeRooms.reduce((acc, r) => acc + r.currentPlayers, 0);
    const socketCount = getOnlineUsersCount();
    const onlineUsers = socketCount > 0 ? socketCount : activeRoomPlayers;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json({
      onlineUsers,
      activeRoomsCount: activeRooms.length,
      totalMatches,
      totalUsers,
      rooms: activeRooms,
      users,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin metrics' });
  }
});

router.delete('/users/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    if (userId === req.user?.userId) {
      res.status(400).json({ error: 'Admin cannot delete their own account' });
      return;
    }

    await prisma.user.delete({ where: { id: userId } });
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
});

router.delete('/rooms/:roomId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      res.status(400).json({ error: 'Room ID is required' });
      return;
    }

    const room = roomManager.getRoom(roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found or already closed' });
      return;
    }

    // Terminate running game instance if any
    const { gameManager } = await import('../game/GameManager.js');
    gameManager.removeGame(roomId);

    // Close room in room manager & database
    roomManager.closeRoom(roomId);

    // Broadcast socket updates
    const io = getIoInstance();
    if (io) {
      io.to(roomId).emit('room:kicked', { reason: 'This room was terminated by an Administrator.' });
      io.emit('room:updated', { id: roomId, status: 'CLOSED' } as any);
    }

    res.status(200).json({ message: 'Room terminated successfully by Administrator' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete room' });
  }
});

export default router;
