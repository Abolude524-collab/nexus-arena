import { z } from 'zod';

export const roomVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']);

export const createRoomSchema = z.object({
  name: z.string().min(3, 'Room name must be at least 3 characters').max(30, 'Room name is too long'),
  gameType: z.string().default('Neon Dash'),
  maxPlayers: z.number().int().min(2).max(8).default(8),
  isPrivate: z.boolean().optional().default(false),
  visibility: roomVisibilitySchema.optional(),
  allowSpectators: z.boolean().optional().default(true),
  spectatorLimit: z.number().int().min(0).max(200).optional(),
  password: z.string().min(1, 'Room password cannot be empty').max(64).optional(),
});

export const joinRoomSchema = z.object({
  roomIdOrCode: z.string().min(1, 'Room ID or code is required'),
  password: z.string().optional(),
});

export type CreateRoomInput = z.input<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
