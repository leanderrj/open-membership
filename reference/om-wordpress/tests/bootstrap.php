<?php
/**
 * PHPUnit bootstrap.
 *
 * Loads the Composer autoloader and provides minimal WordPress-function
 * shims so the unit tests can exercise the plugin's pure-PHP classes
 * (FeedToken, Jwt, ConfigRepository, FeedRenderer) without spinning up
 * a full WordPress test environment.
 *
 * Integration tests against a real WP install are a follow-up; they go
 * under tests/integration/ and load WP's own test scaffolding instead.
 */

declare(strict_types=1);

$autoload = __DIR__ . '/../vendor/autoload.php';
if ( ! is_readable( $autoload ) ) {
	fwrite(
		STDERR,
		"Missing vendor/autoload.php. Run 'composer install' inside reference/om-wordpress.\n"
	);
	exit( 1 );
}
require_once $autoload;

// Minimal shims so the classes under test can be loaded without
// crashing on WordPress globals. Any test that needs richer WP behavior
// should live in tests/integration/ instead.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
if ( ! defined( 'OM_WP_PLUGIN_FILE' ) ) {
	define( 'OM_WP_PLUGIN_FILE', __DIR__ . '/../om-wordpress.php' );
}
if ( ! defined( 'OM_WP_VERSION' ) ) {
	define( 'OM_WP_VERSION', '0.1.0' );
}
if ( ! defined( 'OM_WP_SPEC_VERSION' ) ) {
	define( 'OM_WP_SPEC_VERSION', '0.4' );
}
if ( ! defined( 'OM_WP_REST_NAMESPACE' ) ) {
	define( 'OM_WP_REST_NAMESPACE', 'om/v1' );
}
if ( ! defined( 'OM_WP_DB_VERSION' ) ) {
	define( 'OM_WP_DB_VERSION', '1' );
}

if ( ! class_exists( 'WP_Post' ) ) {
	/**
	 * Minimal WP_Post shim so type-hinted classes can be loaded in unit
	 * tests without the full WP runtime.
	 */
	class WP_Post { // phpcs:ignore
		public int $ID = 0;
		public int $post_author = 0;
		public string $post_title = '';
		public string $post_content = '';
		public string $post_excerpt = '';
		public string $post_status = 'publish';
		public string $post_type = 'post';
		public string $post_date_gmt = '2026-01-01 00:00:00';
	}
}

if ( ! function_exists( 'get_option' ) ) {
	$GLOBALS['om_wp_test_options'] = [];
	function get_option( string $key, $default = false ) {
		return $GLOBALS['om_wp_test_options'][ $key ] ?? $default;
	}
	function update_option( string $key, $value, bool $autoload = true ): bool {
		$GLOBALS['om_wp_test_options'][ $key ] = $value;
		return true;
	}
	function delete_option( string $key ): bool {
		unset( $GLOBALS['om_wp_test_options'][ $key ] );
		return true;
	}
}

if ( ! function_exists( 'home_url' ) ) {
	function home_url( string $path = '' ): string {
		return 'https://publisher.example' . $path;
	}
}
if ( ! function_exists( 'untrailingslashit' ) ) {
	function untrailingslashit( string $s ): string {
		return rtrim( $s, '/' );
	}
}
if ( ! function_exists( 'get_bloginfo' ) ) {
	function get_bloginfo( string $show ): string {
		return match ( $show ) {
			'name'     => 'Publisher Example',
			'language' => 'en',
			default    => '',
		};
	}
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $value, int $flags = 0 ): string|false {
		return json_encode( $value, $flags ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode
	}
}
if ( ! function_exists( 'rest_url' ) ) {
	function rest_url( string $path = '' ): string {
		return 'https://publisher.example/wp-json/' . ltrim( $path, '/' );
	}
}
if ( ! function_exists( 'apply_filters' ) ) {
	function apply_filters( string $tag, $value, ...$args ) {
		unset( $tag, $args );
		return $value;
	}
}
if ( ! function_exists( 'get_permalink' ) ) {
	function get_permalink( $post ): string {
		return sprintf( 'https://publisher.example/?p=%d', is_object( $post ) ? (int) $post->ID : 0 );
	}
}
if ( ! function_exists( 'get_the_title' ) ) {
	function get_the_title( $post ): string {
		return is_object( $post ) ? (string) $post->post_title : '';
	}
}
if ( ! function_exists( 'get_the_excerpt' ) ) {
	function get_the_excerpt( $post ): string {
		return is_object( $post ) && isset( $post->post_excerpt ) ? (string) $post->post_excerpt : '';
	}
}
if ( ! function_exists( 'has_excerpt' ) ) {
	function has_excerpt( $post ): bool {
		return is_object( $post ) && isset( $post->post_excerpt ) && '' !== $post->post_excerpt;
	}
}
if ( ! function_exists( 'get_the_author_meta' ) ) {
	function get_the_author_meta( string $field, int $user_id ): string {
		unset( $field, $user_id );
		return 'Author';
	}
}
if ( ! function_exists( 'get_post_time' ) ) {
	function get_post_time( string $format, bool $gmt, $post ) {
		unset( $format, $gmt, $post );
		return strtotime( '2026-04-23T10:00:00Z' );
	}
}
if ( ! function_exists( 'wp_trim_words' ) ) {
	function wp_trim_words( string $text, int $words ): string {
		$parts = preg_split( '/\s+/', trim( $text ) );
		return implode( ' ', array_slice( (array) $parts, 0, $words ) );
	}
}
if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( string $s ): string {
		return trim( strip_tags( $s ) );
	}
}
if ( ! function_exists( 'get_post_meta' ) ) {
	$GLOBALS['om_wp_test_post_meta'] = [];
	function get_post_meta( int $post_id, string $key, bool $single = true ) {
		$v = $GLOBALS['om_wp_test_post_meta'][ $post_id ][ $key ] ?? '';
		return $single ? $v : [ $v ];
	}
	function update_post_meta( int $post_id, string $key, $value ): bool {
		$GLOBALS['om_wp_test_post_meta'][ $post_id ][ $key ] = $value;
		return true;
	}
}
if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = 'default' ): string {
		unset( $domain );
		return $text;
	}
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( string $text, string $domain = 'default' ): string {
		unset( $domain );
		return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}
