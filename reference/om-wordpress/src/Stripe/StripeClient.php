<?php
declare(strict_types=1);

namespace OmWp\Stripe;

use Stripe\BillingPortal\Session as PortalSession;
use Stripe\Checkout\Session as CheckoutSession;
use Stripe\Customer;
use Stripe\Event;
use Stripe\StripeClient as SdkClient;
use Stripe\Subscription;
use Stripe\Webhook;

defined( 'ABSPATH' ) || exit;

/**
 * Thin wrapper around stripe/stripe-php.
 *
 * The wrapper exists so callers can be tested with a mock without
 * depending on the SDK directly, and so we have a single place to pin
 * the API version + timeouts.
 */
final class StripeClient {

	private const API_VERSION = '2025-02-24.acacia';

	private readonly SdkClient $sdk;

	public function __construct( string $secret_key ) {
		$this->sdk = new SdkClient(
			[
				'api_key'        => $secret_key,
				'stripe_version' => self::API_VERSION,
			]
		);
	}

	public function sdk(): SdkClient {
		return $this->sdk;
	}

	/**
	 * Create a Stripe Checkout Session for a subscription price.
	 *
	 * @param array{
	 *   price_id: string,
	 *   success_url: string,
	 *   cancel_url: string,
	 *   customer_email?: ?string,
	 *   client_reference_id?: ?string,
	 *   trial_days?: ?int,
	 * } $opts
	 */
	public function create_checkout_session( array $opts ): CheckoutSession {
		$params = [
			'mode'       => 'subscription',
			'line_items' => [
				[
					'price'    => $opts['price_id'],
					'quantity' => 1,
				],
			],
			'success_url' => $opts['success_url'],
			'cancel_url'  => $opts['cancel_url'],
		];
		if ( ! empty( $opts['customer_email'] ) ) {
			$params['customer_email'] = $opts['customer_email'];
		}
		if ( ! empty( $opts['client_reference_id'] ) ) {
			$params['client_reference_id'] = $opts['client_reference_id'];
		}
		if ( ! empty( $opts['trial_days'] ) ) {
			$params['subscription_data'] = [
				'trial_period_days' => (int) $opts['trial_days'],
			];
		}
		return $this->sdk->checkout->sessions->create( $params );
	}

	public function retrieve_checkout_session( string $session_id ): CheckoutSession {
		return $this->sdk->checkout->sessions->retrieve(
			$session_id,
			[ 'expand' => [ 'subscription', 'subscription.items.data.price', 'customer' ] ]
		);
	}

	public function retrieve_subscription( string $subscription_id ): Subscription {
		return $this->sdk->subscriptions->retrieve( $subscription_id );
	}

	public function retrieve_customer( string $customer_id ): Customer {
		return $this->sdk->customers->retrieve( $customer_id );
	}

	public function create_portal_session( string $customer_id, string $return_url ): PortalSession {
		return $this->sdk->billingPortal->sessions->create(
			[
				'customer'   => $customer_id,
				'return_url' => $return_url,
			]
		);
	}

	/**
	 * Verify a webhook signature and parse the payload.
	 *
	 * @throws \Stripe\Exception\SignatureVerificationException
	 */
	public function parse_webhook_event( string $raw_body, string $signature_header, string $signing_secret ): Event {
		return Webhook::constructEvent( $raw_body, $signature_header, $signing_secret );
	}
}
