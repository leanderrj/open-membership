<?php
declare(strict_types=1);

namespace OmWp\Tests\Feed;

use OmWp\Config\ConfigRepository;
use OmWp\Feed\FeedRenderer;
use OmWp\Membership\MemberState;
use PHPUnit\Framework\TestCase;
use WP_Post;

final class FeedRendererTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['om_wp_test_options']   = [];
		$GLOBALS['om_wp_test_post_meta'] = [];
		update_option(
			'om_wp_settings',
			[
				'provider_url'  => 'https://publisher.example',
				'provider_name' => 'Publisher Example',
				'auth_methods'  => [ 'url-token', 'bearer' ],
				'tiers'         => [
					[ 'id' => 'free', 'label' => 'Free', 'features' => [], 'price_ids' => [] ],
					[ 'id' => 'paid', 'label' => 'Supporter', 'features' => [ 'full-text' ], 'price_ids' => [] ],
				],
				'features'      => [ [ 'id' => 'full-text', 'label' => 'Full text' ] ],
				'offers'        => [],
			]
		);
	}

	private function fake_post( int $id, string $visibility_meta = 'public', array $extras = [] ): WP_Post {
		$p = new WP_Post();
		$p->ID            = $id;
		$p->post_title    = $extras['title'] ?? 'A <post> title & more';
		$p->post_content  = $extras['content'] ?? '<p>Full HTML with <em>emphasis</em>.</p>';
		$p->post_excerpt  = $extras['excerpt'] ?? 'Excerpt.';
		$p->post_author   = 1;
		$p->post_date_gmt = '2026-04-23 10:00:00';

		update_post_meta( $id, FeedRenderer::OM_ACCESS_META, $visibility_meta );
		if ( isset( $extras['tiers'] ) ) {
			update_post_meta( $id, FeedRenderer::OM_TIERS_META, $extras['tiers'] );
		}

		return $p;
	}

	private function paid_member(): MemberState {
		return new MemberState(
			1,
			hash( 'sha256', 'user-1' ),
			'paid@example.com',
			'paid',
			'sub_123',
			'active',
			[ 'full-text' ],
			'cus_123',
		);
	}

	private function free_member(): MemberState {
		return new MemberState(
			2,
			hash( 'sha256', 'user-2' ),
			'free@example.com',
			'free',
			null,
			'none',
			[],
			null,
		);
	}

	public function test_renders_valid_xml_with_om_namespace(): void {
		$renderer = new FeedRenderer( new ConfigRepository() );
		$posts    = [ $this->fake_post( 1, 'public' ) ];
		$xml      = $renderer->render( $this->paid_member(), $posts, 'tok-1' );

		$this->assertStringStartsWith( '<?xml version="1.0" encoding="UTF-8"?>', $xml );
		$this->assertStringContainsString( 'xmlns:om="http://purl.org/rss/modules/membership/"', $xml );
		$this->assertStringContainsString( '<om:provider>https://publisher.example</om:provider>', $xml );
	}

	public function test_escapes_special_characters_in_titles(): void {
		$renderer = new FeedRenderer( new ConfigRepository() );
		$posts    = [ $this->fake_post( 1 ) ];
		$xml      = $renderer->render( $this->paid_member(), $posts, 'tok' );
		$this->assertStringContainsString( 'A &lt;post&gt; title &amp; more', $xml );
	}

	public function test_paid_post_content_granted_to_paid_member(): void {
		$renderer = new FeedRenderer( new ConfigRepository() );
		$posts    = [ $this->fake_post( 1, 'paid', [ 'content' => '<p>Secret paid body.</p>' ] ) ];
		$xml      = $renderer->render( $this->paid_member(), $posts, 'tok' );
		$this->assertStringContainsString( '<![CDATA[<p>Secret paid body.</p>]]>', $xml );
	}

	public function test_paid_post_content_denied_to_free_member(): void {
		$renderer = new FeedRenderer( new ConfigRepository() );
		$posts    = [ $this->fake_post( 1, 'paid', [ 'content' => '<p>Secret paid body.</p>' ] ) ];
		$xml      = $renderer->render( $this->free_member(), $posts, 'tok' );
		$this->assertStringNotContainsString( 'Secret paid body', $xml );
		$this->assertStringContainsString( '<om:unlock>', $xml );
	}

	public function test_null_member_yields_not_entitled_stub(): void {
		$renderer = new FeedRenderer( new ConfigRepository() );
		$xml      = $renderer->render( null, [], 'tok' );
		$this->assertStringContainsString( 'Your subscription is not active', $xml );
		$this->assertStringContainsString( '<om:access>members-only</om:access>', $xml );
	}

	public function test_tier_scoped_post_granted_when_tier_matches(): void {
		$renderer = new FeedRenderer( new ConfigRepository() );
		$posts    = [
			$this->fake_post(
				1,
				'tiers',
				[ 'content' => '<p>Tier body.</p>', 'tiers' => 'paid' ]
			),
		];
		$xml = $renderer->render( $this->paid_member(), $posts, 'tok' );
		$this->assertStringContainsString( '<![CDATA[<p>Tier body.</p>]]>', $xml );
	}

	public function test_tier_scoped_post_denied_when_tier_mismatches(): void {
		$renderer = new FeedRenderer( new ConfigRepository() );
		$posts    = [
			$this->fake_post(
				1,
				'tiers',
				[ 'content' => '<p>Tier body.</p>', 'tiers' => 'founding' ]
			),
		];
		$xml = $renderer->render( $this->paid_member(), $posts, 'tok' );
		$this->assertStringNotContainsString( 'Tier body', $xml );
	}
}
