<?php
declare(strict_types=1);

namespace OmWp\Security;

defined( 'ABSPATH' ) || exit;

/**
 * Webhook idempotency backed by a small custom table.
 *
 * Stripe retries webhooks until it receives a 2xx. Retries can arrive
 * out of order and in parallel, so the handler must be idempotent over
 * the event.id. This class provides the two-operation interface
 * om-ghost's Node sidecar uses (claim + prune) on top of wp_om_webhook_events.
 *
 * Table schema (see Activator::create_tables):
 *   event_id   VARCHAR(191) PRIMARY KEY
 *   first_seen BIGINT UNSIGNED (unix epoch seconds)
 */
final class IdempotencyStore {

	public static function table_name(): string {
		global $wpdb;
		return $wpdb->prefix . 'om_webhook_events';
	}

	/**
	 * Atomically claim an event id. Returns true when the caller should
	 * process the event; false when we've seen it before.
	 *
	 * INSERT IGNORE is atomic at the MySQL level, so simultaneous
	 * Stripe retries contend for the row and only one wins.
	 */
	public function claim( string $event_id ): bool {
		global $wpdb;
		$table = self::table_name();
		$rows  = $wpdb->query(
			$wpdb->prepare(
				"INSERT IGNORE INTO $table (event_id, first_seen) VALUES (%s, %d)", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id,
				time()
			)
		);
		return 1 === (int) $rows;
	}

	/**
	 * Remove rows older than the given retention window. Called hourly
	 * by the Pruner cron job.
	 */
	public function prune( int $older_than_seconds ): int {
		global $wpdb;
		$table  = self::table_name();
		$cutoff = time() - max( 0, $older_than_seconds );
		$deleted = $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM $table WHERE first_seen < %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$cutoff
			)
		);
		return max( 0, (int) $deleted );
	}
}
