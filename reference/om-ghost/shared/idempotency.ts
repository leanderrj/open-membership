/**
 * Interface for webhook idempotency storage.
 *
 * Stripe retries webhooks on non-2xx. The handler uses this store to
 * detect and skip events it has already processed (identified by the
 * Stripe event.id). Implementations: service/ uses SQLite, worker/
 * uses KV. Both provide the same two-operation interface.
 */

export interface IdempotencyStore {
  /**
   * Returns true if we should process this event, false if it has
   * already been seen within the retention window. This call both
   * checks and claims the id atomically where possible.
   */
  claim(eventId: string, ttlSeconds: number): Promise<boolean>;

  /** Test/ops hook: drop all entries older than `olderThanSeconds`. */
  prune(olderThanSeconds: number): Promise<number>;

  /** For tests and ops. */
  close(): Promise<void>;
}
