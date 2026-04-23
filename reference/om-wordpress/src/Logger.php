<?php
declare(strict_types=1);

namespace OmWp;

defined( 'ABSPATH' ) || exit;

/**
 * Tiny structured logger that writes through error_log() so it shows up
 * in the server's PHP log / debug.log when WP_DEBUG_LOG is set.
 *
 * WordPress has no native structured logger (action_scheduler and the
 * Server Side Render APIs both use error_log under the hood). We emit
 * JSON lines prefixed with the channel so operators can grep.
 */
final class Logger {

	public function __construct( private readonly string $channel ) {}

	public function info( string $msg, array $context = [] ): void {
		$this->write( 'info', $msg, $context );
	}

	public function warn( string $msg, array $context = [] ): void {
		$this->write( 'warn', $msg, $context );
	}

	public function error( string $msg, array $context = [] ): void {
		$this->write( 'error', $msg, $context );
	}

	private function write( string $level, string $msg, array $context ): void {
		// Redact well-known secret-bearing keys.
		$redact = [
			'stripe_secret_key',
			'stripe_webhook_secret',
			'feed_token_key',
			'jwt_signing_key',
			'authorization',
			'cookie',
		];
		foreach ( $redact as $k ) {
			if ( array_key_exists( $k, $context ) ) {
				$context[ $k ] = '[redacted]';
			}
		}

		$payload = array_merge(
			[
				'level'   => $level,
				'time'    => gmdate( 'c' ),
				'channel' => $this->channel,
				'msg'     => $msg,
			],
			$context
		);

		// JSON_UNESCAPED_SLASHES keeps URLs readable in logs.
		$line = wp_json_encode( $payload, JSON_UNESCAPED_SLASHES );
		if ( false === $line ) {
			$line = $msg;
		}

		// WP_DEBUG_LOG=true routes error_log output to wp-content/debug.log.
		error_log( $line ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
	}
}
