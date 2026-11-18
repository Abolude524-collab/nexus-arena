import { Router, Response } from 'express';
import { authenticateHttp, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { followService } from '../services/follow.service.js';
import { followMutationSchema } from '../shared/index.js';
import { RateLimiter } from '../utils/rateLimiter.js';

const router = Router();

// Follow churn is cheap but not free: cap writes per account
export const followMutationLimiter = new RateLimiter(30, 60_000);

/**
 * Every route here is registered-only. Guests watch matches but never carry a
 * social identity, so there is no anonymous path into this router.
 */
router.use(authenticateHttp);

router.get('/follows', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const follows = await followService.list(req.user!.userId);
    res.status(200).json({ follows });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Unable to load followed players' });
  }
});

router.post('/follows/:playerId', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (!followMutationLimiter.consume(`follow:${user.userId}`)) {
    res.status(429).json({ error: 'Too many follow updates. Please wait a moment.' });
    return;
  }

  const parsed = followMutationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid follow request' });
    return;
  }

  try {
    const follow = await followService.follow(user.userId, req.params.playerId, parsed.data);
    res.status(200).json({ follow });
  } catch (err: any) {
    const message = err?.message || 'Unable to follow this player';
    const status = message === 'Player not found' || message.includes('cannot follow yourself') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

router.delete('/follows/:playerId', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (!followMutationLimiter.consume(`follow:${user.userId}`)) {
    res.status(429).json({ error: 'Too many follow updates. Please wait a moment.' });
    return;
  }

  try {
    const removed = await followService.unfollow(user.userId, req.params.playerId);
    res.status(200).json({ removed });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Unable to unfollow this player' });
  }
});

export default router;
