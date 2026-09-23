import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import { AuthService, JwtPayload } from '../services/auth.service.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
  };
}

export const authenticateHttp = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Missing token' });
      return;
    }

    const payload = AuthService.verifyToken(token);
    req.user = payload;
    next();
  } catch (_error) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const authenticateSocket = (
  socket: Socket,
  next: (err?: Error) => void,
): void => {
  try {
    const auth = socket.handshake.auth as { token?: string };
    const authHeader = socket.handshake.headers.authorization;

    let token = auth.token;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    const payload = AuthService.verifyToken(token);
    socket.data.user = payload;
    next();
  } catch (_error) {
    next(new Error('Authentication error: Invalid or expired token'));
  }
};
