<?php
declare(strict_types=1);

namespace OmWp\Api;

use OmWp\Config\ConfigRepository;
use OmWp\Logger;
use OmWp\Membership\SubscriberRepository;
use OmWp\Plugin;
use OmWp\Security\IdempotencyStore;
use OmWp\Security\RateLimiter;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Registers every om REST route under /wp-json/om/v1/*.
 *
 * Each endpoint's business logic lives in a dedicated Controller. This
 * class only wires routes, validation args, permission callbacks, and
 * dispatches to the controller. All routes are public (the feed token
 * + JWT are the security boundary), so permission_callback is __return_true.
 * Rate limiting is handled inside each controller via RateLimiter.
 */
final class RestRoutes {

	public function __construct(
		private readonly ConfigRepository $config,
		private readonly SubscriberRepository $subscribers,
		private readonly IdempotencyStore $idempotency,
		private readonly RateLimiter $rate_limiter,
		private readonly Logger $logger
	) {}

	public function register(): void {
		$ns = OM_WP_REST_NAMESPACE;

		register_rest_route(
			$ns,
			'/discovery',
			[
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
				'callback'            => function ( WP_REST_Request $req ): WP_REST_Response {
					return $this->controller_discovery()->handle( $req );
				},
			]
		);

		register_rest_route(
			$ns,
			'/checkout',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => '__return_true',
				'args'                => [
					'offer_id' => [
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					],
					'psp' => [
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'enum'              => [ 'stripe' ],
					],
					'return_url' => [
						'required'          => false,
						'type'              => 'string',
						'format'            => 'uri',
						'sanitize_callback' => 'esc_url_raw',
					],
					'customer_email' => [
						'required'          => false,
						'type'              => 'string',
						'format'            => 'email',
						'sanitize_callback' => 'sanitize_email',
					],
					'correlation_id' => [
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					],
				],
				'callback' => function ( WP_REST_Request $req ) {
					return $this->controller_checkout()->handle( $req );
				},
			]
		);

		register_rest_route(
			$ns,
			'/entitlements',
			[
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
				'args'                => [
					'session_id' => [
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					],
				],
				'callback' => function ( WP_REST_Request $req ) {
					return $this->controller_entitlements()->handle( $req );
				},
			]
		);

		register_rest_route(
			$ns,
			'/token',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => '__return_true',
				'args'                => [
					'feed_token' => [
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					],
					'audience' => [
						'required'          => false,
						'type'              => 'string',
						'format'            => 'uri',
						'sanitize_callback' => 'esc_url_raw',
					],
				],
				'callback' => function ( WP_REST_Request $req ) {
					return $this->controller_token()->handle( $req );
				},
			]
		);

		register_rest_route(
			$ns,
			'/portal',
			[
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
				'args'                => [
					'feed_token' => [
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					],
				],
				'callback' => function ( WP_REST_Request $req ) {
					return $this->controller_portal()->handle( $req );
				},
			]
		);

		// The webhook route MUST receive the raw request body for
		// signature verification. WP_REST_Request already exposes
		// ->get_body() returning the raw body when content-type is
		// application/json, so we can still use a rest route safely.
		register_rest_route(
			$ns,
			'/webhook',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => '__return_true',
				'callback'            => function ( WP_REST_Request $req ) {
					return $this->controller_webhook()->handle( $req );
				},
			]
		);

		register_rest_route(
			$ns,
			'/health',
			[
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
				'callback'            => static fn() => new WP_REST_Response( [ 'ok' => true ] ),
			]
		);
	}

	private function controller_checkout(): CheckoutController {
		return new CheckoutController(
			$this->config,
			$this->rate_limiter,
			$this->logger
		);
	}

	private function controller_entitlements(): EntitlementsController {
		return new EntitlementsController(
			$this->config,
			$this->subscribers,
			$this->rate_limiter,
			$this->logger
		);
	}

	private function controller_token(): TokenController {
		return new TokenController(
			$this->config,
			$this->subscribers,
			$this->rate_limiter,
			$this->logger
		);
	}

	private function controller_portal(): PortalController {
		return new PortalController(
			$this->config,
			$this->subscribers,
			$this->rate_limiter,
			$this->logger
		);
	}

	private function controller_webhook(): WebhookController {
		return new WebhookController(
			$this->config,
			$this->subscribers,
			$this->idempotency,
			$this->rate_limiter,
			$this->logger
		);
	}

	private function controller_discovery(): DiscoveryController {
		return new DiscoveryController( $this->config );
	}
}
