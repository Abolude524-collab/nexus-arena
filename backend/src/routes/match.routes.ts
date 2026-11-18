import { Router, Response } from 'express';
import { RoomManager, roomManager } from '../services/room.manager.js';
import { GAME_ID_TO_TYPE, spectatorCodeResolveSchema } from '../shared/index.js';
import { RateLimiter } from '../utils/rateLimiter.js';

const router = Router();

// Bounded result set: the directory is never unbounded
const MAX_DIRECTORY_RESULTS = 50;

// Spectator code resolution is rate limited per client to prevent enumeration
export const spectatorCodeLimiter = new RateLimiter(8, 60_000);

/**
 * Public live match directory.
 * Only public, actively playing matches with spectating enabled are returned.
 */
router.get('/live', (req, res: Response) => {
  try {
    const rawGameId = typeof req.query.gameType === 'string' ? req.query.gameType.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 60) : '';

    const gameType = rawGameId ? GAME_ID_TO_TYPE[rawGameId] : undefined;
    if (rawGameId && !gameType) {
      res.status(400).json({ error: 'Unknown game type filter' });
      return;
    }

    const matches = roomManager
      .listLiveMatches({ gameType, search })
      .slice(0, MAX_DIRECTORY_RESULTS);

    res.status(200).json({
      matches,
      liveCount: matches.length,
      totalPlayers: matches.reduce((acc, m) => acc + m.playerCount, 0),
      totalSpectators: matches.reduce((acc, m) => acc + m.spectatorCount, 0),
      serverTime: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load live matches' });
  }
});

/**
 * Resolve a private/unlisted spectator access code to a match ID.
 * Generic responses and rate limiting prevent room enumeration.
 */
router.post('/spectate/resolve', (req, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!spectatorCodeLimiter.consume(`resolve:${ip}`)) {
      res.status(429).json({ error: 'Too many attempts. Please wait a minute and try again.' });
      return;
    }

    const parsed = spectatorCodeResolveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid access code' });
      return;
    }

    const room = roomManager.findSpectatorMatchByCodeHash(
      RoomManager.hashAccessCode(parsed.data.code),
    );

    if (!room) {
      res.status(404).json({ error: 'No live match found for that code' });
      return;
    }

    res.status(200).json({ matchId: room.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resolve spectator code' });
  }
});

/**
 * Public spectator-safe details for a listed match.
 * Private and unlisted matches intentionally return 404 here.
 */
router.get('/:matchId/spectator-info', (req, res: Response) => {
  try {
    const summary = roomManager.getLiveMatchSummary(req.params.matchId);

    if (!summary) {
      res.status(404).json({ error: 'Match unavailable or access denied' });
      return;
    }

    res.status(200).json({ match: summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load match details' });
  }
});

export default router;
