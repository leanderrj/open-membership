/**
 * Rate-limit interface. Node uses an in-process token bucket; Worker
 * uses a KV-backed sliding window. Both return the same decision shape.
 */

export interface RateDecision {
  allowed: boolean;
  /** Seconds until retry if not allowed. */
  retryAfterSeconds: number;
  /** Remaining budget within the current window, for observability. */
  remaining: number;
}

export interface RateLimiter {
  /**
   * Consume one token against the bucket keyed by `key`. Returns the
   * decision. Callers should pass a key scoped to the endpoint + client
   * (typically `${endpoint}:${ip}`) so one endpoint's traffic doesn't
   * throttle another's.
   */
  check(key: string): Promise<RateDecision>;
}

/**
 * Reference bucket configuration. The public endpoints fall into three
 * classes and each gets its own multiplier.
 */
export interface BucketConfig {
  /** Tokens allowed per windowSeconds. */
  capacity: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export const DEFAULT_BUCKETS: Record<string, BucketConfig> = {
  checkout: { capacity: 10, windowSeconds: 60 },
  token: { capacity: 30, windowSeconds: 60 },
  entitlements: { capacity: 60, windowSeconds: 60 },
  portal: { capacity: 5, windowSeconds: 60 },
  feed: { capacity: 120, windowSeconds: 60 },
};
