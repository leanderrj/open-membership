<?php
declare(strict_types=1);

namespace OmWp\Tests\Security;

use OmWp\Security\Jwt;
use PHPUnit\Framework\TestCase;
use UnexpectedValueException;

final class JwtTest extends TestCase {

	private const KEY      = 'test-signing-key-at-least-32-characters-long';
	private const ISSUER   = 'https://publisher.example';
	private const AUDIENCE = 'https://publisher.example';

	public function test_round_trip_preserves_claims(): void {
		$jwt = Jwt::issue(
			self::KEY,
			[
				'issuer'         => self::ISSUER,
				'audience'       => self::AUDIENCE,
				'subject'        => 'user-123',
				'ttl_seconds'    => 60,
				'tier_id'        => 'paid',
				'entitlements'   => [ 'full-text', 'ad-free' ],
				'subscription_id'=> 'sub_abc',
			]
		);

		$claims = Jwt::verify( self::KEY, $jwt, self::ISSUER, self::AUDIENCE );
		$this->assertSame( 'user-123', $claims['sub'] );
		$this->assertSame( 'paid', $claims['tier_id'] );
		$this->assertSame( [ 'full-text', 'ad-free' ], (array) $claims['entitlements'] );
		$this->assertSame( 'sub_abc', $claims['subscription_id'] );
	}

	public function test_verify_rejects_wrong_key(): void {
		$jwt = Jwt::issue(
			self::KEY,
			[
				'issuer'       => self::ISSUER,
				'audience'     => self::AUDIENCE,
				'subject'      => 'x',
				'ttl_seconds'  => 60,
				'tier_id'      => 'free',
				'entitlements' => [],
			]
		);
		$this->expectException( \Throwable::class );
		Jwt::verify( 'different-key', $jwt, self::ISSUER, self::AUDIENCE );
	}

	public function test_verify_rejects_wrong_audience(): void {
		$jwt = Jwt::issue(
			self::KEY,
			[
				'issuer'       => self::ISSUER,
				'audience'     => self::AUDIENCE,
				'subject'      => 'x',
				'ttl_seconds'  => 60,
				'tier_id'      => 'free',
				'entitlements' => [],
			]
		);
		$this->expectException( UnexpectedValueException::class );
		Jwt::verify( self::KEY, $jwt, self::ISSUER, 'https://attacker.example' );
	}
}
