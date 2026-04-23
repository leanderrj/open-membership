<?php
declare(strict_types=1);

namespace OmWp\Api;

use OmWp\Config\ConfigRepository;
use OmWp\Logger;
use OmWp\Plugin;
use OmWp\Security\RateLimiter;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * POST /om/v1/checkout
 *
 * Creates a Stripe Checkout Session for the named offer and returns
 * the redirect URL.
 */
final class CheckoutController {

	public function __construct(
		private readonly ConfigRepository $config,
		private readonly RateLimiter $rate_limiter,
		private readonly Logger $logger
	) {}

	public function handle( WP_REST_Request $req ) {
		$decision = $this->rate_limiter->check( 'checkout', RateLimiter::client_id_for_request() );
		if ( ! $decision['allowed'] ) {
			$res = HttpError::rate_limited( $decision['retry_after'] );
			$res->add_data( [ 'retry_after' => $decision['retry_after'] ] );
			return $res;
		}

		if ( ! $this->config->is_configured() ) {
			return HttpError::service_unavailable( 'plugin not fully configured' );
		}

		$offer_id = (string) $req->get_param( 'offer_id' );
		$offer    = $this->config->offer_by_id( $offer_id );
		if ( null === $offer ) {
			return HttpError::not_found( sprintf( 'unknown offer_id "%s"', $offer_id ) );
		}
		$psp = (string) ( $req->get_param( 'psp' ) ?: 'stripe' );
		if ( 'stripe' !== $psp ) {
			return HttpError::bad_request( 'only stripe psp is supported' );
		}

		$stripe = Plugin::instance()->stripe();
		if ( null === $stripe ) {
			return HttpError::service_unavailable( 'stripe not configured' );
		}

		$base       = $this->config->provider_url();
		$return_url = (string) ( $req->get_param( 'return_url' ) ?: $base . '/?om-checkout=return' );
		$cancel_url = $base . '/?om-checkout=cancel';
		$success_url_template = $return_url
			. ( str_contains( $return_url, '?' ) ? '&' : '?' )
			. 'session_id={CHECKOUT_SESSION_ID}';

		try {
			$session = $stripe->create_checkout_session(
				[
					'price_id'           => $offer['checkout']['price_id'],
					'success_url'        => $success_url_template,
					'cancel_url'         => $cancel_url,
					'customer_email'     => $req->get_param( 'customer_email' ),
					'client_reference_id'=> $req->get_param( 'correlation_id' ),
					'trial_days'         => $offer['trial_days'] ?? null,
				]
			);
		} catch ( \Throwable $e ) {
			$this->logger->error( 'stripe checkout session failed', [ 'err' => $e->getMessage() ] );
			return HttpError::upstream( 'stripe', $e->getMessage() );
		}

		return new WP_REST_Response(
			[
				'checkout_url' => $session->url,
				'session_id'   => $session->id,
				'psp'          => 'stripe',
			]
		);
	}
}
