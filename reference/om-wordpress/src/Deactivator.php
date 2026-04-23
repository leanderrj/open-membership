<?php
declare(strict_types=1);

namespace OmWp;

use OmWp\Cron\Pruner;

defined( 'ABSPATH' ) || exit;

/**
 * Plugin deactivation hook.
 *
 * Runs on plugin deactivation (NOT uninstall). Clears rewrite rules
 * and unschedules our cron event; keeps DB tables and options so
 * re-activation doesn't lose the publisher's configuration.
 */
final class Deactivator {

	public static function deactivate(): void {
		$timestamp = wp_next_scheduled( Pruner::HOOK );
		if ( false !== $timestamp ) {
			wp_unschedule_event( $timestamp, Pruner::HOOK );
		}
		flush_rewrite_rules( false );
	}
}
