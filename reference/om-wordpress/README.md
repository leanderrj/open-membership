# `om-wordpress` — Reference Implementation for WordPress

Production WordPress plugin that turns any WordPress site into an Open Membership RSS publisher. Ships an RSS+om feed, the discovery document, Stripe Checkout integration, a Customer Portal bridge, and a webhook handler, all as a standard drop-in plugin.

## Target

- Open Membership RSS conformance: Level 5 (Commerce) on the publisher side.
- WordPress 6.3+, PHP 8.1+.
- Stripe as the only PSP in v0.1 (matches om-ghost).

## What it does

| Endpoint | Purpose |
|---|---|
| `/feed/om/{token}/` | Per-subscriber RSS+om feed, access-filtered per post |
| `/.well-known/open-membership` | Discovery JSON (SPEC §9) |
| `/wp-json/om/v1/checkout` | Start a Stripe Checkout Session |
| `/wp-json/om/v1/entitlements` | Poll the session until provisioning completes |
| `/wp-json/om/v1/token` | Exchange a feed token for a short-lived JWT |
| `/wp-json/om/v1/portal` | Redirect to Stripe Customer Portal |
| `/wp-json/om/v1/webhook` | Idempotent Stripe webhook sink |
| `/wp-json/om/v1/health` | Liveness probe |

## Install

```bash
# In your WordPress plugins directory:
cd wp-content/plugins
git clone <this-repo> open-membership-rss
cd open-membership-rss/reference/om-wordpress

composer install --no-dev --optimize-autoloader
```

Then activate **Open Membership RSS** from the WordPress plugins screen. Activation creates the `wp_om_webhook_events` table, schedules the pruning cron, flushes rewrites, and seeds safe defaults into `wp_options`.

## Configure

Two places:

1. **Settings → Open Membership** in the WP admin. Set provider name/URL, tier and offer JSON, and revocation policy.
2. **`wp-config.php` constants** for secrets. Constants win over the database so you never commit them to `wp_options`:

```php
define( 'OM_WP_STRIPE_SECRET_KEY',     'sk_live_…' );
define( 'OM_WP_STRIPE_WEBHOOK_SECRET', 'whsec_…' );
define( 'OM_WP_FEED_TOKEN_KEY',        '64-hex-chars-of-randomness' );
define( 'OM_WP_JWT_SIGNING_KEY',       '64-hex-chars-of-randomness' );
```

Generate the HMAC / JWT keys with:

```bash
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

Point your Stripe webhook at `https://your-site.example/wp-json/om/v1/webhook` and enable at minimum:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Per-post access

Every post and page gets an **Open Membership access** meta box in the sidebar. Pick one of:

| Value | Meaning |
|---|---|
| Public | Everyone sees full content |
| Members (free or paid) | Any logged-in member |
| Paid subscribers only | Any non-free tier |
| Specific tiers | Only the listed tier ids (comma-separated) |

Optionally list required feature ids. Decisions are applied by `FeedRenderer`.

## Subscriber model

A subscriber is just a WP user with the following user-meta keys set by the webhook handler:

| Key | Value |
|---|---|
| `om_stripe_customer_id` | Stripe customer id |
| `om_subscription_id` | Current Stripe subscription id |
| `om_subscription_status` | `active`, `trialing`, `past_due`, `canceled`, … |
| `om_subscription_price` | Stripe price id (used to derive the tier) |
| `om_feed_token_idx` | HMAC-derived feed token for O(1) lookup |

No parallel subscribers table. No posts table changes. Tier and entitlements are derived at read time from `om_subscription_price` + the configured tier mapping, so a tier reshuffle takes effect the moment the admin saves settings.

## Security

- Every REST arg validated + sanitized before reaching a controller.
- Webhook signatures verified with `stripe/stripe-php::Webhook::constructEvent`.
- Feed tokens are HMAC-SHA256, constant-time compared via `hash_equals`.
- JWTs are HS256 via `firebase/php-jwt`.
- Admin settings page CSRF-protected via the Settings API nonce; meta-box POSTs via a dedicated nonce.
- All output escaped (`esc_html`, `esc_attr`, `esc_textarea`, `esc_url`).
- `Logger` redacts known secret-bearing keys before writing.

## Idempotency + rate limiting

- Webhook idempotency: `INSERT IGNORE` into `wp_om_webhook_events`, retention 7 days, pruned hourly by WP-Cron.
- Rate limiting: transient-backed fixed-window per-IP limits on every public endpoint. Per-bucket caps match `om-ghost`'s defaults.

## Uninstall

Clicking **Delete** in the plugins screen runs `uninstall.php`, which drops `wp_om_webhook_events`, removes the `om_wp_*` options, and deletes `om_*` user meta and `om_access`/`om_required_tiers`/`om_required_features` post meta. Users and posts themselves are untouched.

## Testing

Unit tests run without a live WordPress install:

```bash
composer install
composer test
```

Coverage:

- `FeedToken` determinism, key/plan sensitivity, constant-time verify
- `Jwt` round-trip, issuer/audience enforcement, wrong-key rejection
- `ConfigRepository` tier resolution, auth-method filtering, constant override
- `FeedRenderer` XML shape, entity escaping, CDATA content, per-tier access

Integration tests against a real WP + Stripe setup go under `tests/integration/` and load `WP_UnitTestCase`; see `tests/README.md` for the harness.

## Layout

```
om-wordpress/
├── om-wordpress.php           Plugin main file (WP headers, bootstrap)
├── uninstall.php              Delete-handler; drops tables, options, meta
├── composer.json              stripe-php, php-jwt, PHPUnit, PHPCS, WPCS
├── phpcs.xml, phpunit.xml.dist
├── src/
│   ├── Plugin.php             Singleton container
│   ├── Activator.php          One-time install / upgrade
│   ├── Deactivator.php        Cron unschedule + rewrite flush
│   ├── Logger.php             JSON-lines through error_log
│   ├── Admin/SettingsPage.php WP Settings API screen
│   ├── Api/*                  REST route registration + controllers
│   ├── Config/ConfigRepository.php
│   ├── Cron/Pruner.php        Hourly idempotency prune
│   ├── Feed/
│   │   ├── FeedController.php Rewrite handler for /feed/om + /.well-known
│   │   ├── FeedRenderer.php   RSS+om DOMDocument builder
│   │   └── FeedMetaBox.php    Per-post access meta box
│   ├── Membership/
│   │   ├── MemberState.php
│   │   └── SubscriberRepository.php
│   ├── Security/
│   │   ├── FeedToken.php      HMAC-SHA256 feed tokens
│   │   ├── Jwt.php            HS256 JWTs
│   │   ├── IdempotencyStore.php  wp_om_webhook_events table
│   │   └── RateLimiter.php    transient-backed per-IP buckets
│   └── Stripe/StripeClient.php
└── tests/
    ├── bootstrap.php
    ├── Security/FeedTokenTest.php
    ├── Security/JwtTest.php
    ├── Config/ConfigRepositoryTest.php
    └── Feed/FeedRendererTest.php
```

## License

MIT. See [`/LICENSE`](../../LICENSE).
