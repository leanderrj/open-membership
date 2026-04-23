<?php
declare(strict_types=1);

namespace OmWp\Membership;

use OmWp\Config\ConfigRepository;
use OmWp\Security\FeedToken;
use WP_User;

defined( 'ABSPATH' ) || exit;

/**
 * Subscriber data access: WP users + user meta.
 *
 * We do NOT maintain a parallel subscriber table. A subscriber is just
 * a WP user with om-prefixed meta keys set by the webhook handler:
 *
 *   om_stripe_customer_id   Stripe customer id
 *   om_subscription_id      active Stripe subscription id
 *   om_subscription_status  Stripe status string (active|trialing|past_due|canceled|…)
 *   om_subscription_price   Stripe price id of the active subscription
 *
 * The tier and feature list are DERIVED on read from price_id + the
 * configured tier mapping, never stored. This means a tier reshuffle
 * takes effect the moment the admin saves settings.
 */
final class SubscriberRepository {

	public const META_CUSTOMER      = 'om_stripe_customer_id';
	public const META_SUBSCRIPTION  = 'om_subscription_id';
	public const META_STATUS        = 'om_subscription_status';
	public const META_PRICE         = 'om_subscription_price';

	public function __construct(
		private readonly ?ConfigRepository $config = null,
	) {}

	public function get_by_id( int $user_id ): ?MemberState {
		$user = get_user_by( 'id', $user_id );
		return $user ? $this->from_user( $user ) : null;
	}

	public function get_by_email( string $email ): ?MemberState {
		$user = get_user_by( 'email', $email );
		return $user ? $this->from_user( $user ) : null;
	}

	public function get_by_stripe_customer( string $customer_id ): ?MemberState {
		$users = get_users(
			[
				'meta_key'   => self::META_CUSTOMER, // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value' => $customer_id,        // phpcs:ignore WordPress.DB.SlowDBQuery
				'number'     => 1,
				'fields'     => 'all',
			]
		);
		if ( empty( $users ) ) {
			return null;
		}
		return $this->from_user( $users[0] );
	}

	public function get_by_feed_token(
		string $token,
		string $feed_token_key
	): ?MemberState {
		// Without the Admin API-style "iterate every member" fallback
		// om-ghost has, we need a per-token index. We keep an index in
		// a user meta row keyed by the token hash for O(1) lookup.
		$index_key = 'om_feed_token_idx';
		$users = get_users(
			[
				'meta_key'   => $index_key, // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value' => $token,     // phpcs:ignore WordPress.DB.SlowDBQuery
				'number'     => 1,
				'fields'     => 'all',
			]
		);
		if ( empty( $users ) ) {
			return null;
		}
		$state = $this->from_user( $users[0] );
		if ( null === $state ) {
			return null;
		}

		// Defence in depth: recompute HMAC and confirm it matches the
		// stored index. Protects against meta-row tampering.
		$plan = (string) get_user_meta( $state->user_id, self::META_PRICE, true );
		if ( '' === $plan ) {
			$plan = $state->tier_id;
		}
		if ( ! FeedToken::verify( $feed_token_key, $token, $state->uuid, $plan ) ) {
			return null;
		}
		return $state;
	}

	/**
	 * Persist the subscription state and refresh the feed-token index.
	 * Called from the webhook handler.
	 *
	 * @param array{
	 *   customer_id: string,
	 *   subscription_id: ?string,
	 *   status: string,
	 *   price_id: ?string,
	 * } $data
	 */
	public function upsert_state(
		int $user_id,
		array $data,
		string $feed_token_key
	): void {
		update_user_meta( $user_id, self::META_CUSTOMER, $data['customer_id'] );
		update_user_meta( $user_id, self::META_SUBSCRIPTION, $data['subscription_id'] ?? '' );
		update_user_meta( $user_id, self::META_STATUS, $data['status'] );
		update_user_meta( $user_id, self::META_PRICE, $data['price_id'] ?? '' );

		// Regenerate the feed-token index. The UUID we use for the HMAC
		// is the WordPress user_registered timestamp combined with the
		// user id; both are stable for the user's lifetime.
		$uuid  = $this->uuid_for_user( $user_id );
		$plan  = $data['price_id'] ?? '';
		if ( '' === $plan ) {
			$plan = $data['status'];
		}
		$token = FeedToken::issue( $feed_token_key, $uuid, $plan );
		update_user_meta( $user_id, 'om_feed_token_idx', $token );
	}

	public function clear_state( int $user_id ): void {
		delete_user_meta( $user_id, self::META_SUBSCRIPTION );
		delete_user_meta( $user_id, self::META_STATUS );
		delete_user_meta( $user_id, self::META_PRICE );
		delete_user_meta( $user_id, 'om_feed_token_idx' );
		// Keep the customer_id so we can still link Stripe events back
		// to the user if they resubscribe.
	}

	/**
	 * Issue a fresh feed token for a subscriber and persist the index.
	 * Exposed so the plugin can regenerate the token on demand (e.g.
	 * admin action after key rotation).
	 */
	public function issue_feed_token( int $user_id, string $feed_token_key ): string {
		$uuid = $this->uuid_for_user( $user_id );
		$plan = (string) get_user_meta( $user_id, self::META_PRICE, true );
		if ( '' === $plan ) {
			$plan = (string) get_user_meta( $user_id, self::META_STATUS, true );
		}
		$token = FeedToken::issue( $feed_token_key, $uuid, $plan );
		update_user_meta( $user_id, 'om_feed_token_idx', $token );
		return $token;
	}

	public function uuid_for_user( int $user_id ): string {
		$user = get_user_by( 'id', $user_id );
		if ( ! $user instanceof WP_User ) {
			return (string) $user_id;
		}
		// A stable opaque identifier. Uses user_registered so the UUID
		// doesn't change if the admin renames the user.
		return hash( 'sha256', 'om-wp:' . $user->ID . ':' . $user->user_registered );
	}

	private function from_user( WP_User $user ): MemberState {
		$status  = (string) get_user_meta( $user->ID, self::META_STATUS, true );
		$status  = '' !== $status ? $status : 'none';
		$price   = (string) get_user_meta( $user->ID, self::META_PRICE, true );
		$sub     = (string) get_user_meta( $user->ID, self::META_SUBSCRIPTION, true );
		$cust    = (string) get_user_meta( $user->ID, self::META_CUSTOMER, true );

		$tier_id = 'free';
		$feats   = [];
		if ( $this->config && '' !== $price ) {
			$mapped = $this->config->tier_for_price_id( $price );
			if ( null !== $mapped ) {
				$tier_id = $mapped;
				$feats   = $this->config->features_for_tier( $tier_id );
			}
		}

		return new MemberState(
			$user->ID,
			$this->uuid_for_user( $user->ID ),
			$user->user_email ?: null,
			$tier_id,
			'' !== $sub ? $sub : null,
			$status,
			$feats,
			'' !== $cust ? $cust : null,
		);
	}
}
