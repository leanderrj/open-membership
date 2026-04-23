<?php
declare(strict_types=1);

namespace OmWp\Feed;

use DOMDocument;
use DOMElement;
use OmWp\Config\ConfigRepository;
use OmWp\Membership\MemberState;
use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the RSS 2.0 + om: XML for a subscriber.
 *
 * Uses DOMDocument for correctness: element-body text content is
 * escaped automatically, attributes are quoted, CDATA sections are
 * explicit when we want raw HTML through (om:preview, content:encoded).
 *
 * Per-post access decision mirrors om-ghost's decideAccess():
 *
 *   post meta `om_access`:
 *     'public'       → om:access open, full content
 *     'members'      → om:access members-only, content if subscribed
 *     'paid'         → om:access locked, content iff paid tier
 *     'tiers'        → om:access locked, content iff tier matches
 *                      the comma-separated `om_required_tiers` meta
 *
 * The legacy WordPress post_status flow (public vs password-protected)
 * is NOT used for access control; we only consult the om_* meta so
 * operators have a single, explicit knob.
 */
final class FeedRenderer {

	public const OM_ACCESS_META       = 'om_access';
	public const OM_TIERS_META        = 'om_required_tiers';
	public const OM_FEATURES_META     = 'om_required_features';
	public const OM_NS                = 'http://purl.org/rss/modules/membership/';

	public function __construct( private readonly ConfigRepository $config ) {}

	/**
	 * @param array<int,WP_Post> $posts
	 */
	public function render( ?MemberState $member, array $posts, string $feed_token_in_url ): string {
		$dom = new DOMDocument( '1.0', 'UTF-8' );
		$dom->formatOutput = false;

		$rss = $dom->createElement( 'rss' );
		$rss->setAttribute( 'version', '2.0' );
		$rss->setAttribute( 'xmlns:content', 'http://purl.org/rss/1.0/modules/content/' );
		$rss->setAttribute( 'xmlns:atom', 'http://www.w3.org/2005/Atom' );
		$rss->setAttribute( 'xmlns:om', self::OM_NS );
		$rss->setAttribute( 'xmlns:dc', 'http://purl.org/dc/elements/1.1/' );
		$dom->appendChild( $rss );

		$channel = $dom->createElement( 'channel' );
		$rss->appendChild( $channel );

		$base      = $this->config->provider_url();
		$feed_self = $base . '/feed/om/' . rawurlencode( $feed_token_in_url ) . '/';

		$this->text( $dom, $channel, 'title', $this->config->provider_name() );
		$this->text( $dom, $channel, 'link', $base );
		$this->text(
			$dom,
			$channel,
			'description',
			sprintf( 'Open Membership feed for %s', $this->config->provider_name() )
		);
		$this->text( $dom, $channel, 'language', get_bloginfo( 'language' ) ?: 'en' );

		$atom = $dom->createElement( 'atom:link' );
		$atom->setAttribute( 'href', $feed_self );
		$atom->setAttribute( 'rel', 'self' );
		$atom->setAttribute( 'type', 'application/rss+xml' );
		$channel->appendChild( $atom );

		$this->text( $dom, $channel, 'om:provider', $base );
		$this->text( $dom, $channel, 'om:discovery', $base . '/.well-known/open-membership/' );

		foreach ( $this->config->auth_methods() as $method ) {
			$this->text( $dom, $channel, 'om:authMethod', $method );
		}

		foreach ( $this->config->tiers() as $tier ) {
			$el = $this->text( $dom, $channel, 'om:tier', $tier['label'] );
			$el->setAttribute( 'id', $tier['id'] );
		}

		foreach ( $this->config->features() as $feature ) {
			$el = $this->text( $dom, $channel, 'om:feature', $feature['label'] );
			$el->setAttribute( 'id', $feature['id'] );
		}

		$revocation = $this->config->revocation();
		$rev        = $dom->createElement( 'om:revocation' );
		$rev->setAttribute( 'policy', $revocation['policy'] );
		$rev->setAttribute( 'grace_hours', (string) $revocation['grace_hours'] );
		$channel->appendChild( $rev );

		if ( null === $member ) {
			$this->text( $dom, $channel, 'om:access', 'members-only' );
			$this->render_not_entitled_stub_item( $dom, $channel, $base, $feed_token_in_url );
			return (string) $dom->saveXML();
		}

		foreach ( $posts as $post ) {
			$this->render_item( $dom, $channel, $post, $member );
		}

		return (string) $dom->saveXML();
	}

	private function render_item(
		DOMDocument $dom,
		DOMElement $channel,
		WP_Post $post,
		MemberState $member
	): void {
		$item = $dom->createElement( 'item' );
		$channel->appendChild( $item );

		$this->text( $dom, $item, 'title', (string) get_the_title( $post ) );
		$permalink = (string) get_permalink( $post );
		$this->text( $dom, $item, 'link', $permalink );
		$guid = $this->text( $dom, $item, 'guid', $permalink );
		$guid->setAttribute( 'isPermaLink', 'true' );
		$this->text( $dom, $item, 'pubDate', $this->rfc822( $post ) );

		$author = get_the_author_meta( 'display_name', (int) $post->post_author );
		if ( '' !== (string) $author ) {
			$this->text( $dom, $item, 'dc:creator', (string) $author );
		}

		$decision = $this->decide_access( $post, $member );
		$this->text( $dom, $item, 'om:access', $decision['access'] );
		foreach ( $decision['required_features'] as $f ) {
			$this->text( $dom, $item, 'om:feature', $f );
		}

		$preview = $this->preview_for( $post );
		if ( '' !== $preview ) {
			$prev_el = $dom->createElement( 'om:preview' );
			$prev_el->appendChild( $dom->createCDATASection( $preview ) );
			$item->appendChild( $prev_el );
		}

		if ( $decision['grant_content'] ) {
			$html = apply_filters( 'the_content', $post->post_content );
			if ( ! is_string( $html ) ) {
				$html = $post->post_content;
			}
			$content = $dom->createElement( 'content:encoded' );
			$content->appendChild( $dom->createCDATASection( (string) $html ) );
			$item->appendChild( $content );

			$excerpt = get_the_excerpt( $post );
			$this->text( $dom, $item, 'description', (string) $excerpt );
		} else {
			$this->text(
				$dom,
				$item,
				'om:unlock',
				rest_url( OM_WP_REST_NAMESPACE . '/token' )
			);
			$desc = '' !== $preview ? $preview : __( 'Members-only content. Preview unavailable.', 'om-wordpress' );
			$this->text( $dom, $item, 'description', $desc );
		}
	}

	/**
	 * @return array{access:string, required_features:array<int,string>, grant_content:bool}
	 */
	public function decide_access( WP_Post $post, MemberState $member ): array {
		$access = (string) get_post_meta( $post->ID, self::OM_ACCESS_META, true );
		if ( '' === $access ) {
			$access = 'public';
		}
		$features_raw = (string) get_post_meta( $post->ID, self::OM_FEATURES_META, true );
		$required     = [];
		if ( '' !== $features_raw ) {
			$required = array_values( array_filter( array_map( 'trim', explode( ',', $features_raw ) ) ) );
		}

		switch ( $access ) {
			case 'public':
			case 'open':
				return [
					'access'            => 'open',
					'required_features' => [],
					'grant_content'     => true,
				];

			case 'members':
			case 'members-only':
				return [
					'access'            => 'members-only',
					'required_features' => $required,
					'grant_content'     => $member->is_active() || 'free' !== $member->tier_id,
				];

			case 'paid':
				return [
					'access'            => 'locked',
					'required_features' => $required,
					'grant_content'     => $member->is_active() && 'free' !== $member->tier_id,
				];

			case 'tiers':
				$allowed = (string) get_post_meta( $post->ID, self::OM_TIERS_META, true );
				$allowed_list = array_values(
					array_filter(
						array_map( 'trim', explode( ',', $allowed ) )
					)
				);
				return [
					'access'            => 'locked',
					'required_features' => $required,
					'grant_content'     => $member->is_active()
						&& in_array( $member->tier_id, $allowed_list, true ),
				];

			default:
				return [
					'access'            => 'locked',
					'required_features' => $required,
					'grant_content'     => false,
				];
		}
	}

	private function render_not_entitled_stub_item(
		DOMDocument $dom,
		DOMElement $channel,
		string $base,
		string $feed_token_in_url
	): void {
		$item = $dom->createElement( 'item' );
		$channel->appendChild( $item );
		$this->text( $dom, $item, 'title', __( 'Your subscription is not active', 'om-wordpress' ) );
		$this->text( $dom, $item, 'link', $base . '/signup/' );
		$guid = $this->text(
			$dom,
			$item,
			'guid',
			'om-wp:not-entitled:' . hash( 'sha256', $feed_token_in_url )
		);
		$guid->setAttribute( 'isPermaLink', 'false' );
		$this->text(
			$dom,
			$item,
			'description',
			sprintf(
				/* translators: %s: provider name */
				__( 'Renew or start a subscription to receive the full paid feed from %s.', 'om-wordpress' ),
				$this->config->provider_name()
			)
		);
	}

	private function preview_for( WP_Post $post ): string {
		$excerpt = get_post_meta( $post->ID, '_excerpt', true );
		if ( ! is_string( $excerpt ) || '' === $excerpt ) {
			$excerpt = has_excerpt( $post ) ? (string) $post->post_excerpt : '';
		}
		if ( '' === $excerpt ) {
			$excerpt = (string) wp_trim_words( wp_strip_all_tags( $post->post_content ), 55 );
		}
		return (string) $excerpt;
	}

	private function rfc822( WP_Post $post ): string {
		$gmt = get_post_time( 'U', true, $post );
		if ( false === $gmt ) {
			return gmdate( 'D, d M Y H:i:s \G\M\T' );
		}
		return gmdate( 'D, d M Y H:i:s \G\M\T', (int) $gmt );
	}

	private function text(
		DOMDocument $dom,
		DOMElement $parent,
		string $name,
		string $text
	): DOMElement {
		$el = $dom->createElement( $name );
		$el->appendChild( $dom->createTextNode( $text ) );
		$parent->appendChild( $el );
		return $el;
	}
}
