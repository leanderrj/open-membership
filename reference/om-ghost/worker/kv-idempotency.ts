import type { IdempotencyStore } from "../shared/idempotency.js";

/**
 * KV-backed webhook idempotency.
 *
 * claim() does a read-then-write, which is not strictly atomic in KV —
 * two simultaneous Stripe retries of the same event could both see an
 * empty slot and both claim. For webhook-idempotency use, this is
 * acceptable: the handler is itself idempotent at the business-logic
 * level (cache refreshes are last-write-wins), so double-processing
 * still produces the right end state. True atomicity would require a
 * Durable Object, which is tracked as a future enhancement.
 */
export class KvIdempotencyStore implements IdempotencyStore {
  constructor(private readonly kv: KVNamespace) {}

  async claim(eventId: string, ttlSeconds: number): Promise<boolean> {
    const key = this.keyFor(eventId);
    const existing = await this.kv.get(key);
    if (existing) return false;
    await this.kv.put(key, String(Math.floor(Date.now() / 1000)), {
      expirationTtl: ttlSeconds,
    });
    return true;
  }

  async prune(_olderThanSeconds: number): Promise<number> {
    // KV expires entries automatically; nothing to prune by hand.
    return 0;
  }

  async close(): Promise<void> {
    // nothing to close
  }

  private keyFor(eventId: string): string {
    return `evt:${eventId}`;
  }
}
