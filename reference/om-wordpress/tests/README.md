# om-wordpress tests

Unit tests exercise the plugin's pure-PHP classes without a running
WordPress install. `tests/bootstrap.php` declares minimal shims for the
WordPress functions the classes under test touch (`get_option`,
`update_post_meta`, `rest_url`, `home_url`, etc.), so PHPUnit can load
them in isolation.

## Running

```bash
composer install
composer test
```

## Coverage

| File | What it exercises |
|---|---|
| `Security/FeedTokenTest.php` | HMAC feed token determinism, plan+key sensitivity, constant-time verify |
| `Security/JwtTest.php` | HS256 round-trip, wrong-key + wrong-audience rejection |
| `Config/ConfigRepositoryTest.php` | tier / feature resolution, auth-method filtering, constant-over-DB override, URL trimming, is_configured gate |
| `Feed/FeedRendererTest.php` | RSS+om XML shape, attribute escaping, CDATA content, per-tier access decisions, null-member stub |

## What's NOT here

- Integration tests against a real WP install — those live under
  `tests/integration/` (not yet populated) and load WP's own
  `WP_UnitTestCase` test scaffolding.
- End-to-end tests against Stripe test-mode or a real Ghost instance.
- `om-test-suite` conformance tests (Level 1 / 2 / 5) — blocked on
  the suite itself existing.

Integration test harness setup goes under `bin/install-wp-tests.sh`
using the standard `wp-cli` + `phpunit-wp-tests-lib` recipe; add it
when integration tests land.
