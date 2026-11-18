import { FollowedPlayer, FollowMutationResponse } from '../shared/index.js';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

/**
 * Registered-only social API. Every call carries the bearer token and the server
 * re-checks ownership, so a guest can never reach these endpoints.
 */
const authHeaders = (token: string): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const toError = async (res: Response, fallback: string): Promise<string> => {
  const body = await res.json().catch(() => ({}));
  return body?.error || fallback;
};

export const socialService = {
  async listFollows(token: string): Promise<FollowedPlayer[]> {
    const res = await fetch(`${SERVER_URL}/api/social/follows`, {
      headers: authHeaders(token),
    });

    if (!res.ok) {
      throw new Error(await toError(res, 'Unable to load followed players'));
    }

    const body = (await res.json()) as { follows?: FollowedPlayer[] };
    return body.follows || [];
  },

  async follow(
    token: string,
    playerId: string,
    options: { isFavourite?: boolean; notifyLive?: boolean } = {},
  ): Promise<FollowedPlayer> {
    const res = await fetch(`${SERVER_URL}/api/social/follows/${encodeURIComponent(playerId)}`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(options),
    });

    const body = (await res.json().catch(() => ({}))) as FollowMutationResponse;

    if (!res.ok || !body.follow) {
      throw new Error(body.error || 'Unable to follow this player');
    }

    return body.follow;
  },

  async unfollow(token: string, playerId: string): Promise<boolean> {
    const res = await fetch(`${SERVER_URL}/api/social/follows/${encodeURIComponent(playerId)}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });

    if (!res.ok) {
      throw new Error(await toError(res, 'Unable to unfollow this player'));
    }

    const body = (await res.json().catch(() => ({}))) as { removed?: boolean };
    return Boolean(body.removed);
  },
};
