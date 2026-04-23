<?php
declare(strict_types=1);

namespace OmWp\Api;

use OmWp\Config\ConfigRepository;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the .well-known/open-membership document.
 *
 * Composes the per-publisher config with the plugin's endpoint URIs.
 * Served both under /wp-json/om/v1/discovery and at the SPEC-required
 * /.well-known/open-membership path (see Feed/WellKnownRoute).
 */
final class DiscoveryController {

	public function __construct( private readonly ConfigRepository $config ) {}

	public function handle( WP_REST_Request $req ): WP_REST_Response {
		unset( $req );
		return new WP_REST_Response( $this->build() );
	}

	public function build(): array {
		$c = $this->config;

		$tiers = array_map(
			static fn( array $t ): array => [
				'id'       => $t['id'],
				'label'    => $t['label'],
				'features' => $t['features'],
			],
			$c->tiers()
		);

		$offers = array_map(
			static fn( array $o ): array => array_filter(
				[
					'id'       => $o['id'],
					'tier'     => $o['tier'],
					'price'    => $o['price'],
					'checkout' => [
						'psp'      => $o['checkout']['psp'],
						'endpoint' => rest_url( OM_WP_REST_NAMESPACE . '/checkout' ),
					],
					'trial_days' => $o['trial_days'] ?? null,
				],
				static fn( $v ): bool => null !== $v,
			),
			$c->offers()
		);

		$doc = [
			'spec_version' => $c->spec_version(),
			'provider'     => [
				'url'  => $c->provider_url(),
				'name' => $c->provider_name(),
			],
			'auth_methods' => $c->auth_methods(),
			'tiers'        => $tiers,
			'features'     => $c->features(),
			'offers'       => $offers,
			'psps'         => [
				'stripe' => [ 'mode' => 'native-entitlements' ],
			],
			'revocation'   => $c->revocation(),
			'endpoints'    => [
				'checkout'     => rest_url( OM_WP_REST_NAMESPACE . '/checkout' ),
				'entitlements' => rest_url( OM_WP_REST_NAMESPACE . '/entitlements' ),
				'token'        => rest_url( OM_WP_REST_NAMESPACE . '/token' ),
				'portal'       => rest_url( OM_WP_REST_NAMESPACE . '/portal' ),
				'webhook'      => rest_url( OM_WP_REST_NAMESPACE . '/webhook' ),
			],
		];

		return $doc;
	}
}
