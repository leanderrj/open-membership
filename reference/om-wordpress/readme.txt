=== Open Membership RSS ===
Contributors: openmembershiprss
Tags: rss, membership, subscriptions, stripe, feeds
Requires at least: 6.3
Tested up to: 6.7
Requires PHP: 8.1
Stable tag: 0.1.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Emit Open Membership RSS feeds, discovery documents, and Stripe-powered
checkout endpoints from any WordPress site.

== Description ==

Open Membership RSS is an open specification that extends RSS 2.0 with
a vocabulary for paid, tiered, time-gated, and privacy-preserving
content. This plugin is the reference WordPress implementation: it
turns a WP site into a conformant publisher without replacing any
existing membership plugin or commerce system.

Core capabilities:

*   Per-subscriber RSS + `om:` feed at `/feed/om/{token}/`
*   Discovery document at `/.well-known/open-membership`
*   Stripe Checkout integration under `/wp-json/om/v1/*`
*   Idempotent Stripe webhook handler
*   Per-post access meta box (public / members / paid / specific tiers)
*   Rate limiting + structured logging built in

Requires PHP 8.1 and WordPress 6.3 or newer.

== Installation ==

1.  Upload the plugin to `/wp-content/plugins/open-membership-rss/`
    or install from your site's Plugins screen.
2.  Inside the plugin folder, run `composer install --no-dev --optimize-autoloader`
    to fetch the Stripe SDK and JWT library. (Deployment tip:
    pre-build the vendor directory on CI and ship the zip.)
3.  Activate **Open Membership RSS** from the Plugins screen.
4.  Visit **Settings → Open Membership** to enter secrets and tier
    configuration, or define secrets as `wp-config.php` constants:
    `OM_WP_STRIPE_SECRET_KEY`, `OM_WP_STRIPE_WEBHOOK_SECRET`,
    `OM_WP_FEED_TOKEN_KEY`, `OM_WP_JWT_SIGNING_KEY`.

== Frequently Asked Questions ==

= Do I have to use Stripe? =

Stripe is the only PSP in version 0.1. Additional PSPs (Mollie, Paddle,
Lightning) are planned for later versions.

= Does this replace my existing membership plugin? =

No. The plugin exposes feeds + endpoints against the user meta it
manages itself. It doesn't touch your existing membership system.

= Where can I learn about the spec? =

See the Open Membership RSS specification at
https://github.com/REPLACE_ME/open-membership-rss.

== Changelog ==

= 0.1.0 =

*   Initial release. Discovery, checkout, entitlements, token, portal,
    webhook, and per-subscriber feed endpoints. Per-post access meta
    box. Stripe integration. Rate limiting and webhook idempotency.
