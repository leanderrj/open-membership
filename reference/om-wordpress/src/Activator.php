<?php
declare(strict_types=1);

namespace OmWp;

use OmWp\Security\IdempotencyStore;
use OmWp\Cron\Pruner;

defined( 'ABSPATH' ) || exit;

/**
 * One-time plugin activation tasks.
 *
 * Runs on plugin activation only. Idempotent; safe to call on upgrade
 * because dbDelta() handles column additions and indexes correctly.
 */
final class Activator {

	/**
	 * Primary activation entrypoint. Registered from the main plugin
	 * file via register_activation_hook().
	 */
	public static function activate(): void {
		self::check_environment();
		self::create_tables();
		self::seed_options();
		self::flush_rewrite_rules();
		self::schedule_cron();

		update_option( 'om_wp_db_version', OM_WP_DB_VERSION, false );
	}

	/**
	 * Fail the activation cleanly when the host environment can't run
	 * the plugin. WordPress surfaces our message in the admin.
	 */
	private static function check_environment(): void {
		if ( version_compare( PHP_VERSION, '8.1', '<' ) ) {
			deactivate_plugins( plugin_basename( OM_WP_PLUGIN_FILE ) );
			wp_die(
				esc_html__( 'Open Membership RSS requires PHP 8.1 or newer.', 'om-wordpress' ),
				esc_html__( 'Plugin activation failed', 'om-wordpress' ),
				[ 'back_link' => true ]
			);
		}

		global $wp_version;
		if ( version_compare( $wp_version, '6.3', '<' ) ) {
			deactivate_plugins( plugin_basename( OM_WP_PLUGIN_FILE ) );
			wp_die(
				esc_html__( 'Open Membership RSS requires WordPress 6.3 or newer.', 'om-wordpress' ),
				esc_html__( 'Plugin activation failed', 'om-wordpress' ),
				[ 'back_link' => true ]
			);
		}
	}

	private static function create_tables(): void {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();
		$table           = IdempotencyStore::table_name();

		$sql = "CREATE TABLE $table (
			event_id VARCHAR(191) NOT NULL,
			first_seen BIGINT UNSIGNED NOT NULL,
			PRIMARY KEY  (event_id),
			KEY first_seen (first_seen)
		) $charset_collate;";

		dbDelta( $sql );
	}

	/**
	 * Seed the options row with safe defaults so the admin screen has
	 * something to render on first load. Does NOT overwrite values that
	 * already exist (e.g. from an upgrade).
	 */
	private static function seed_options(): void {
		$defaults = [
			'provider_name'          => get_bloginfo( 'name' ),
			'provider_url'           => home_url( '/' ),
			'auth_methods'           => [ 'url-token', 'bearer' ],
			'stripe_secret_key'      => '',
			'stripe_webhook_secret'  => '',
			'feed_token_key'         => bin2hex( random_bytes( 32 ) ),
			'jwt_signing_key'        => bin2hex( random_bytes( 32 ) ),
			'tiers'                  => self::default_tiers(),
			'offers'                 => self::default_offers(),
			'features'               => self::default_features(),
			'revocation_policy'      => 'prospective-only',
			'revocation_grace_hours' => 48,
		];

		$existing = get_option( 'om_wp_settings', [] );
		if ( ! is_array( $existing ) ) {
			$existing = [];
		}
		$merged = array_merge( $defaults, $existing );
		update_option( 'om_wp_settings', $merged, false );
	}

	/**
	 * Register the /feed/om/{token} rewrite rule so FeedController
	 * receives requests. Flushed here and on Deactivator.
	 */
	private static function flush_rewrite_rules(): void {
		add_rewrite_rule(
			'^feed/om/([^/]+)/?$',
			'index.php?om_feed_token=$matches[1]',
			'top'
		);
		flush_rewrite_rules( false );
	}

	private static function schedule_cron(): void {
		if ( ! wp_next_scheduled( Pruner::HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', Pruner::HOOK );
		}
	}

	private static function default_tiers(): array {
		return [
			[
				'id'        => 'free',
				'label'     => 'Free',
				'features'  => [],
				'price_ids' => [],
			],
			[
				'id'        => 'paid',
				'label'     => 'Supporter',
				'features'  => [ 'full-text', 'ad-free' ],
				'price_ids' => [],
			],
		];
	}

	private static function default_offers(): array {
		return [];
	}

	private static function default_features(): array {
		return [
			[
				'id'    => 'full-text',
				'label' => 'Full article text',
			],
			[
				'id'    => 'ad-free',
				'label' => 'Ad-free reading',
			],
		];
	}
}
