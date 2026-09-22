import { Router, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { authenticateHttp, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', async (req, res: Response) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res: Response) => {
  try {
    const result = await AuthService.login(req.body);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

router.get('/me', authenticateHttp, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const user = await AuthService.getCurrentUser(req.user.userId);
    res.status(200).json({ user });
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'User not found' });
  }
});

export default router;
