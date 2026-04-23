<?php
declare(strict_types=1);

namespace OmWp\Tests\Security;

use OmWp\Security\FeedToken;
use PHPUnit\Framework\TestCase;

final class FeedTokenTest extends TestCase {

	public function test_deterministic_for_same_inputs(): void {
		$a = FeedToken::issue( 'key', 'user-1', 'price_monthly' );
		$b = FeedToken::issue( 'key', 'user-1', 'price_monthly' );
		$this->assertSame( $a, $b );
	}

	public function test_plan_sensitivity(): void {
		$a = FeedToken::issue( 'key', 'user-1', 'price_monthly' );
		$b = FeedToken::issue( 'key', 'user-1', 'price_yearly' );
		$this->assertNotSame( $a, $b );
	}

	public function test_key_sensitivity(): void {
		$a = FeedToken::issue( 'key-a', 'user-1', 'p' );
		$b = FeedToken::issue( 'key-b', 'user-1', 'p' );
		$this->assertNotSame( $a, $b );
	}

	public function test_verify_accepts_correct_token(): void {
		$t = FeedToken::issue( 'key', 'user-1', 'p' );
		$this->assertTrue( FeedToken::verify( 'key', $t, 'user-1', 'p' ) );
	}

	public function test_verify_rejects_mutated_token(): void {
		$t = FeedToken::issue( 'key', 'user-1', 'p' );
		$mutated = substr( $t, 0, -1 ) . ( substr( $t, -1 ) === 'A' ? 'B' : 'A' );
		$this->assertFalse( FeedToken::verify( 'key', $mutated, 'user-1', 'p' ) );
	}

	public function test_verify_rejects_wrong_user(): void {
		$t = FeedToken::issue( 'key', 'user-1', 'p' );
		$this->assertFalse( FeedToken::verify( 'key', $t, 'user-2', 'p' ) );
	}
}
