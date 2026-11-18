import { z } from 'zod';

export const spectatorJoinSchema = z.object({
  matchId: z.string().trim().min(1, 'Match ID is required').max(120),
  accessCode: z.string().trim().max(32).optional(),
});

export const spectatorChatSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(300, 'Spectator messages cannot exceed 300 characters'),
});

export const roomSpectatorSettingsSchema = z.object({
  allowSpectators: z.boolean().optional(),
  spectatorLimit: z.number().int().min(0).max(200).optional(),
});

export const spectatorCodeResolveSchema = z.object({
  code: z.string().trim().min(3, 'Access code is required').max(32),
});

export type SpectatorJoinInput = z.infer<typeof spectatorJoinSchema>;
export type SpectatorChatInput = z.infer<typeof spectatorChatSchema>;
export type RoomSpectatorSettingsInput = z.infer<typeof roomSpectatorSettingsSchema>;
