<?php
declare(strict_types=1);

namespace OmWp\Api;

use OmWp\Config\ConfigRepository;
use OmWp\Logger;
use OmWp\Membership\SubscriberRepository;
use OmWp\Plugin;
use OmWp\Security\RateLimiter;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * GET /om/v1/portal?feed_token=…
 *
 * Redirects the subscriber to their Stripe Customer Portal so they
 * can update payment methods, change plans, or cancel.
 */
final class PortalController {

	public function __construct(
		private readonly ConfigRepository $config,
		private readonly SubscriberRepository $subscribers,
		private readonly RateLimiter $rate_limiter,
		private readonly Logger $logger
	) {}

	public function handle( WP_REST_Request $req ) {
		$decision = $this->rate_limiter->check( 'portal', RateLimiter::client_id_for_request() );
		if ( ! $decision['allowed'] ) {
			return HttpError::rate_limited( $decision['retry_after'] );
		}

		$stripe = Plugin::instance()->stripe();
		if ( null === $stripe ) {
			return HttpError::service_unavailable( 'stripe not configured' );
		}

		$feed_key = $this->config->feed_token_key();
		$member   = $this->subscribers->get_by_feed_token(
			(string) $req->get_param( 'feed_token' ),
			$feed_key
		);
		if ( null === $member ) {
			return HttpError::forbidden( 'unknown or revoked feed_token' );
		}
		if ( null === $member->stripe_customer_id ) {
			return HttpError::conflict( 'no Stripe customer associated with this subscriber' );
		}

		try {
			$session = $stripe->create_portal_session(
				$member->stripe_customer_id,
				$this->config->provider_url()
			);
		} catch ( \Throwable $e ) {
			$this->logger->error( 'stripe portal session failed', [ 'err' => $e->getMessage() ] );
			return HttpError::upstream( 'stripe', $e->getMessage() );
		}

		$response = new WP_REST_Response( null, 303 );
		$response->header( 'Location', $session->url );
		return $response;
	}
}
