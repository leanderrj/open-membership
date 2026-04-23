<?php
declare(strict_types=1);

namespace OmWp\Membership;

defined( 'ABSPATH' ) || exit;

/**
 * Immutable view of a subscriber's om-level state.
 *
 * Mirrors shared/types.ts MemberState in om-ghost. Derived from WP
 * user meta + the configured tier/price mapping. Handlers use this
 * everywhere instead of reading user meta directly so state is
 * single-sourced.
 */
final class MemberState {

	/**
	 * @param array<int, string> $features
	 */
	public function __construct(
		public readonly int $user_id,
		public readonly string $uuid,
		public readonly ?string $email,
		public readonly string $tier_id,
		public readonly ?string $subscription_id,
		public readonly string $subscription_status,
		public readonly array $features,
		public readonly ?string $stripe_customer_id = null
	) {}

	public function is_active(): bool {
		return in_array( $this->subscription_status, [ 'active', 'trialing' ], true );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return [
			'user_id'             => $this->user_id,
			'uuid'                => $this->uuid,
			'email'               => $this->email,
			'tier_id'             => $this->tier_id,
			'subscription_id'     => $this->subscription_id,
			'subscription_status' => $this->subscription_status,
			'features'            => $this->features,
			'stripe_customer_id'  => $this->stripe_customer_id,
		];
	}
}
