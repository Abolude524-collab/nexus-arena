/**
 * Small in-memory sliding-window rate limiter used for spectator join attempts,
 * spectator chat, and spectator code resolution.
 */
export class RateLimiter {
  private hits: Map<string, number[]> = new Map();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Returns false when the key has exhausted its allowance for the window. */
  public consume(key: string, now: number = Date.now()): boolean {
    const recent = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }

    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  public reset(key?: string): void {
    if (key) {
      this.hits.delete(key);
      return;
    }
    this.hits.clear();
  }
}
