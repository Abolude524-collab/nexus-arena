import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';

describe('Server App', () => {
  it('creates express app instance', () => {
    const app = createApp();
    expect(app).toBeDefined();
  });
});
