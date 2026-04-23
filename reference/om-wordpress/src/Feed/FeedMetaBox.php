<?php
declare(strict_types=1);

namespace OmWp\Feed;

use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Per-post "Open Membership" meta box.
 *
 * Lets authors pick the access level for each post: public, members-only,
 * paid, or tier-specific. Persists to the three meta keys the FeedRenderer
 * reads: om_access, om_required_tiers, om_required_features.
 *
 * CSRF-protected by a dedicated nonce; capability gated on edit_post.
 */
final class FeedMetaBox {

	private const NONCE_ACTION = 'om_wp_save_access_meta';
	private const NONCE_FIELD  = 'om_wp_access_nonce';

	public function register(): void {
		add_action( 'add_meta_boxes', [ $this, 'add_box' ] );
		add_action( 'save_post', [ $this, 'save' ], 10, 2 );
	}

	public function add_box(): void {
		add_meta_box(
			'om_wp_access',
			__( 'Open Membership access', 'om-wordpress' ),
			[ $this, 'render_box' ],
			[ 'post', 'page' ],
			'side',
			'default'
		);
	}

	public function render_box( WP_Post $post ): void {
		wp_nonce_field( self::NONCE_ACTION, self::NONCE_FIELD );

		$access    = (string) get_post_meta( $post->ID, FeedRenderer::OM_ACCESS_META, true );
		$tiers_csv = (string) get_post_meta( $post->ID, FeedRenderer::OM_TIERS_META, true );
		$feats_csv = (string) get_post_meta( $post->ID, FeedRenderer::OM_FEATURES_META, true );
		if ( '' === $access ) {
			$access = 'public';
		}
		?>
		<p>
			<label for="om_wp_access_select"><strong><?php esc_html_e( 'Access level', 'om-wordpress' ); ?></strong></label>
			<select id="om_wp_access_select" name="om_wp_access" style="width:100%;">
				<?php
				foreach ( [
					'public'       => __( 'Public', 'om-wordpress' ),
					'members-only' => __( 'Members (free or paid)', 'om-wordpress' ),
					'paid'         => __( 'Paid subscribers only', 'om-wordpress' ),
					'tiers'        => __( 'Specific tiers', 'om-wordpress' ),
				] as $value => $label ) :
					?>
					<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $access, $value ); ?>><?php echo esc_html( $label ); ?></option>
				<?php endforeach; ?>
			</select>
		</p>
		<p>
			<label for="om_wp_required_tiers"><?php esc_html_e( 'Allowed tier ids (comma-separated, only used for "Specific tiers")', 'om-wordpress' ); ?></label>
			<input type="text" id="om_wp_required_tiers" name="om_wp_required_tiers" value="<?php echo esc_attr( $tiers_csv ); ?>" style="width:100%;" />
		</p>
		<p>
			<label for="om_wp_required_features"><?php esc_html_e( 'Required feature ids (comma-separated; optional)', 'om-wordpress' ); ?></label>
			<input type="text" id="om_wp_required_features" name="om_wp_required_features" value="<?php echo esc_attr( $feats_csv ); ?>" style="width:100%;" />
		</p>
		<p class="description"><?php esc_html_e( 'These settings control how Open Membership RSS readers decide whether to unlock full content.', 'om-wordpress' ); ?></p>
		<?php
	}

	public function save( int $post_id, WP_Post $post ): void {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		$nonce = isset( $_POST[ self::NONCE_FIELD ] ) ? sanitize_text_field( wp_unslash( (string) $_POST[ self::NONCE_FIELD ] ) ) : '';
		if ( '' === $nonce || ! wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
			return;
		}
		if ( ! in_array( $post->post_type, [ 'post', 'page' ], true ) ) {
			return;
		}

		$allowed = [ 'public', 'members-only', 'paid', 'tiers' ];
		$access  = isset( $_POST['om_wp_access'] ) ? sanitize_key( wp_unslash( (string) $_POST['om_wp_access'] ) ) : 'public';
		if ( ! in_array( $access, $allowed, true ) ) {
			$access = 'public';
		}
		update_post_meta( $post_id, FeedRenderer::OM_ACCESS_META, $access );

		$tiers = isset( $_POST['om_wp_required_tiers'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['om_wp_required_tiers'] ) ) : '';
		$tiers = $this->sanitize_csv_ids( $tiers );
		update_post_meta( $post_id, FeedRenderer::OM_TIERS_META, $tiers );

		$feats = isset( $_POST['om_wp_required_features'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['om_wp_required_features'] ) ) : '';
		$feats = $this->sanitize_csv_ids( $feats );
		update_post_meta( $post_id, FeedRenderer::OM_FEATURES_META, $feats );
	}

	private function sanitize_csv_ids( string $csv ): string {
		$parts = array_map(
			static fn( string $s ): string => sanitize_key( trim( $s ) ),
			explode( ',', $csv )
		);
		$parts = array_values( array_filter( $parts, static fn( string $s ): bool => '' !== $s ) );
		return implode( ',', $parts );
	}
}
