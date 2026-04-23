<?php
declare(strict_types=1);

namespace OmWp\Security;

defined( 'ABSPATH' ) || exit;

/**
 * HMAC-SHA256 feed tokens.
 *
 *   token = base64url( HMAC-SHA256(signing_key, user_id + ":" + plan_id) )
 *
 * Mirrors om-ghost's feed-token derivation. Deterministic for a given
 * (user_id, plan_id) pair so the subscriber's feed URL is stable. The
 * FeedController revalidates the user's subscription_status on every
 * request; the token is not separately "revoked".
 */
final class FeedToken {

	public static function issue( string $signing_key, string $user_id, string $plan_id ): string {
		$mac = hash_hmac( 'sha256', $user_id . ':' . $plan_id, $signing_key, true );
		return self::base64url( $mac );
	}

	public static function verify(
		string $signing_key,
		string $token,
		string $user_id,
		string $plan_id
	): bool {
		$expected = self::issue( $signing_key, $user_id, $plan_id );
		return hash_equals( $expected, $token );
	}

	private static function base64url( string $bin ): string {
		return rtrim( strtr( base64_encode( $bin ), '+/', '-_' ), '=' );
	}
}
