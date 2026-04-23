<?php
declare(strict_types=1);

namespace OmWp\Feed;

use OmWp\Config\ConfigRepository;
use OmWp\Logger;
use OmWp\Membership\SubscriberRepository;
use OmWp\Security\RateLimiter;
use WP_Query;

defined( 'ABSPATH' ) || exit;

/**
 * Serves /feed/om/{token}/ and /.well-known/open-membership.
 *
 * Wired through WP's rewrite system: a custom query var `om_feed_token`
 * is populated by the rule registered in Activator. On parse_request we
 * detect the query var and render the feed ourselves — ahead of any
 * theme or WP template loading — because feeds don't want themes.
 */
final class FeedController {

	public function __construct(
		private readonly ConfigRepository $config,
		private readonly SubscriberRepository $subscribers,
		private readonly RateLimiter $rate_limiter,
		private readonly Logger $logger,
	) {}

	public function register(): void {
		add_filter(
			'query_vars',
			static function ( array $vars ): array {
				$vars[] = 'om_feed_token';
				$vars[] = 'om_well_known';
				return $vars;
			}
		);

		// Idempotently register the rules in case Activator's flush
		// hasn't run (e.g. plugin updated without deactivation).
		add_action(
			'init',
			static function (): void {
				add_rewrite_rule(
					'^feed/om/([^/]+)/?$',
					'index.php?om_feed_token=$matches[1]',
					'top'
				);
				add_rewrite_rule(
					'^\.well-known/open-membership/?$',
					'index.php?om_well_known=1',
					'top'
				);
			},
			5
		);

		add_action( 'parse_request', [ $this, 'handle' ] );
	}

	public function handle( \WP $wp ): void {
		if ( ! empty( $wp->query_vars['om_well_known'] ) ) {
			$this->serve_well_known();
			exit;
		}
		$token = (string) ( $wp->query_vars['om_feed_token'] ?? '' );
		if ( '' !== $token ) {
			$this->serve_feed( $token );
			exit;
		}
	}

	private function serve_well_known(): void {
		$controller = new \OmWp\Api\DiscoveryController( $this->config );
		$doc        = $controller->build();
		status_header( 200 );
		nocache_headers();
		header( 'Content-Type: application/json; charset=utf-8' );
		echo wp_json_encode( $doc, JSON_UNESCAPED_SLASHES ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	private function serve_feed( string $token ): void {
		$decision = $this->rate_limiter->check( 'feed', RateLimiter::client_id_for_request() );
		if ( ! $decision['allowed'] ) {
			status_header( 429 );
			header( 'Retry-After: ' . (string) $decision['retry_after'] );
			header( 'Content-Type: application/json; charset=utf-8' );
			echo wp_json_encode(
				[
					'error' => [
						'code'    => 'rate_limited',
						'message' => 'rate limit exceeded',
					],
				]
			); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return;
		}

		$feed_key = $this->config->feed_token_key();
		if ( '' === $feed_key ) {
			$this->serve_error( 503, 'plugin not configured' );
			return;
		}

		$member = $this->subscribers->get_by_feed_token( $token, $feed_key );
		$posts  = $member ? $this->recent_posts() : [];

		$xml = ( new FeedRenderer( $this->config ) )->render( $member, $posts, $token );

		status_header( $member ? 200 : 403 );
		nocache_headers();
		header( 'Content-Type: application/rss+xml; charset=utf-8' );
		header( 'Cache-Control: private, max-age=60' );
		echo $xml; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * @return array<int, \WP_Post>
	 */
	private function recent_posts(): array {
		$query = new WP_Query(
			[
				'post_type'      => 'post',
				'post_status'    => 'publish',
				'posts_per_page' => 50,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'ignore_sticky_posts' => true,
				'no_found_rows'  => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
				'suppress_filters'       => false,
			]
		);
		return $query->posts;
	}

	private function serve_error( int $status, string $message ): void {
		status_header( $status );
		nocache_headers();
		header( 'Content-Type: application/json; charset=utf-8' );
		echo wp_json_encode(
			[
				'error' => [ 'code' => (string) $status, 'message' => $message ],
			]
		); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
}
