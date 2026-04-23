<?php
/**
 * Plugin Name:       Open Membership RSS
 * Plugin URI:        https://github.com/REPLACE_ME/open-membership-rss
 * Description:       Emit Open Membership RSS feeds, discovery documents, and checkout flows from any WordPress site. Integrates with Stripe Checkout for subscriptions.
 * Version:           0.1.0
 * Requires at least: 6.3
 * Tested up to:      6.7
 * Requires PHP:      8.1
 * Author:            Open Membership RSS contributors
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       om-wordpress
 * Domain Path:       /languages
 *
 * @package OmWp
 */

declare(strict_types=1);

defined( 'ABSPATH' ) || exit;

// Minimum-viable environment guard. WordPress loads this file even on
// sites that are below the declared PHP requirement; without this check
// those sites would see a fatal instead of a graceful notice.
if ( version_compare( PHP_VERSION, '8.1', '<' ) ) {
	add_action(
		'admin_notices',
		static function (): void {
			printf(
				'<div class="notice notice-error"><p><strong>Open Membership RSS</strong> requires PHP 8.1 or newer. You are running PHP %s.</p></div>',
				esc_html( PHP_VERSION )
			);
		}
	);
	return;
}

// Bail early if composer autoload is missing. The plugin ships
// vendor-less and site operators are expected to run `composer install`
// once at deploy time. Surface the exact command in the notice.
$om_wp_autoload = __DIR__ . '/vendor/autoload.php';
if ( ! is_readable( $om_wp_autoload ) ) {
	add_action(
		'admin_notices',
		static function (): void {
			$plugin_dir = str_replace( ABSPATH, '', plugin_dir_path( __FILE__ ) );
			printf(
				'<div class="notice notice-error"><p><strong>Open Membership RSS</strong> dependencies are missing. Run <code>composer install --no-dev</code> inside <code>%s</code>.</p></div>',
				esc_html( $plugin_dir )
			);
		}
	);
	return;
}

require_once $om_wp_autoload;

// Constants.
define( 'OM_WP_VERSION', '0.1.0' );
define( 'OM_WP_PLUGIN_FILE', __FILE__ );
define( 'OM_WP_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'OM_WP_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'OM_WP_REST_NAMESPACE', 'om/v1' );
define( 'OM_WP_DB_VERSION', '1' );
define( 'OM_WP_SPEC_VERSION', '0.4' );

// Plugin lifecycle hooks. These must be registered before bootstrap so
// they fire during plugin activation (which runs before 'plugins_loaded').
register_activation_hook( __FILE__, [ OmWp\Activator::class, 'activate' ] );
register_deactivation_hook( __FILE__, [ OmWp\Deactivator::class, 'deactivate' ] );

// Boot the plugin on 'plugins_loaded' so all of WordPress is available.
add_action(
	'plugins_loaded',
	static function (): void {
		OmWp\Plugin::instance()->boot();
	}
);
