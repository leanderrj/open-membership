<?php
declare(strict_types=1);

namespace OmWp\Admin;

use OmWp\Config\ConfigRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Admin settings page under Settings → Open Membership.
 *
 * Uses the Settings API for the "identity" and "secrets" fields, and a
 * manual form for the repeatable tier/offer/feature lists. All form
 * output is escaped; all input is sanitized via sanitize_* callbacks.
 *
 * Capability required: manage_options. The Settings API nonce +
 * options.php handler protects against CSRF.
 */
final class SettingsPage {

	private const MENU_SLUG = 'om-wordpress';
	private const OPTION    = 'om_wp_settings';
	private const GROUP     = 'om_wp_settings_group';

	public function __construct( private readonly ConfigRepository $config ) {}

	public function register(): void {
		add_action( 'admin_menu', [ $this, 'add_menu' ] );
		add_action( 'admin_init', [ $this, 'register_fields' ] );
	}

	public function add_menu(): void {
		add_options_page(
			__( 'Open Membership RSS', 'om-wordpress' ),
			__( 'Open Membership', 'om-wordpress' ),
			'manage_options',
			self::MENU_SLUG,
			[ $this, 'render_page' ]
		);
	}

	public function register_fields(): void {
		register_setting(
			self::GROUP,
			self::OPTION,
			[
				'type'              => 'array',
				'sanitize_callback' => [ $this, 'sanitize' ],
				'default'           => [],
			]
		);

		add_settings_section(
			'om_wp_identity',
			__( 'Publisher identity', 'om-wordpress' ),
			static function (): void {
				echo '<p>' . esc_html__( 'How this publisher identifies itself in feeds and discovery documents.', 'om-wordpress' ) . '</p>';
			},
			self::MENU_SLUG
		);

		add_settings_field(
			'provider_name',
			__( 'Provider name', 'om-wordpress' ),
			[ $this, 'text_field' ],
			self::MENU_SLUG,
			'om_wp_identity',
			[
				'key'     => 'provider_name',
				'default' => get_bloginfo( 'name' ),
			]
		);

		add_settings_field(
			'provider_url',
			__( 'Provider URL', 'om-wordpress' ),
			[ $this, 'text_field' ],
			self::MENU_SLUG,
			'om_wp_identity',
			[
				'key'     => 'provider_url',
				'default' => home_url( '/' ),
				'type'    => 'url',
			]
		);

		add_settings_section(
			'om_wp_secrets',
			__( 'Secrets', 'om-wordpress' ),
			static function (): void {
				echo '<p>' . esc_html__( 'Values entered here are stored in wp_options. For production, define these as wp-config.php constants instead: OM_WP_STRIPE_SECRET_KEY, OM_WP_STRIPE_WEBHOOK_SECRET, OM_WP_FEED_TOKEN_KEY, OM_WP_JWT_SIGNING_KEY. Constants win over this screen.', 'om-wordpress' ) . '</p>';
			},
			self::MENU_SLUG
		);

		foreach ( [ 'stripe_secret_key', 'stripe_webhook_secret', 'feed_token_key', 'jwt_signing_key' ] as $key ) {
			add_settings_field(
				$key,
				$this->label_for_key( $key ),
				[ $this, 'secret_field' ],
				self::MENU_SLUG,
				'om_wp_secrets',
				[ 'key' => $key ]
			);
		}

		add_settings_section(
			'om_wp_tiers',
			__( 'Tiers, features, offers', 'om-wordpress' ),
			static function (): void {
				echo '<p>' . esc_html__( 'JSON arrays describing this publisher\'s tiers, features, and offers. The admin UI for these is a follow-up; for now, paste JSON validated against the structure shown below.', 'om-wordpress' ) . '</p>';
			},
			self::MENU_SLUG
		);

		foreach ( [
			'tiers'    => __( 'Tiers (JSON)', 'om-wordpress' ),
			'features' => __( 'Features (JSON)', 'om-wordpress' ),
			'offers'   => __( 'Offers (JSON)', 'om-wordpress' ),
		] as $key => $label ) {
			add_settings_field(
				$key,
				$label,
				[ $this, 'json_field' ],
				self::MENU_SLUG,
				'om_wp_tiers',
				[ 'key' => $key ]
			);
		}

		add_settings_section(
			'om_wp_policy',
			__( 'Policy', 'om-wordpress' ),
			'__return_null',
			self::MENU_SLUG
		);

		add_settings_field(
			'revocation_policy',
			__( 'Revocation policy', 'om-wordpress' ),
			[ $this, 'select_field' ],
			self::MENU_SLUG,
			'om_wp_policy',
			[
				'key'     => 'revocation_policy',
				'default' => 'prospective-only',
				'choices' => [
					'prospective-only' => __( 'Prospective only', 'om-wordpress' ),
					'retroactive'      => __( 'Retroactive', 'om-wordpress' ),
				],
			]
		);

		add_settings_field(
			'revocation_grace_hours',
			__( 'Grace period (hours)', 'om-wordpress' ),
			[ $this, 'number_field' ],
			self::MENU_SLUG,
			'om_wp_policy',
			[
				'key'     => 'revocation_grace_hours',
				'default' => 48,
				'min'     => 0,
				'max'     => 720,
			]
		);
	}

	public function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html__( 'Open Membership RSS', 'om-wordpress' ); ?></h1>
			<?php if ( ! $this->config->is_configured() ) : ?>
				<div class="notice notice-warning">
					<p><?php echo esc_html__( 'The plugin is not fully configured. Set Stripe keys and HMAC keys before exposing endpoints to the public.', 'om-wordpress' ); ?></p>
				</div>
			<?php endif; ?>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::GROUP );
				do_settings_sections( self::MENU_SLUG );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	public function sanitize( $input ): array {
		$existing = get_option( self::OPTION, [] );
		if ( ! is_array( $existing ) ) {
			$existing = [];
		}
		if ( ! is_array( $input ) ) {
			return $existing;
		}

		$out = $existing;

		foreach ( [ 'provider_name' ] as $k ) {
			if ( isset( $input[ $k ] ) ) {
				$out[ $k ] = sanitize_text_field( (string) $input[ $k ] );
			}
		}
		if ( isset( $input['provider_url'] ) ) {
			$out['provider_url'] = esc_url_raw( (string) $input['provider_url'] );
		}

		foreach ( [ 'stripe_secret_key', 'stripe_webhook_secret', 'feed_token_key', 'jwt_signing_key' ] as $k ) {
			if ( array_key_exists( $k, $input ) ) {
				$val = sanitize_text_field( (string) $input[ $k ] );
				if ( '' === $val && isset( $existing[ $k ] ) ) {
					// Empty submit keeps the existing value (masked field).
					continue;
				}
				$out[ $k ] = $val;
			}
		}

		foreach ( [ 'tiers', 'features', 'offers' ] as $k ) {
			if ( isset( $input[ $k ] ) ) {
				$decoded = json_decode( (string) $input[ $k ], true );
				if ( is_array( $decoded ) ) {
					$out[ $k ] = $decoded;
				} else {
					add_settings_error(
						self::OPTION,
						"om_wp_{$k}_invalid_json",
						/* translators: %s: key name */
						sprintf( __( 'Invalid JSON for %s; previous value kept.', 'om-wordpress' ), $k )
					);
				}
			}
		}

		if ( isset( $input['revocation_policy'] ) ) {
			$out['revocation_policy'] = in_array(
				(string) $input['revocation_policy'],
				[ 'prospective-only', 'retroactive' ],
				true
			) ? (string) $input['revocation_policy'] : 'prospective-only';
		}

		if ( isset( $input['revocation_grace_hours'] ) ) {
			$out['revocation_grace_hours'] = max( 0, min( 720, (int) $input['revocation_grace_hours'] ) );
		}

		return $out;
	}

	public function text_field( array $args ): void {
		$key     = (string) $args['key'];
		$type    = (string) ( $args['type'] ?? 'text' );
		$default = (string) ( $args['default'] ?? '' );
		$value   = $this->value( $key, $default );
		printf(
			'<input type="%s" name="%s[%s]" value="%s" class="regular-text" />',
			esc_attr( $type ),
			esc_attr( self::OPTION ),
			esc_attr( $key ),
			esc_attr( $value )
		);
	}

	public function secret_field( array $args ): void {
		$key    = (string) $args['key'];
		$exists = '' !== (string) $this->value( $key, '' );
		$hint   = $exists
			? __( 'Leave blank to keep the current value.', 'om-wordpress' )
			: __( 'Not set.', 'om-wordpress' );
		printf(
			'<input type="password" name="%s[%s]" value="" class="regular-text" autocomplete="new-password" /><p class="description">%s</p>',
			esc_attr( self::OPTION ),
			esc_attr( $key ),
			esc_html( $hint )
		);
	}

	public function json_field( array $args ): void {
		$key   = (string) $args['key'];
		$value = $this->value( $key, [] );
		$json  = is_array( $value ) ? wp_json_encode( $value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) : '[]';
		printf(
			'<textarea name="%s[%s]" rows="10" cols="60" class="large-text code">%s</textarea>',
			esc_attr( self::OPTION ),
			esc_attr( $key ),
			esc_textarea( (string) $json )
		);
	}

	public function select_field( array $args ): void {
		$key     = (string) $args['key'];
		$default = (string) ( $args['default'] ?? '' );
		$choices = (array) ( $args['choices'] ?? [] );
		$value   = $this->value( $key, $default );
		printf( '<select name="%s[%s]">', esc_attr( self::OPTION ), esc_attr( $key ) );
		foreach ( $choices as $v => $label ) {
			printf(
				'<option value="%s"%s>%s</option>',
				esc_attr( (string) $v ),
				selected( $value, $v, false ),
				esc_html( (string) $label )
			);
		}
		echo '</select>';
	}

	public function number_field( array $args ): void {
		$key   = (string) $args['key'];
		$value = $this->value( $key, (int) ( $args['default'] ?? 0 ) );
		printf(
			'<input type="number" name="%s[%s]" value="%d" min="%d" max="%d" />',
			esc_attr( self::OPTION ),
			esc_attr( $key ),
			(int) $value,
			(int) ( $args['min'] ?? 0 ),
			(int) ( $args['max'] ?? PHP_INT_MAX )
		);
	}

	/**
	 * Read a single key from wp_options.
	 *
	 * @param string $key Key name.
	 * @param mixed  $default Default value.
	 * @return mixed
	 */
	private function value( string $key, $default ) {
		$all = get_option( self::OPTION, [] );
		if ( ! is_array( $all ) ) {
			return $default;
		}
		return $all[ $key ] ?? $default;
	}

	private function label_for_key( string $key ): string {
		return match ( $key ) {
			'stripe_secret_key'     => __( 'Stripe secret key', 'om-wordpress' ),
			'stripe_webhook_secret' => __( 'Stripe webhook signing secret', 'om-wordpress' ),
			'feed_token_key'        => __( 'Feed token HMAC key', 'om-wordpress' ),
			'jwt_signing_key'       => __( 'JWT signing key', 'om-wordpress' ),
			default                 => $key,
		};
	}
}
