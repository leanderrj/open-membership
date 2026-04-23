import type {
  BucketConfig,
  RateDecision,
  RateLimiter,
} from "../shared/rate-limit.js";
import { DEFAULT_BUCKETS } from "../shared/rate-limit.js";

/**
 * KV-backed rate limiter using a simple fixed-window counter.
 *
 * Window key shape: `rl:<bucket>:<ip>:<window_start_epoch>`
 *
 * KV is eventually consistent — so under heavy parallel load the
 * counter can under-count and allow a small burst above the nominal
 * capacity. For strict limits, use a Durable Object (one per bucket).
 *
 * Reasonable for v0.1 because the worst case is "a burst of extra
 * checkout sessions from one IP", which Stripe will happily rate-limit
 * on its side too.
 */
export class KvRateLimiter implements RateLimiter {
  private readonly bucketsByName: Record<string, BucketConfig>;

  constructor(
    private readonly kv: KVNamespace,
    overrides: Record<string, BucketConfig> = {},
  ) {
    this.bucketsByName = { ...DEFAULT_BUCKETS, ...overrides };
  }

  async check(key: string): Promise<RateDecision> {
    const bucketName = key.split(":", 1)[0]!;
    const config =
      this.bucketsByName[bucketName] ?? DEFAULT_BUCKETS.entitlements!;

    const now = Math.floor(Date.now() / 1000);
    const windowStart =
      now - (now % config.windowSeconds);
    const slot = `rl:${key}:${windowStart}`;

    const current = Number((await this.kv.get(slot)) ?? "0");
    if (current >= config.capacity) {
      const retry = windowStart + config.windowSeconds - now;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, retry),
        remaining: 0,
      };
    }

    // Optimistic increment. If two concurrent readers both see `current`
    // they'll both write `current+1`, so under concurrency we may allow
    // slightly more than capacity. Accepted; see class docstring.
    await this.kv.put(slot, String(current + 1), {
      expirationTtl: config.windowSeconds * 2,
    });
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, config.capacity - (current + 1)),
    };
  }
}
