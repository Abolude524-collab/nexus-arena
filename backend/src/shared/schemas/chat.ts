import { z } from 'zod';

export const chatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message cannot exceed 500 characters'),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
