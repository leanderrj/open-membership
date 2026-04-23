<?php
declare(strict_types=1);

namespace OmWp\Cron;

use OmWp\Security\IdempotencyStore;

defined( 'ABSPATH' ) || exit;

/**
 * Hourly WP-Cron job.
 *
 * Prunes idempotency rows older than 7 days. Stripe retries webhooks
 * for up to 3 days; the 7-day retention gives comfortable headroom and
 * keeps the table bounded regardless of traffic.
 */
final class Pruner {

	public const HOOK = 'om_wp_pruner';

	public function __construct( private readonly IdempotencyStore $idempotency ) {}

	public function run(): void {
		$this->idempotency->prune( 7 * DAY_IN_SECONDS );
	}
}
