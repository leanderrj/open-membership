import type {
  BucketConfig,
  RateDecision,
  RateLimiter,
} from "../shared/rate-limit.js";
import { DEFAULT_BUCKETS } from "../shared/rate-limit.js";

/**
 * In-process token-bucket rate limiter.
 *
 * Keys are expected to be of the form `<bucket>:<identifier>` where
 * `<bucket>` matches one of DEFAULT_BUCKETS (or an override passed to
 * the constructor). Buckets accumulate tokens at capacity/window per
 * second; each check() costs one token.
 *
 * This is fine for a single-instance deployment; for multi-instance the
 * state must move to shared storage (Redis, SQLite with row-level
 * locking, etc.). That migration is a Phase 2 concern.
 *
 * Memory footprint is bounded: stale buckets are evicted after
 * 5 * windowSeconds of inactivity by an interval sweeper.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<
    string,
    { tokens: number; lastRefill: number; config: BucketConfig }
  >();
  private readonly bucketsByName: Record<string, BucketConfig>;
  private readonly sweeper: NodeJS.Timeout;

  constructor(
    overrides: Record<string, BucketConfig> = {},
    sweepIntervalMs = 60_000,
  ) {
    this.bucketsByName = { ...DEFAULT_BUCKETS, ...overrides };
    this.sweeper = setInterval(() => this.sweep(), sweepIntervalMs);
    this.sweeper.unref?.();
  }

  async check(key: string): Promise<RateDecision> {
    const bucketName = key.split(":", 1)[0]!;
    const config =
      this.bucketsByName[bucketName] ?? DEFAULT_BUCKETS.entitlements!;

    const now = Date.now() / 1000;
    const state = this.buckets.get(key) ?? {
      tokens: config.capacity,
      lastRefill: now,
      config,
    };

    const elapsed = now - state.lastRefill;
    const refill = elapsed * (config.capacity / config.windowSeconds);
    state.tokens = Math.min(config.capacity, state.tokens + refill);
    state.lastRefill = now;

    if (state.tokens >= 1) {
      state.tokens -= 1;
      this.buckets.set(key, state);
      return {
        allowed: true,
        retryAfterSeconds: 0,
        remaining: Math.floor(state.tokens),
      };
    }

    const secondsPerToken = config.windowSeconds / config.capacity;
    const retry = Math.ceil((1 - state.tokens) * secondsPerToken);
    this.buckets.set(key, state);
    return { allowed: false, retryAfterSeconds: retry, remaining: 0 };
  }

  stop(): void {
    clearInterval(this.sweeper);
  }

  private sweep(): void {
    const now = Date.now() / 1000;
    for (const [key, state] of this.buckets) {
      const idleFor = now - state.lastRefill;
      if (idleFor > state.config.windowSeconds * 5) {
        this.buckets.delete(key);
      }
    }
  }
}
