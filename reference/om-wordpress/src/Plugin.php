<?php
declare(strict_types=1);

namespace OmWp;

use OmWp\Admin\SettingsPage;
use OmWp\Api\RestRoutes;
use OmWp\Config\ConfigRepository;
use OmWp\Cron\Pruner;
use OmWp\Feed\FeedController;
use OmWp\Feed\FeedMetaBox;
use OmWp\Membership\SubscriberRepository;
use OmWp\Security\IdempotencyStore;
use OmWp\Security\RateLimiter;
use OmWp\Stripe\StripeClient;

defined( 'ABSPATH' ) || exit;

/**
 * Top-level plugin container.
 *
 * Holds singletons, wires WordPress hooks, and gates everything on the
 * plugin being fully configured; i.e. keys are present. Until then the
 * admin screens show a notice and the REST routes return 503.
 */
final class Plugin {

	private static ?Plugin $instance = null;

	private ConfigRepository $config;
	private SubscriberRepository $subscribers;
	private IdempotencyStore $idempotency;
	private RateLimiter $rate_limiter;
	private Logger $logger;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire every hook the plugin uses. Called once from the main plugin
	 * file on the `plugins_loaded` action.
	 */
	public function boot(): void {
		load_plugin_textdomain(
			'om-wordpress',
			false,
			dirname( plugin_basename( OM_WP_PLUGIN_FILE ) ) . '/languages'
		);

		$this->logger       = new Logger( 'om-wp' );
		$this->config       = new ConfigRepository();
		$this->subscribers  = new SubscriberRepository( $this->config );
		$this->idempotency  = new IdempotencyStore();
		$this->rate_limiter = new RateLimiter();

		( new SettingsPage( $this->config ) )->register();
		( new FeedMetaBox() )->register();

		add_action(
			'rest_api_init',
			function (): void {
				( new RestRoutes(
					$this->config,
					$this->subscribers,
					$this->idempotency,
					$this->rate_limiter,
					$this->logger
				) )->register();
			}
		);

		add_action(
			'init',
			function (): void {
				( new FeedController(
					$this->config,
					$this->subscribers,
					$this->rate_limiter,
					$this->logger
				) )->register();
			}
		);

		// Cron: prune old idempotency + rate-limit state hourly.
		add_action( Pruner::HOOK, [ new Pruner( $this->idempotency ), 'run' ] );
		if ( ! wp_next_scheduled( Pruner::HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', Pruner::HOOK );
		}
	}

	public function config(): ConfigRepository {
		return $this->config;
	}

	public function subscribers(): SubscriberRepository {
		return $this->subscribers;
	}

	public function logger(): Logger {
		return $this->logger;
	}

	/**
	 * Build a Stripe client on demand. Returns null if the site isn't
	 * configured yet; callers should then return a 503 with a clear
	 * reason so operators know to configure the plugin.
	 */
	public function stripe(): ?StripeClient {
		$secret = $this->config->stripe_secret_key();
		if ( '' === $secret ) {
			return null;
		}
		return new StripeClient( $secret );
	}

	private function __construct() {}
	private function __clone() {}
}
