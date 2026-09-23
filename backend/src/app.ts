import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import statsRoutes from './routes/stats.routes.js';
import adminRoutes from './routes/admin.routes.js';

export const createApp = (): Express => {
  const app = express();

  app.use(
    cors({
      origin: process.env['CLIENT_URL'] || 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'NEXUS ARENA Backend API Server',
      status: 'online',
      health: '/health',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/admin', adminRoutes);

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Error]:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
};

