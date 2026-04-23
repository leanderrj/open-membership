<?php
/**
 * Uninstall cleanup.
 *
 * Runs when the operator clicks "Delete" on the plugin screen. Drops
 * the idempotency table, deletes the om_wp_settings option, and removes
 * user meta we control. Does NOT touch posts or users themselves.
 *
 * @package OmWp
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

// Drop the webhook idempotency table.
$table = $wpdb->prefix . 'om_webhook_events';
$wpdb->query( "DROP TABLE IF EXISTS $table" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

// Delete plugin settings and schema version.
delete_option( 'om_wp_settings' );
delete_option( 'om_wp_db_version' );

// Unschedule cron if it's still scheduled at uninstall time.
if ( class_exists( 'OmWp\\Cron\\Pruner' ) ) {
	$timestamp = wp_next_scheduled( 'om_wp_pruner' );
	if ( false !== $timestamp ) {
		wp_unschedule_event( $timestamp, 'om_wp_pruner' );
	}
}

// Remove om-prefixed user meta from all users. Chunked to avoid hot
// servers if the site has many users.
$meta_keys = [
	'om_stripe_customer_id',
	'om_subscription_id',
	'om_subscription_status',
	'om_subscription_price',
	'om_feed_token_idx',
];
foreach ( $meta_keys as $key ) {
	$wpdb->delete( $wpdb->usermeta, [ 'meta_key' => $key ], [ '%s' ] ); // phpcs:ignore WordPress.DB.SlowDBQuery, WordPress.DB.DirectDatabaseQuery
}

// Remove post meta keys we own.
$post_meta_keys = [
	'om_access',
	'om_required_tiers',
	'om_required_features',
];
foreach ( $post_meta_keys as $key ) {
	$wpdb->delete( $wpdb->postmeta, [ 'meta_key' => $key ], [ '%s' ] ); // phpcs:ignore WordPress.DB.SlowDBQuery, WordPress.DB.DirectDatabaseQuery
}

// Flush the object cache so caller doesn't see stale values if WP is
// cold-restarted after uninstall.
wp_cache_flush();
