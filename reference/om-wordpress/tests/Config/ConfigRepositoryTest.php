<?php
declare(strict_types=1);

namespace OmWp\Tests\Config;

use OmWp\Config\ConfigRepository;
use PHPUnit\Framework\TestCase;

final class ConfigRepositoryTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['om_wp_test_options'] = [];
	}

	public function test_tier_for_price_id_matches_configured_price(): void {
		update_option(
			'om_wp_settings',
			[
				'tiers' => [
					[
						'id'        => 'paid',
						'label'     => 'Supporter',
						'features'  => [ 'full-text' ],
						'price_ids' => [ 'price_123' ],
					],
				],
			]
		);
		$c = new ConfigRepository();
		$this->assertSame( 'paid', $c->tier_for_price_id( 'price_123' ) );
		$this->assertNull( $c->tier_for_price_id( 'price_other' ) );
	}

	public function test_features_for_tier_returns_list(): void {
		update_option(
			'om_wp_settings',
			[
				'tiers' => [
					[
						'id'        => 'paid',
						'label'     => 'Supporter',
						'features'  => [ 'full-text', 'ad-free' ],
						'price_ids' => [],
					],
				],
			]
		);
		$c = new ConfigRepository();
		$this->assertSame( [ 'full-text', 'ad-free' ], $c->features_for_tier( 'paid' ) );
		$this->assertSame( [], $c->features_for_tier( 'unknown' ) );
	}

	public function test_is_configured_requires_all_secrets(): void {
		$c = new ConfigRepository();
		$this->assertFalse( $c->is_configured() );

		update_option(
			'om_wp_settings',
			[
				'stripe_secret_key'     => 'sk_test_x',
				'stripe_webhook_secret' => 'whsec_x',
				'feed_token_key'        => bin2hex( random_bytes( 32 ) ),
				'jwt_signing_key'       => bin2hex( random_bytes( 32 ) ),
			]
		);
		$this->assertTrue( ( new ConfigRepository() )->is_configured() );
	}

	public function test_auth_methods_filters_unknown_values(): void {
		update_option(
			'om_wp_settings',
			[ 'auth_methods' => [ 'url-token', 'garbage', 'bearer' ] ]
		);
		$c = new ConfigRepository();
		$this->assertSame( [ 'url-token', 'bearer' ], $c->auth_methods() );
	}

	public function test_constants_override_database(): void {
		if ( ! defined( 'OM_WP_STRIPE_SECRET_KEY' ) ) {
			define( 'OM_WP_STRIPE_SECRET_KEY', 'sk_from_constant' );
		}
		update_option(
			'om_wp_settings',
			[ 'stripe_secret_key' => 'sk_from_db' ]
		);
		$c = new ConfigRepository();
		$this->assertSame( 'sk_from_constant', $c->stripe_secret_key() );
	}

	public function test_provider_url_untrailingslashes(): void {
		update_option( 'om_wp_settings', [ 'provider_url' => 'https://publisher.example/' ] );
		$c = new ConfigRepository();
		$this->assertSame( 'https://publisher.example', $c->provider_url() );
	}
}
