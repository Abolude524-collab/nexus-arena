import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve static web build if present (All-in-one Render deployment)
  const possiblePaths = [
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), '../web/dist'),
    path.resolve(process.cwd(), 'dist'),
  ];
  const staticPath = possiblePaths.find((p) => fs.existsSync(p));

  if (staticPath) {
    app.use(express.static(staticPath));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api') || req.path === '/health') {
        return next();
      }
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Error]:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
};

