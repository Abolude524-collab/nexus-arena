import { z } from 'zod';

/** Social actions are registered-only; bodies are always validated server-side. */
export const followMutationSchema = z.object({
  isFavourite: z.boolean().optional(),
  notifyLive: z.boolean().optional(),
});

export const followTargetSchema = z.object({
  playerId: z.string().trim().min(1, 'Player is required').max(64),
});

export type FollowMutationInput = z.infer<typeof followMutationSchema>;
export type FollowTargetInput = z.infer<typeof followTargetSchema>;
