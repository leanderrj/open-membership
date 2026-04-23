<?php
declare(strict_types=1);

namespace OmWp\Api;

use OmWp\Config\ConfigRepository;
use OmWp\Logger;
use OmWp\Membership\SubscriberRepository;
use OmWp\Plugin;
use OmWp\Security\RateLimiter;
use Stripe\Subscription;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * GET /om/v1/entitlements?session_id=…
 *
 * Polled by readers after the Stripe Checkout redirect. Returns
 * one of:
 *   { status: "pending" }
 *   { status: "ready", tier, features, subscription_id }
 *   { status: "failed", reason }
 */
final class EntitlementsController {

	public function __construct(
		private readonly ConfigRepository $config,
		private readonly SubscriberRepository $subscribers,
		private readonly RateLimiter $rate_limiter,
		private readonly Logger $logger
	) {}

	public function handle( WP_REST_Request $req ) {
		$decision = $this->rate_limiter->check( 'entitlements', RateLimiter::client_id_for_request() );
		if ( ! $decision['allowed'] ) {
			return HttpError::rate_limited( $decision['retry_after'] );
		}

		$stripe = Plugin::instance()->stripe();
		if ( null === $stripe ) {
			return HttpError::service_unavailable( 'stripe not configured' );
		}

		$session_id = (string) $req->get_param( 'session_id' );

		try {
			$session = $stripe->retrieve_checkout_session( $session_id );
		} catch ( \Throwable $e ) {
			$this->logger->error( 'stripe session lookup failed', [ 'err' => $e->getMessage() ] );
			return HttpError::upstream( 'stripe', $e->getMessage() );
		}

		if ( 'expired' === $session->status || 'unpaid' === $session->payment_status ) {
			return new WP_REST_Response(
				[
					'status' => 'failed',
					'reason' => $session->status ?? 'unpaid',
				]
			);
		}
		if ( 'complete' !== $session->status ) {
			return new WP_REST_Response( [ 'status' => 'pending' ] );
		}

		$subscription = $session->subscription instanceof Subscription ? $session->subscription : null;
		$price_id     = $subscription ? ( $subscription->items->data[0]->price->id ?? null ) : null;
		$tier_id      = ( $price_id && $this->config->tier_for_price_id( $price_id ) ) ?? 'free';
		$features     = $this->config->features_for_tier( $tier_id );

		return new WP_REST_Response(
			[
				'status'          => 'ready',
				'tier'            => $tier_id,
				'features'        => $features,
				'subscription_id' => $subscription->id ?? null,
			]
		);
	}
}
