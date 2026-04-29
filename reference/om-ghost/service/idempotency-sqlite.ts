import Database from "better-sqlite3";
import type { IdempotencyStore } from "../shared/idempotency.js";

/**
 * SQLite-backed webhook idempotency.
 *
 * Uses a single table with an event id and first-seen timestamp.
 * `claim()` inserts with IGNORE; if the row existed it returns false,
 * otherwise true. This is atomic at the SQLite level without needing a
 * transaction.
 *
 * Retention is enforced by periodic prune() calls (the service's
 * shutdown hook also prunes on exit). TTL is passed per claim but
 * applied by prune; the row itself carries only a timestamp.
 */
export class SqliteIdempotencyStore implements IdempotencyStore {
  private readonly db: Database.Database;
  private readonly insert: Database.Statement<[string, number]>;
  private readonly pruneStmt: Database.Statement<[number]>;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS webhook_events (
         event_id   TEXT PRIMARY KEY,
         first_seen INTEGER NOT NULL
       );
       CREATE INDEX IF NOT EXISTS idx_webhook_events_first_seen
         ON webhook_events(first_seen);`,
    );
    this.insert = this.db.prepare(
      "INSERT OR IGNORE INTO webhook_events (event_id, first_seen) VALUES (?, ?)",
    );
    this.pruneStmt = this.db.prepare(
      "DELETE FROM webhook_events WHERE first_seen < ?",
    );
  }

  async claim(eventId: string, _ttlSeconds: number): Promise<boolean> {
    const result = this.insert.run(eventId, Math.floor(Date.now() / 1000));
    return result.changes === 1;
  }

  async prune(olderThanSeconds: number): Promise<number> {
    const cutoff = Math.floor(Date.now() / 1000) - olderThanSeconds;
    const result = this.pruneStmt.run(cutoff);
    return result.changes;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
