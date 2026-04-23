<?php
declare(strict_types=1);

namespace OmWp\Security;

defined( 'ABSPATH' ) || exit;

/**
 * Fixed-window per-IP rate limiter backed by transients.
 *
 * Not as tight as a token bucket, and transients on Memcached or Redis
 * drops are eventually consistent, but this is sufficient for "absorb
 * obvious abuse on public endpoints". For strict limits under high
 * concurrency, back this with an external service (Redis w/ Lua).
 *
 * Defaults per bucket are chosen to match om-ghost's DEFAULT_BUCKETS
 * so operators get roughly the same behavior across the reference
 * implementations.
 */
final class RateLimiter {

	/** @var array<string, array{capacity:int, window:int}> */
	private const BUCKETS = [
		'checkout'     => [ 'capacity' => 10, 'window' => 60 ],
		'token'        => [ 'capacity' => 30, 'window' => 60 ],
		'entitlements' => [ 'capacity' => 60, 'window' => 60 ],
		'portal'       => [ 'capacity' => 5,  'window' => 60 ],
		'feed'         => [ 'capacity' => 120, 'window' => 60 ],
		'webhook'      => [ 'capacity' => 600, 'window' => 60 ],
	];

	/**
	 * @return array{allowed:bool, retry_after:int, remaining:int}
	 */
	public function check( string $bucket, string $client_id ): array {
		$cfg = self::BUCKETS[ $bucket ] ?? self::BUCKETS['entitlements'];
		$now = time();
		$window_start = $now - ( $now % $cfg['window'] );
		$key = 'om_rl_' . $bucket . '_' . md5( $client_id . ':' . (string) $window_start );

		$current = (int) get_transient( $key );
		if ( $current >= $cfg['capacity'] ) {
			return [
				'allowed'     => false,
				'retry_after' => max( 1, $window_start + $cfg['window'] - $now ),
				'remaining'   => 0,
			];
		}

		// Best-effort increment. Transients aren't atomic, so under
		// heavy parallel load this may allow a small overshoot; see
		// class docstring.
		set_transient( $key, $current + 1, $cfg['window'] * 2 );
		return [
			'allowed'     => true,
			'retry_after' => 0,
			'remaining'   => max( 0, $cfg['capacity'] - ( $current + 1 ) ),
		];
	}

	public static function client_id_for_request(): string {
		// The Stripe webhook is shared across many requests; callers
		// pass a fixed client_id there. For everything else we use the
		// requester's IP, resolved behind up to one proxy layer.
		$ip = '';
		if ( ! empty( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) {
			$ip = (string) $_SERVER['HTTP_CF_CONNECTING_IP'];
		} elseif ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
			$xff = explode( ',', (string) $_SERVER['HTTP_X_FORWARDED_FOR'], 2 );
			$ip  = trim( $xff[0] );
		} elseif ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
			$ip = (string) $_SERVER['REMOTE_ADDR'];
		}
		$ip = preg_replace( '/[^a-fA-F0-9:.]/', '', $ip ) ?? '';
		return '' !== $ip ? $ip : 'unknown';
	}
}
