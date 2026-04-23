<?php
declare(strict_types=1);

namespace OmWp\Api;

use OmWp\Config\ConfigRepository;
use OmWp\Logger;
use OmWp\Membership\SubscriberRepository;
use OmWp\Plugin;
use OmWp\Security\IdempotencyStore;
use OmWp\Security\RateLimiter;
use Stripe\Event;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Subscription;
use Stripe\Checkout\Session as CheckoutSession;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * POST /om/v1/webhook
 *
 * Stripe webhook sink. Verifies the signature, deduplicates by
 * event.id, and applies subscription-state changes to WP users.
 */
final class WebhookController {

	public function __construct(
		private readonly ConfigRepository $config,
		private readonly SubscriberRepository $subscribers,
		private readonly IdempotencyStore $idempotency,
		private readonly RateLimiter $rate_limiter,
		private readonly Logger $logger
	) {}

	public function handle( WP_REST_Request $req ) {
		// Rate limit under a fixed client id so Stripe's own retries
		// from multiple IPs don't hammer this if something goes wrong.
		$decision = $this->rate_limiter->check( 'webhook', 'stripe' );
		if ( ! $decision['allowed'] ) {
			return HttpError::rate_limited( $decision['retry_after'] );
		}

		$signature = $req->get_header( 'stripe_signature' );
		if ( null === $signature || '' === $signature ) {
			return HttpError::bad_request( 'missing stripe-signature header' );
		}

		$stripe = Plugin::instance()->stripe();
		$secret = $this->config->stripe_webhook_secret();
		if ( null === $stripe || '' === $secret ) {
			return HttpError::service_unavailable( 'stripe not configured' );
		}

		$raw_body = $req->get_body();

		try {
			$event = $stripe->parse_webhook_event( $raw_body, $signature, $secret );
		} catch ( SignatureVerificationException $e ) {
			$this->logger->warn( 'webhook signature verification failed', [ 'err' => $e->getMessage() ] );
			return HttpError::bad_request( 'signature verification failed' );
		} catch ( \Throwable $e ) {
			$this->logger->error( 'webhook parse failed', [ 'err' => $e->getMessage() ] );
			return HttpError::bad_request( 'webhook parse failed' );
		}

		if ( ! $this->idempotency->claim( $event->id ) ) {
			$this->logger->info( 'webhook dedup', [ 'event_id' => $event->id ] );
			return new WP_REST_Response( [ 'received' => true, 'dedup' => true ] );
		}

		try {
			$this->dispatch( $event );
		} catch ( \Throwable $e ) {
			// Returning 5xx lets Stripe retry on transient errors.
			$this->logger->error(
				'webhook dispatch failed',
				[ 'event_id' => $event->id, 'err' => $e->getMessage() ]
			);
			return HttpError::upstream( 'webhook', $e->getMessage() );
		}

		return new WP_REST_Response( [ 'received' => true ] );
	}

	private function dispatch( Event $event ): void {
		switch ( $event->type ) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated':
			case 'customer.subscription.deleted':
				$this->apply_subscription_event( $event );
				break;
			case 'checkout.session.completed':
				$this->apply_checkout_completed( $event );
				break;
			default:
				// Ignored event types.
				break;
		}
	}

	private function apply_subscription_event( Event $event ): void {
		/** @var Subscription $subscription */
		$subscription = $event->data->object;

		$customer_id = is_string( $subscription->customer )
			? $subscription->customer
			: $subscription->customer->id;

		$user_id = $this->resolve_user_id( $customer_id );
		if ( null === $user_id ) {
			$this->logger->warn(
				'subscription event for unknown WP user',
				[ 'customer' => $customer_id, 'event_id' => $event->id ]
			);
			return;
		}

		if ( 'customer.subscription.deleted' === $event->type
			|| 'canceled' === $subscription->status
		) {
			$this->subscribers->clear_state( $user_id );
			return;
		}

		$price_id = $subscription->items->data[0]->price->id ?? null;

		$this->subscribers->upsert_state(
			$user_id,
			[
				'customer_id'     => $customer_id,
				'subscription_id' => $subscription->id,
				'status'          => (string) $subscription->status,
				'price_id'        => $price_id,
			],
			$this->config->feed_token_key()
		);
	}

	private function apply_checkout_completed( Event $event ): void {
		/** @var CheckoutSession $session */
		$session = $event->data->object;

		if ( ! is_string( $session->customer ) && ! ( $session->customer ?? null ) ) {
			return;
		}
		$customer_id = is_string( $session->customer ) ? $session->customer : $session->customer->id;

		// If the checkout carries a client_reference_id we recognize as
		// a WP user id, prefer it. Otherwise fall back to the customer
		// lookup path (metadata + email).
		$user_id = null;
		if ( $session->client_reference_id ) {
			$candidate = absint( $session->client_reference_id );
			if ( $candidate > 0 && get_userdata( $candidate ) ) {
				$user_id = $candidate;
			}
		}
		if ( null === $user_id ) {
			$user_id = $this->resolve_user_id( $customer_id );
		}
		if ( null === $user_id ) {
			$this->logger->warn(
				'checkout.session.completed for unknown WP user',
				[ 'customer' => $customer_id, 'event_id' => $event->id ]
			);
			return;
		}

		// The subscription id is under session.subscription. If the
		// SDK expanded it, it's an object; otherwise a string.
		$subscription_id = null;
		$price_id        = null;
		$status          = 'active';
		if ( $session->subscription instanceof Subscription ) {
			$subscription_id = $session->subscription->id;
			$price_id        = $session->subscription->items->data[0]->price->id ?? null;
			$status          = (string) $session->subscription->status;
		} elseif ( is_string( $session->subscription ) ) {
			$subscription_id = $session->subscription;
		}

		$this->subscribers->upsert_state(
			$user_id,
			[
				'customer_id'     => $customer_id,
				'subscription_id' => $subscription_id,
				'status'          => $status,
				'price_id'        => $price_id,
			],
			$this->config->feed_token_key()
		);
	}

	/**
	 * Find the WP user id for a Stripe customer. We prefer existing
	 * `om_stripe_customer_id` rows; if the customer is new to us we
	 * consult the customer's metadata (`wp_user_id`) and finally the
	 * email address.
	 */
	private function resolve_user_id( string $customer_id ): ?int {
		$existing = $this->subscribers->get_by_stripe_customer( $customer_id );
		if ( null !== $existing ) {
			return $existing->user_id;
		}

		$stripe = Plugin::instance()->stripe();
		if ( null === $stripe ) {
			return null;
		}

		try {
			$customer = $stripe->retrieve_customer( $customer_id );
		} catch ( \Throwable $e ) {
			$this->logger->warn( 'customer lookup failed', [ 'err' => $e->getMessage() ] );
			return null;
		}

		if ( ! empty( $customer->metadata['wp_user_id'] ) ) {
			$uid = absint( $customer->metadata['wp_user_id'] );
			if ( $uid > 0 && get_userdata( $uid ) ) {
				return $uid;
			}
		}

		if ( ! empty( $customer->email ) ) {
			$user = get_user_by( 'email', $customer->email );
			if ( $user ) {
				return $user->ID;
			}
		}

		return null;
	}
}
