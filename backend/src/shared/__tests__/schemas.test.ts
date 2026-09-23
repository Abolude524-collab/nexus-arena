import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, createRoomSchema, chatMessageSchema } from '../index.js';

describe('Shared Schemas', () => {
  it('validates register schema correctly', () => {
    const valid = registerSchema.safeParse({
      username: 'Enoch_99',
      email: 'enoch@example.com',
      password: 'password123',
    });
    expect(valid.success).toBe(true);

    const invalid = registerSchema.safeParse({
      username: 'a',
      email: 'not-an-email',
      password: '123',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates login schema correctly', () => {
    const valid = loginSchema.safeParse({
      email: 'user@nexus.com',
      password: 'secretpassword',
    });
    expect(valid.success).toBe(true);
  });

  it('validates create room schema correctly', () => {
    const valid = createRoomSchema.safeParse({
      name: 'Neon Gladiators',
      gameType: 'Neon Dash',
      maxPlayers: 8,
    });
    expect(valid.success).toBe(true);
  });

  it('validates chat message schema correctly', () => {
    const valid = chatMessageSchema.safeParse({
      content: 'GG WP everyone!',
    });
    expect(valid.success).toBe(true);

    const empty = chatMessageSchema.safeParse({
      content: '   ',
    });
    expect(empty.success).toBe(false);
  });
});
