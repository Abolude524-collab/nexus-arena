import {
  AuthenticatedSocket,
  createGuestSession,
  GuestSession,
} from '../middleware/auth.middleware.js';

/**
 * The single source of truth for "who is on this socket".
 * Registered users are keyed by user id; guests are keyed by an ephemeral
 * server-issued handle. Nothing here is ever trusted from the client.
 */
export interface ViewerIdentity {
  /** Presence + rate-limit key. User id for accounts, guest handle otherwise. */
  key: string;
  userId?: string;
  username: string;
  isGuest: boolean;
  /** Opaque handle shared with the client. Never a user id for guests. */
  handle: string;
}

export const resolveViewer = (socket: AuthenticatedSocket): ViewerIdentity => {
  const user = socket.data.user;

  if (user?.userId) {
    return {
      key: user.userId,
      userId: user.userId,
      username: user.username,
      isGuest: false,
      handle: user.userId,
    };
  }

  // Defensive: a socket that skipped the middleware still gets a valid guest identity
  if (!socket.data.guest) {
    socket.data.guest = createGuestSession();
  }

  const guest = socket.data.guest as GuestSession;
  return {
    key: guest.id,
    username: guest.label,
    isGuest: true,
    handle: guest.id,
  };
};

/** Connection address used for coarse guest rate limiting behind proxies. */
export const peerAddress = (socket: AuthenticatedSocket): string => {
  const forwarded = socket.handshake?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
  return socket.handshake?.address || 'unknown';
};
