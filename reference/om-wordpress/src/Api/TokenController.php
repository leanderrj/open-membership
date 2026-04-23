<?php
declare(strict_types=1);

namespace OmWp\Api;

use OmWp\Config\ConfigRepository;
use OmWp\Logger;
use OmWp\Membership\SubscriberRepository;
use OmWp\Security\Jwt;
use OmWp\Security\RateLimiter;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * POST /om/v1/token
 *
 * Exchanges a feed-URL token for a short-lived JWT a reader can use at
 * <om:unlock> endpoints and for bearer-auth'd content requests.
 */
final class TokenController {

	private const TTL_SECONDS = 3600;

	public function __construct(
		private readonly ConfigRepository $config,
		private readonly SubscriberRepository $subscribers,
		private readonly RateLimiter $rate_limiter,
		private readonly Logger $logger
	) {}

	public function handle( WP_REST_Request $req ) {
		$decision = $this->rate_limiter->check( 'token', RateLimiter::client_id_for_request() );
		if ( ! $decision['allowed'] ) {
			return HttpError::rate_limited( $decision['retry_after'] );
		}

		$signing_key = $this->config->jwt_signing_key();
		$feed_key    = $this->config->feed_token_key();
		if ( '' === $signing_key || '' === $feed_key ) {
			return HttpError::service_unavailable( 'plugin not fully configured' );
		}

		$feed_token = (string) $req->get_param( 'feed_token' );
		$audience   = (string) ( $req->get_param( 'audience' ) ?: $this->config->provider_url() );

		$member = $this->subscribers->get_by_feed_token( $feed_token, $feed_key );
		if ( null === $member ) {
			return HttpError::forbidden( 'unknown or revoked feed_token' );
		}

		try {
			$jwt = Jwt::issue(
				$signing_key,
				[
					'issuer'         => $this->config->provider_url(),
					'audience'       => $audience,
					'subject'        => $member->uuid,
					'ttl_seconds'    => self::TTL_SECONDS,
					'tier_id'        => $member->tier_id,
					'entitlements'   => $member->features,
					'subscription_id'=> $member->subscription_id,
				]
			);
		} catch ( \Throwable $e ) {
			$this->logger->error( 'jwt issue failed', [ 'err' => $e->getMessage() ] );
			return HttpError::upstream( 'jwt', $e->getMessage() );
		}

		return new WP_REST_Response(
			[
				'access_token' => $jwt,
				'token_type'   => 'Bearer',
				'expires_in'   => self::TTL_SECONDS,
				'entitlements' => $member->features,
				'tier_id'      => $member->tier_id,
			]
		);
	}
}
