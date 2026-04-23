<?php
declare(strict_types=1);

namespace OmWp\Config;

defined( 'ABSPATH' ) || exit;

/**
 * Reads the plugin's configuration from wp_options + wp-config constants.
 *
 * Philosophy:
 *   - Secrets (stripe_secret_key, webhook_secret, hmac keys) prefer
 *     wp-config.php constants so they aren't stored in the database.
 *     If a constant is defined it wins over the DB value.
 *   - Structured configuration (tiers, offers, features) lives in the
 *     single 'om_wp_settings' option row as an associative array.
 *   - Every read goes through a typed accessor so callers get validated
 *     data rather than arbitrary option scalars.
 */
final class ConfigRepository {

	private const OPTION = 'om_wp_settings';

	public function all(): array {
		$settings = get_option( self::OPTION, [] );
		return is_array( $settings ) ? $settings : [];
	}

	public function save( array $settings ): void {
		update_option( self::OPTION, $settings, false );
	}

	public function spec_version(): string {
		return OM_WP_SPEC_VERSION;
	}

	public function provider_name(): string {
		return (string) ( $this->all()['provider_name'] ?? get_bloginfo( 'name' ) );
	}

	public function provider_url(): string {
		$url = (string) ( $this->all()['provider_url'] ?? home_url( '/' ) );
		return untrailingslashit( $url );
	}

	/**
	 * @return array<int,string>
	 */
	public function auth_methods(): array {
		$methods = $this->all()['auth_methods'] ?? [ 'url-token', 'bearer' ];
		if ( ! is_array( $methods ) ) {
			return [ 'url-token', 'bearer' ];
		}
		return array_values(
			array_filter(
				array_map( 'strval', $methods ),
				static fn( string $m ): bool => in_array(
					$m,
					[ 'url-token', 'http-basic', 'bearer', 'dpop', 'vc-presentation' ],
					true
				)
			)
		);
	}

	public function stripe_secret_key(): string {
		return $this->secret( 'OM_WP_STRIPE_SECRET_KEY', 'stripe_secret_key' );
	}

	public function stripe_webhook_secret(): string {
		return $this->secret( 'OM_WP_STRIPE_WEBHOOK_SECRET', 'stripe_webhook_secret' );
	}

	public function feed_token_key(): string {
		return $this->secret( 'OM_WP_FEED_TOKEN_KEY', 'feed_token_key' );
	}

	public function jwt_signing_key(): string {
		return $this->secret( 'OM_WP_JWT_SIGNING_KEY', 'jwt_signing_key' );
	}

	/**
	 * @return array<int, array{id:string,label:string,features:array<int,string>,price_ids:array<int,string>}>
	 */
	public function tiers(): array {
		$raw = $this->all()['tiers'] ?? [];
		if ( ! is_array( $raw ) ) {
			return [];
		}
		$out = [];
		foreach ( $raw as $t ) {
			if ( ! is_array( $t ) || empty( $t['id'] ) ) {
				continue;
			}
			$out[] = [
				'id'        => (string) $t['id'],
				'label'     => (string) ( $t['label'] ?? $t['id'] ),
				'features'  => array_values( array_map( 'strval', (array) ( $t['features'] ?? [] ) ) ),
				'price_ids' => array_values( array_map( 'strval', (array) ( $t['price_ids'] ?? [] ) ) ),
			];
		}
		return $out;
	}

	/**
	 * @return array<int, array{id:string,label:string}>
	 */
	public function features(): array {
		$raw = $this->all()['features'] ?? [];
		if ( ! is_array( $raw ) ) {
			return [];
		}
		$out = [];
		foreach ( $raw as $f ) {
			if ( ! is_array( $f ) || empty( $f['id'] ) ) {
				continue;
			}
			$out[] = [
				'id'    => (string) $f['id'],
				'label' => (string) ( $f['label'] ?? $f['id'] ),
			];
		}
		return $out;
	}

	/**
	 * @return array<int, array{id:string,tier:string,price:array<string,string>,checkout:array<string,string>,trial_days?:int}>
	 */
	public function offers(): array {
		$raw = $this->all()['offers'] ?? [];
		if ( ! is_array( $raw ) ) {
			return [];
		}
		$out = [];
		foreach ( $raw as $o ) {
			if ( ! is_array( $o ) || empty( $o['id'] ) ) {
				continue;
			}
			$entry = [
				'id'       => (string) $o['id'],
				'tier'     => (string) ( $o['tier'] ?? '' ),
				'price'    => [
					'amount'   => (string) ( $o['price']['amount'] ?? '' ),
					'currency' => (string) ( $o['price']['currency'] ?? 'USD' ),
					'period'   => (string) ( $o['price']['period'] ?? 'P1M' ),
				],
				'checkout' => [
					'psp'      => (string) ( $o['checkout']['psp'] ?? 'stripe' ),
					'price_id' => (string) ( $o['checkout']['price_id'] ?? '' ),
				],
			];
			if ( isset( $o['trial_days'] ) ) {
				$entry['trial_days'] = (int) $o['trial_days'];
			}
			$out[] = $entry;
		}
		return $out;
	}

	public function tier_for_price_id( string $price_id ): ?string {
		foreach ( $this->tiers() as $tier ) {
			if ( in_array( $price_id, $tier['price_ids'], true ) ) {
				return $tier['id'];
			}
		}
		return null;
	}

	/**
	 * @return array<int,string>
	 */
	public function features_for_tier( string $tier_id ): array {
		foreach ( $this->tiers() as $tier ) {
			if ( $tier['id'] === $tier_id ) {
				return $tier['features'];
			}
		}
		return [];
	}

	public function offer_by_id( string $offer_id ): ?array {
		foreach ( $this->offers() as $offer ) {
			if ( $offer['id'] === $offer_id ) {
				return $offer;
			}
		}
		return null;
	}

	public function revocation(): array {
		$s = $this->all();
		return [
			'policy'      => (string) ( $s['revocation_policy'] ?? 'prospective-only' ),
			'grace_hours' => (int) ( $s['revocation_grace_hours'] ?? 48 ),
		];
	}

	/**
	 * Returns true when the plugin has the minimum configuration required
	 * to serve /api/om/* and /feed/om/* endpoints.
	 */
	public function is_configured(): bool {
		return '' !== $this->stripe_secret_key()
			&& '' !== $this->stripe_webhook_secret()
			&& '' !== $this->feed_token_key()
			&& '' !== $this->jwt_signing_key();
	}

	private function secret( string $constant, string $option_key ): string {
		if ( defined( $constant ) ) {
			$v = constant( $constant );
			if ( is_string( $v ) && '' !== $v ) {
				return $v;
			}
		}
		return (string) ( $this->all()[ $option_key ] ?? '' );
	}
}
