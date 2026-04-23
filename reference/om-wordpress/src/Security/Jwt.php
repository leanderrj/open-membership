<?php
declare(strict_types=1);

namespace OmWp\Security;

use Firebase\JWT\JWT as FirebaseJwt;
use Firebase\JWT\Key;
use UnexpectedValueException;

defined( 'ABSPATH' ) || exit;

/**
 * HS256 JWT issuance + verification via firebase/php-jwt.
 *
 * Same rationale as om-ghost: the sidecar/plugin is both issuer and
 * verifier, so symmetric signing is fine. When we add Level 4
 * conformance (VC presentation) this switches to EdDSA with a JWKs
 * endpoint.
 */
final class Jwt {

	public const ALG = 'HS256';

	/**
	 * @param array{
	 *   issuer: string,
	 *   audience: string,
	 *   subject: string,
	 *   ttl_seconds: int,
	 *   tier_id: string,
	 *   entitlements: array<int,string>,
	 *   subscription_id?: ?string,
	 *   pseudonym?: ?string,
	 * } $opts
	 */
	public static function issue( string $signing_key, array $opts ): string {
		$now = time();
		$payload = [
			'iss'          => $opts['issuer'],
			'sub'          => $opts['subject'],
			'aud'          => $opts['audience'],
			'iat'          => $now,
			'exp'          => $now + max( 1, (int) $opts['ttl_seconds'] ),
			'tier_id'      => $opts['tier_id'],
			'entitlements' => array_values( $opts['entitlements'] ),
		];
		if ( ! empty( $opts['subscription_id'] ) ) {
			$payload['subscription_id'] = (string) $opts['subscription_id'];
		}
		if ( ! empty( $opts['pseudonym'] ) ) {
			$payload['pseudonym'] = (string) $opts['pseudonym'];
		}
		return FirebaseJwt::encode( $payload, $signing_key, self::ALG );
	}

	/**
	 * @return array<string,mixed>
	 */
	public static function verify(
		string $signing_key,
		string $token,
		string $expected_issuer,
		string $expected_audience
	): array {
		$decoded = FirebaseJwt::decode( $token, new Key( $signing_key, self::ALG ) );
		$claims  = (array) $decoded;

		if ( ( $claims['iss'] ?? '' ) !== $expected_issuer ) {
			throw new UnexpectedValueException( 'issuer mismatch' );
		}
		$aud = $claims['aud'] ?? '';
		if ( is_array( $aud ) ) {
			if ( ! in_array( $expected_audience, $aud, true ) ) {
				throw new UnexpectedValueException( 'audience mismatch' );
			}
		} elseif ( $aud !== $expected_audience ) {
			throw new UnexpectedValueException( 'audience mismatch' );
		}
		return $claims;
	}
}
