<?php
declare(strict_types=1);

namespace OmWp\Api;

use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Helpers for consistent REST error responses.
 *
 * All REST handlers return either valid data or a WP_Error instance.
 * WordPress turns WP_Error into a JSON response with `code`, `message`,
 * and `data.status`. We wrap construction here so every endpoint uses
 * the same shape.
 */
final class HttpError {

	public static function bad_request( string $message, array $details = [] ): WP_Error {
		return self::build( 'bad_request', 400, $message, $details );
	}

	public static function unauthorized( string $message = 'unauthorized' ): WP_Error {
		return self::build( 'unauthorized', 401, $message );
	}

	public static function forbidden( string $message = 'forbidden' ): WP_Error {
		return self::build( 'forbidden', 403, $message );
	}

	public static function not_found( string $message ): WP_Error {
		return self::build( 'not_found', 404, $message );
	}

	public static function conflict( string $message ): WP_Error {
		return self::build( 'conflict', 409, $message );
	}

	public static function rate_limited( int $retry_after_seconds ): WP_Error {
		return self::build(
			'rate_limited',
			429,
			'rate limit exceeded',
			[ 'retry_after_seconds' => $retry_after_seconds ]
		);
	}

	public static function upstream( string $service, string $message ): WP_Error {
		return self::build( 'upstream_error', 502, "$service: $message" );
	}

	public static function service_unavailable( string $message ): WP_Error {
		return self::build( 'service_unavailable', 503, $message );
	}

	private static function build(
		string $code,
		int $status,
		string $message,
		array $details = []
	): WP_Error {
		return new WP_Error(
			$code,
			$message,
			array_merge( [ 'status' => $status ], $details )
		);
	}
}
