# Open Membership RSS, Platform Adapter Profile 1.0

- **Profile URI:** `http://purl.org/rss/modules/membership/adapter-profile/1.0`
- **This version:** 1.0 (draft, 2026-04-24)
- **Status:** Non-normative. Companion to [`SPEC.md`](../SPEC.md) 0.4 (and anticipated 1.0).
- **Relationship to the spec:** This profile does not change, extend, or reinterpret `SPEC.md`. It is an implementer's guide. "Profile-compliant" is an informative label, not a conformance claim. Conformance is defined in `SPEC.md` §7, §8 and `../docs/FEATURESET.md`.

---

## 0. Why this document exists

Open Membership RSS defines a wire-level contract: what a publisher puts in a feed, what a `.well-known` document advertises, and what the checkout and token-exchange endpoints return. It says nothing about the host the publisher runs on. That gap is where every new CMS port starts.

Two production reference implementations, [`reference/om-ghost/`](../reference/om-ghost/) and [`reference/om-wordpress/`](../reference/om-wordpress/), converged independently on the same eight integration points with their host CMS. Each time, the open question was not "how do I express `<om:tier>` in XML?" (answered in [`SPEC.md`](../SPEC.md)) but "where does the host keep the data needed to populate that element?" The second question has no answer in [`SPEC.md`](../SPEC.md); without a captured contract, a green-field build for every new CMS re-derives it from scratch.

This profile is the captured contract. It says: here are the eight capabilities the host must expose for an `om` adapter to be writable; here is how Ghost and WordPress expose them; here is how WooCommerce and Memberful would expose them; here are the host-side primitives to look for when bringing up a third. The precedent is the OpenID Foundation's Implementer's Guide pattern, a contract on one page, a concrete mapping on the facing page, and, more loosely, the ActivityPub "platform adapter" pattern where federated interop depends on a small shared data model rather than on a shared storage engine. We use the same shape here: define the minimum contract, then validate it against external platforms before publication.

This document is meant to be read alongside the two reference implementations. It does not replicate code or reinvent their decisions; it abstracts them.

---

## 1. The contract

Eight capabilities. For each: what the capability is called, what `om` element or behavior it supports, the operations a Profile-compliant host must expose, the granularity the adapter sees, what "does not fit" looks like, and the typical host-side primitive.

An adapter that can implement all eight, regardless of how, can serve SPEC Level 5 (Commerce) on the publisher side. Omitted capabilities define what Level the host can realistically reach; §10 connects each capability to its SPEC section.

### 1.1 Subscriber identity

- **Supports:** `<om:provider>` + all per-subscriber operations (feed rendering, token issue, entitlement derivation). SPEC §9 (discovery) + §7 conformance Levels 1-5.
- **Required operations:**
  - `get_subscriber_by_id(id) -> Subscriber | null`
  - `get_subscriber_by_email(email) -> Subscriber | null`
  - `get_subscriber_by_psp_customer_id(customer_id) -> Subscriber | null`
  - `iterate_active_subscribers() -> Iterable<Subscriber>` (for cache warmup; can be batched/paginated)
  - A stable opaque `uuid` per subscriber, not reassigned when the subscriber's email or display name changes
- **Granularity:** per-user.
- **Does not fit when:** the host does not expose subscribers as addressable records (e.g., a pure cookie-session platform with no server-side identity); or the `uuid` equivalent is tied to profile mutation (changes when email changes).
- **Typical host primitive:** a `members`/`users`/`customers` table or collection with an immutable primary key. Ghost: `members` table with UUID column. WordPress: `wp_users` table with derived stable hash (see §2).

### 1.2 Tier model

- **Supports:** `<om:tier>` at channel level, tier-specific item access, entitlement JWT claims. SPEC §1 (Foundational), §6 (Payments), specifically `<om:tier>` and `<om:feature>`.
- **Required operations:**
  - `list_tiers() -> Tier[]`, each tier has an opaque `id`, display `label`, an `amount`+`currency`+`period` (required only for paid tiers), a feature id array, and one or more PSP price identifiers
  - `tier_for_psp_price_id(price_id) -> tier_id | null`, reverse lookup: given a Stripe (or other PSP) price id, which tier does it confer?
  - `features_for_tier(tier_id) -> feature_id[]`, features are decoupled from tiers per SPEC §6
- **Granularity:** per-site, read frequently, written rarely (admin-configured, not per-request).
- **Does not fit when:** the host couples tiers 1:1 to PSP products with no independent configuration layer, AND the host provides no mechanism for the adapter to declare a tier-to-price-id mapping on the side (which is still recoverable; see §5, §6).
- **Typical host primitive:** a `tiers`/`plans`/`products` table (Ghost, Memberful), a hand-edited config file (om-ghost's `om-config.yaml`), or a structured settings row (`wp_options['om_wp_settings']`).

### 1.3 Entitlement derivation from PSP state

- **Supports:** the token-exchange endpoint's `entitlements` claim, the feed renderer's per-item `grantContent` decision, the portal flow's "is there a subscription to manage". SPEC §6.3 (PSP binding profiles) + §7 Level 5.
- **Required operations:**
  - `current_subscription(subscriber) -> { subscription_id, status, psp_price_id, psp_customer_id } | null`
  - `entitlement_state(subscriber) -> { tier_id, features[], is_active: bool }`, pure function of the subscription and the tier mapping; must be idempotent and side-effect-free
  - Subscription status values must include at minimum the three PSP-agnostic states: `active`, `canceled`, `none`. Stripe-specific states (`trialing`, `past_due`, `unpaid`, `incomplete`) are passed through as-is; readers in `SPEC.md` already expect Stripe-shaped statuses.
- **Granularity:** per-user, read per request (feed, token exchange, portal).
- **Does not fit when:** the host has no concept of a subscription lifecycle (a one-shot purchase model) or the PSP state is not reconcilable on demand (fire-and-forget webhook with no readback).
- **Typical host primitive:** a `subscriptions` table alongside members (Ghost, Memberful, WooCommerce Subscriptions), or a set of user-meta keys (`om_subscription_id`, `om_subscription_status`, `om_subscription_price` in `om-wordpress`).

### 1.4 Per-post access policy

- **Supports:** `<om:access>` per item, the `grantContent` decision in the feed renderer. SPEC §1 (`<om:access>` values: `open` / `preview` / `locked` / `members-only`) + §2 (`<om:window>` time gating at 0.2+).
- **Required operations:**
  - `access_policy_for(post) -> { kind: "public" | "members" | "paid" | "tiers", required_tiers?: string[], required_features?: string[] }`
  - A per-post editorial UI surface on the host (drop-down or checkbox) that writes the policy; an adapter cannot fabricate access policy out of thin air. If the host has no per-post editor for this, the adapter must add one.
- **Granularity:** per-content (post, page, episode).
- **Does not fit when:** the host has no attachable metadata per content item (pure static-HTML hosts with no editorial layer) OR it has editorial metadata but no server-side hook through which the adapter can read it at feed-render time.
- **Typical host primitive:** Ghost's native `visibility` field on posts (`public` / `members` / `paid` / `tiers`), plus the Ghost tiers picker. WordPress: post-meta keys (`om_access`, `om_required_tiers`, `om_required_features`) driven by a sidebar meta box (see `src/Feed/FeedMetaBox.php`).

### 1.5 Feed generation and token gating

- **Supports:** `GET /feed/om/:token/`, URL-token auth method, the entire SPEC §7 Level 2 (URL-token feeds). SPEC §1 (`<om:authMethod>url-token</om:authMethod>`) + §7.
- **Required operations:**
  - `issue_feed_token(subscriber_uuid, plan_id) -> token`, deterministic HMAC-SHA256, base64url-encoded, of `subscriber_uuid + ":" + plan_id`. Both reference implementations use this exact derivation.
  - `verify_feed_token(token, subscriber_uuid, plan_id) -> bool`, constant-time comparison.
  - `subscriber_by_token(token) -> Subscriber | null`, the adapter needs a way to go from a URL-borne token back to the subscriber. Two shapes are acceptable:
    - **O(1) index:** the host lets the adapter write a derived field (user-meta, KV key, custom column) that maps token → subscriber. `om-wordpress` uses the `om_feed_token_idx` user-meta key.
    - **Enumerate-and-HMAC:** the host has no writable side-channel, so the adapter caches a token→subscriber map in memory, warmed by iterating `iterate_active_subscribers()`. `om-ghost` uses this approach because Ghost's Admin API is the cleanest enumerator.
  - A render path that emits RSS 2.0 + the `om:` namespace, switching per-item based on the §1.3 entitlement state and the §1.4 access policy.
- **Granularity:** per-user at serve time; per-post at render time.
- **Does not fit when:** the host cannot accept a dynamic route at the feed URL (pure static hosting with no redirects), OR the host forces a theme layer onto the feed response (forces HTML templating and escapes XML).
- **Typical host primitive:** Ghost's dynamic routing via `routes.yaml` plus a Handlebars template, or a Node sidecar/Cloudflare Worker that bypasses Ghost's theme layer entirely. WordPress: `add_rewrite_rule()` to capture `/feed/om/{token}/` into a custom query var, then `parse_request` handler that bypasses the theme (see `FeedController.php`).

### 1.6 Webhook intake + idempotency

- **Supports:** reconciliation between the PSP's authoritative subscription state and the host's view. SPEC §6.3 (Stripe, Mollie, Lightning binding profiles), §8 (publisher conformance: "honor revocation policy in webhook handlers").
- **Required operations:**
  - `verify_psp_signature(raw_body, signature_header, secret) -> Event | error`, exactly the SDK-provided call for the PSP. Both references use `stripe.webhooks.constructEventAsync` / `Webhook::constructEvent`.
  - `claim_event(event_id, retention_seconds) -> bool`, atomic "have I seen this event" check that returns true only on the first claim. Stripe retries for up to 3 days; retention must exceed that window.
  - `prune_old_events(older_than_seconds) -> int`, called on a scheduled interval (hourly in both references).
  - A receiver endpoint that (a) can read the raw request body (not JSON-parsed early; Stripe signature verification requires the literal bytes); (b) returns 2xx fast so the PSP does not retry; (c) surfaces transient errors as 5xx to trigger retries.
- **Granularity:** per-subscription event; per-PSP secret at the site level.
- **Does not fit when:** the host's HTTP layer rewrites or re-serializes the request body before it reaches handler code (WordPress REST's default JSON coercion is the classic trap, `om-wordpress` works around it with `$req->get_body()` rather than the parsed-args array).
- **Typical host primitive:** a host HTTP route (Express handler in `om-ghost/service/`, Workers fetch handler in `om-ghost/worker/`, `register_rest_route` in `om-wordpress`) + an atomic store (SQLite `INSERT OR IGNORE` in om-ghost's Node mode, Cloudflare KV with TTL in Worker mode, `INSERT IGNORE` into `wp_om_webhook_events` in om-wordpress).

### 1.7 Checkout session creation

- **Supports:** `<om:offer>` + the in-reader checkout flow. SPEC §6.2 (offers) + §7 Level 5.
- **Required operations:**
  - `create_checkout_session(offer_id, return_url, customer_email?, correlation_id?) -> { checkout_url, session_id, psp }`, the offer is resolved against the host's `list_tiers()`/`offers` surface; the PSP-side session is created via the PSP SDK; the return URL is reflected back into the PSP so that the reader-side polling has a known landing page.
  - The session must carry enough PSP-side metadata to identify the subscriber after completion. Both references rely on Stripe's `client_reference_id` when the reader supplies a correlation id, falling back to customer-email lookup otherwise.
- **Granularity:** per-request from the reader. Rate-limited per-IP in both references.
- **Does not fit when:** the PSP is not the host (the host has no PSP secret; e.g., a pure-content CMS) AND no external PSP adapter is wired in. Memberful sidesteps this because Memberful is both the host and the PSP; §6 covers the shape.
- **Typical host primitive:** direct use of the PSP SDK with the secret from host config. Both references stamp the session with `client_reference_id = subscriber_correlation_id`.

### 1.8 Portal / customer self-service

- **Supports:** `GET /api/om/portal?feed_token=...` → 303 redirect to the PSP's self-service surface. SPEC §7 Level 5 (self-service is part of Commerce conformance).
- **Required operations:**
  - `resolve_psp_customer(subscriber) -> customer_id | null`
  - `create_portal_session(customer_id, return_url) -> { url }`, thin wrapper around the PSP's billing-portal SDK.
- **Granularity:** per-user.
- **Does not fit when:** the host's PSP integration owns the customer record but does not expose the customer id to the adapter (closed SaaS platforms with server-side-only portal rendering).
- **Typical host primitive:** `stripe.billingPortal.sessions.create()` in both references; the `stripe_customer_id` is the input, and it is stored in the host's subscriber record (Ghost `subscriptions[0].customer.id`, WordPress `om_stripe_customer_id` meta).

---

## 2. Mapping: Ghost vs. WordPress

Side-by-side. Read the contract in §1, then read across in §2 to see each reference's resolution.

| Capability | Ghost (`om-ghost`) | WordPress (`om-wordpress`) |
|---|---|---|
| 1.1 Subscriber identity | Native Ghost Members table; `uuid` column is already stable per subscriber; adapter reads via Admin API (`GhostClient.getMemberByUuid`, `iterateActiveMembers` filtering `status:paid`). | WP users table; uuid *derived* at read time as `sha256("om-wp:" + ID + ":" + user_registered)`, the adapter synthesizes a stable opaque handle because WP's native user id is an autoincrementing integer. `SubscriberRepository::uuid_for_user`. |
| 1.2 Tier model | Hand-edited YAML at `om-config.yaml`; `tierForPriceId()` in `shared/config.ts` is a linear scan. Two-file configuration (env secrets + structured config), chosen because Ghost(Pro) has no server-side plugin slot to store it in. | `wp_options['om_wp_settings']` row holding a `tiers[]` array; admin UI in `Admin/SettingsPage.php`; reverse lookup via `ConfigRepository::tier_for_price_id`. Single-store config because WordPress gives the adapter a settings API natively. |
| 1.3 Entitlement derivation | `memberStateFromGhost()` in `shared/ghost-client.ts`: takes the Ghost member record, picks the first subscription, resolves the price id to a tier, resolves the tier to features. Pure function of the config + the Ghost payload. | `SubscriberRepository::from_user()`: reads four user-meta keys (`om_stripe_customer_id`, `om_subscription_id`, `om_subscription_status`, `om_subscription_price`), runs the same derivation. Meta is written by the webhook handler; it's a pure cache of PSP state, never authoritative. |
| 1.4 Per-post access policy | Ghost's native `visibility` field + tiers picker; `decideAccess()` in `shared/feed-render.ts` maps the four Ghost visibility values to `{access, grantContent}`. Zero editorial UI added by `om-ghost`, Ghost already has the right shape. | Three post-meta keys (`om_access`, `om_required_tiers`, `om_required_features`) + sidebar meta box in `FeedMetaBox.php`. WordPress had no native members-only primitive; the adapter adds one rather than consult `post_status`/password-protection (explicitly rejected, see `FeedRenderer.php` header comment). |
| 1.5 Feed token + feed generation | HMAC-SHA256 of `uuid + ":" + plan_id` via Web Crypto (`shared/token.ts`). Token-to-subscriber resolution via the `FeedCache` interface, `InMemoryFeedCache` (Node) warmed from `iterateActiveMembers()`, `KvFeedCache` (Worker) keyed in Cloudflare KV. Feed rendered via `xmlbuilder2` in `shared/feed-render.ts`. | Same HMAC derivation (`Security/FeedToken.php`). Token-to-subscriber resolution via `om_feed_token_idx` user-meta index, O(1) via WP's `meta_query`. Feed rendered via `DOMDocument` in `Feed/FeedRenderer.php`, bypassing the theme layer via `parse_request` hook. |
| 1.6 Webhook + idempotency | `parseWebhookEvent()` wraps `stripe.webhooks.constructEventAsync`. Idempotency interface in `shared/idempotency.ts` with two implementations: SQLite `INSERT OR IGNORE` (Node, `service/idempotency-sqlite.ts`) and KV with TTL (Worker, `worker/kv-idempotency.ts`). 7-day retention; hourly prune. | `StripeClient::parse_webhook_event()` wraps the same SDK call. `IdempotencyStore` uses `INSERT IGNORE` against `wp_om_webhook_events` (custom table from `Activator.php`). 7-day retention; hourly prune via WP-Cron (`Cron/Pruner.php`). |
| 1.7 Checkout session | `registerCheckout` in `shared/app.ts`; Stripe SDK; offer resolved against `config.offers[]`; `client_reference_id` passed through from the request. | `Api/CheckoutController::handle()`; `StripeClient::create_checkout_session()`; offer resolved against `ConfigRepository::offer_by_id()`; `client_reference_id` passed through. |
| 1.8 Portal | `registerPortal` in `shared/app.ts`: looks up the subscription via the feed token, retrieves the Stripe customer, creates a `stripe.billingPortal.sessions`, 303-redirects. | `Api/PortalController`: same logical flow, with the customer id read from `om_stripe_customer_id` user meta rather than round-tripping through the subscription. |

The two implementations differ on storage (Ghost has a members table; WordPress has user-meta), on config shape (YAML vs. options row), and on runtime (Node + Worker vs. PHP inside WP). They agree, bit-for-bit, on the feed-token derivation, the webhook idempotency retention window, the checkout session shape, and the JWT claim set. That agreement is the contract.

---

## 3. Validation: WooCommerce + WooCommerce Subscriptions

WooCommerce is the largest installed commerce layer on WordPress (roughly 3.5M active installs by public counts; WooCommerce Subscriptions is a paid extension layering recurring billing on top). A hypothetical `om-woocommerce` adapter would live beside `om-wordpress` but bridge Woo's order/subscription primitives instead of arbitrary WP user-meta.

Per-capability verdict:

### 3.1 Subscriber identity, fits

Woo subscribers are WordPress users; Woo adds a `_customer_user` meta on orders and subscriptions but does not replace the `wp_users` table. `om-wordpress`'s uuid derivation (`sha256("om-wp:" + ID + ":" + user_registered)`) applies unchanged. **Verdict: fits as-is.**

### 3.2 Tier model, fits with a specific decision point

Woo represents a sellable thing as a `product` post-type, with variable products exposing child `product_variation` post-types. A "tier" in `om` terms maps most cleanly to a subscription product (one id) or to a variation of a subscription-enabled variable product (one variation id). Either works; the adapter picks one by convention. WooCommerce Subscriptions' `WC_Subscription` carries `get_items()` which surfaces the product/variation id driving that subscription.

The Profile's `tier_for_psp_price_id(price_id) -> tier_id` contract maps to: `tier_for_woo_product_id(product_or_variation_id) -> tier_id`. The underlying shape is identical, a finite map from PSP-layer identifiers to om-layer tier ids. **Verdict: fits; adapter author must decide product-level vs. variation-level granularity up front.**

### 3.3 Entitlement derivation from PSP state, fits

`WC_Subscription::get_status()` returns one of `active`, `pending-cancel`, `on-hold`, `cancelled`, `expired`, `pending`, or `switched`. These map cleanly onto the `active / canceled / none` minimum set the Profile requires. `om-wordpress`'s `MemberState::is_active()` (checks for `active`/`trialing`) generalizes; Woo's `active` is the same semantics, `pending-cancel` is "still entitled until term ends" which is also active for entitlement purposes.

There is one subtlety: Woo Subscriptions is its own billing layer that may or may not use Stripe underneath (it supports multiple gateways). The adapter must decide: read entitlement state from WooCommerce (host-authoritative) or from Stripe (PSP-authoritative)? The Profile permits either. **Verdict: fits; adapter author must document which source is authoritative and reconcile the other via webhook.**

### 3.4 Per-post access policy, fits

Woo does not natively gate non-product post types by subscription status. The ecosystem solves this with add-on plugins ("WooCommerce Memberships", "Members for WooCommerce Subscriptions"), which typically add post meta indicating membership requirements. The Profile's `access_policy_for(post)` contract does not care which plugin writes the meta, it cares that the meta exists and is readable at render time.

The `om-woocommerce` adapter should reuse `om-wordpress`'s `FeedMetaBox.php` verbatim. A Woo site with WooCommerce Memberships installed could optionally read from that plugin's meta keys too, as a convenience import path; this is adapter-local convenience, not a Profile change. **Verdict: fits as-is.**

### 3.5 Feed generation and token gating, fits

Woo does not interact with feed rendering at all. `om-wordpress`'s `FeedController` + `FeedRenderer` work unchanged. The feed-token index via `om_feed_token_idx` user-meta is unaffected by Woo's presence. **Verdict: fits as-is.**

### 3.6 Webhook intake + idempotency, fits with coexistence note

Woo's own Stripe gateway ingests Stripe webhooks on `/wc-api/wc_stripe/`. `om-wordpress`'s `/wp-json/om/v1/webhook` ingests them on its own endpoint. There is no conflict: a publisher configures Stripe to fan out to both endpoints, or the `om-woocommerce` adapter consumes Woo-internal hooks (`woocommerce_subscription_status_updated`) instead of a direct Stripe webhook.

The second option is arguably cleaner because Woo becomes authoritative and the adapter is a pure subscriber of host events. But it means the adapter does not need the Profile's §1.6 capability at all; the host's native eventing subsumes it. The Profile allows this: webhook intake is the mechanism, not the goal. **Verdict: fits; adapter author picks Stripe-direct or Woo-internal-events.**

### 3.7 Checkout session creation, bends but fits

Woo's checkout is a full Woo-managed flow (cart, billing-address form, gateway selection). Bypassing Woo to drop a bare Stripe Checkout Session in front of the subscriber is possible but abandons Woo's tax/shipping/coupon layers. A Profile-compliant `om-woocommerce` adapter has two options:

1. Build `<om:offer>` URLs that deep-link into Woo's cart with the tier's product pre-added (`?add-to-cart=PRODUCT_ID`), letting Woo host the checkout. The Profile's `create_checkout_session() -> { checkout_url, ... }` contract is satisfied, the `checkout_url` points into Woo's cart, not into Stripe directly.
2. Bypass Woo and use the PSP SDK path `om-wordpress` already uses.

Option 1 is more Woo-idiomatic; option 2 skips Woo entirely. Both satisfy the Profile contract; the adapter author picks. **Verdict: bends, the checkout_url may resolve to a host-cart flow rather than a PSP-checkout flow, but the return value shape is unchanged.**

### 3.8 Portal / customer self-service, fits

WooCommerce Subscriptions has its own `/my-account/subscriptions/` surface for self-service cancellation and upgrade. The adapter's `create_portal_session()` returns a redirect to that URL rather than to Stripe's billing portal. Some Woo sites additionally expose Stripe's portal; the adapter can prefer whichever the host operates. **Verdict: fits; the portal URL is a host-local URL rather than a PSP URL.**

### 3.9 WooCommerce overall verdict

All eight capabilities fit. Two bend in form but not in contract: the PSP layer (1.7) may resolve to the host's cart, and the portal (1.8) may resolve to the host's account page. Neither bend requires a Profile change. **WooCommerce is a passing validator for Profile 1.0.**

---

## 4. Validation: Memberful

Memberful is a focused membership platform: members, plans, posts protected by plan, a Stripe integration managed by Memberful, and a WordPress plugin that bridges Memberful's model into a WP site. A hypothetical `om-memberful` adapter could be written as a standalone service talking to Memberful's GraphQL API, or as a WP plugin wrapping Memberful's existing bridge.

Per-capability verdict:

### 4.1 Subscriber identity, fits

Memberful members have their own opaque ids, exposed via the public GraphQL API (`memberQuery.id`). Each member has `email`, `fullName`, and a stable `id` unchanged by profile edits. The Profile's §1.1 `get_subscriber_by_id` / `get_subscriber_by_email` / `iterate_active_subscribers` map directly onto GraphQL queries. **Verdict: fits as-is.**

### 4.2 Tier model, fits

Memberful `plans` have `id`, `name`, `priceCents`, `intervalUnit`, `intervalCount`, and the associated Stripe price id. `tier_for_psp_price_id` is a direct plan lookup. Features are not a Memberful primitive; the adapter would add a side config (YAML or settings row) mapping plan id → feature list, exactly as `om-ghost`'s `om-config.yaml` does. **Verdict: fits; features live in adapter-side config, as in the Ghost reference.**

### 4.3 Entitlement derivation, fits

Memberful subscriptions have `active: bool` and `expiresAt`. The derivation is simpler than Stripe (no `trialing` / `past_due` / `incomplete` fan-out; Memberful absorbs those inside its own active flag). The Profile's minimum three-status set is met. **Verdict: fits; entitlement derivation is simpler, not harder.**

### 4.4 Per-post access policy, fits

Memberful's WP plugin ships a "Restrict access" sidebar option that writes post meta indicating required plan ids. The adapter can read this directly, or re-implement the `om-wordpress` meta-box UI and ignore Memberful's. Either works. **Verdict: fits as-is.**

### 4.5 Feed generation and token gating, fits

Memberful does not emit `om` feeds. The adapter implements feed rendering and tokens from scratch, following the §1.5 contract. Token→member resolution uses Memberful's `id` as the uuid input to the HMAC. **Verdict: fits; feed generation is the adapter's responsibility, as for every host.**

### 4.6 Webhook intake + idempotency, fits, but the event source differs

Memberful sends its own webhooks (`subscription.created`, `subscription.activated`, `subscription.deactivated`, `member_signup.succeeded`). The adapter subscribes to Memberful's webhooks rather than Stripe's directly, because Memberful is the authoritative layer and reconciles Stripe internally. Signature verification uses Memberful's HMAC header, not Stripe's.

This is the first capability where the PSP-direct assumption in the references (Stripe webhook → handler) becomes host-internal (Memberful webhook → handler). The Profile already permits this, §1.6 names "PSP webhook" loosely; the event source can be the host when the host owns the PSP relationship. `om-wordpress`'s `IdempotencyStore` mechanism (atomic claim + prune) is otherwise unchanged. **Verdict: fits; the webhook source is Memberful, not Stripe, and that is fine.**

### 4.7 Checkout session creation, fits

Memberful's checkout is hosted by Memberful at `{subdomain}.memberful.com/checkout?plan={id}`. The adapter's `create_checkout_session()` returns that URL as `checkout_url`; there is no PSP SDK call to make because Memberful does that upstream. The `session_id` is Memberful's, the Profile does not require it be a Stripe id. **Verdict: fits; the checkout_url resolves to Memberful's hosted checkout, analogous to the WooCommerce cart option.**

### 4.8 Portal / customer self-service, fits

Memberful exposes a hosted account page at `{subdomain}.memberful.com/account/`. The adapter redirects there. **Verdict: fits.**

### 4.9 Memberful overall verdict

All eight capabilities fit without bending. Memberful is a smaller and more focused host than WooCommerce and slots into the Profile with less friction. **Memberful is a passing validator for Profile 1.0.**

---

## 5. Validation verdict

Both external validators, WooCommerce + WooCommerce Subscriptions, and Memberful, fit Profile 1.0 as drafted. Two observations:

1. **The PSP layer moves.** In Ghost and WordPress, Stripe is authoritative and the host is an entitlement cache. In WooCommerce with Woo Subscriptions, Woo is authoritative and Stripe is a gateway. In Memberful, Memberful is authoritative and Stripe is an implementation detail. The Profile's §1.3 "entitlement derivation from PSP state" is loosely named; a more accurate name would be "entitlement derivation from the authoritative billing layer, whatever that is." Profile 1.1 may rename it; the contract itself does not change.

2. **The checkout URL is not always a PSP URL.** Both validators returned a host-cart URL or a host-hosted-checkout URL from `create_checkout_session()`. The Profile contract says the return value is a `{ checkout_url, session_id, psp }` triple; nothing requires `checkout_url` to resolve to a PSP domain. This is a latent ambiguity in `om-ghost` + `om-wordpress` because both happen to return Stripe URLs; the validator pass surfaced it. No change is required for Profile 1.0, the contract's return shape is correct, but Profile 1.1 should note the two common patterns explicitly.

No capability had to be added. No existing capability had to be split. **Profile 1.0 is validated. Publish as-is.**

The ROADMAP.md Phase 4 M10 escalation path, "split Profile into CMS Profile + Commerce-plugin Profile if validators diverge", is not triggered.

---

## 6. Non-CMS hosts

The Profile is not CMS-specific by design. Three non-CMS shapes, in decreasing order of adapter effort:

### 6.1 Static-site generator + edge functions (Eleventy + Cloudflare Workers)

The ROADMAP Phase 4 M11 static-site reference. Eleventy has no members, no subscriptions, no per-post access model beyond what the generator is told at build time. The adapter supplies all eight capabilities externally:

- Members live in Cloudflare KV, keyed by subscriber uuid
- Tiers live in a YAML config file committed to the repo, same shape as `om-ghost`'s `om-config.yaml`
- Entitlement state is the KV record, refreshed by the Stripe webhook Worker
- Per-post access policy lives in per-file YAML frontmatter (`om_access: paid`), read at Eleventy build time
- Feed generation is partly static (the per-token feed file is generated at build time when the subscriber list is small; the Worker serves it) and partly dynamic (when the subscriber list is large, the Worker renders at request time by reading KV)
- Webhook intake is a Worker with Durable Object-backed idempotency
- Checkout session is a Worker calling Stripe directly
- Portal is a Worker calling Stripe's billing portal

Every Profile capability is satisfied by the edge runtime plus the YAML config, with no host-CMS involvement. This demonstrates that the Profile contract works even when the "host" is a Git repository plus edge compute.

### 6.2 Headless commerce backend (Shopify, Lago, Stripe Billing alone)

A headless backend that owns the billing and customer layers but has no content model is the inverse of a CMS: strong on capabilities 1.1, 1.3, 1.6, 1.7, 1.8; absent on 1.2 (tiers are conflated with products), 1.4 (no content model), 1.5 (no feed). The adapter sits between the commerce backend (which supplies identity + billing) and an external content source (a Markdown repo, a second CMS, a Notion database). This is two adapters composed: one for the billing half, one for the content half.

Profile 1.0 does not forbid this composition; it simply does not describe it. An implementer building such a stack should read the Profile as eight independent capabilities, not as a monolith, and should expect to implement §1.1-1.3 + §1.6-1.8 against the commerce backend and §1.4-1.5 against the content source.

### 6.3 SaaS membership platform (Podia, Memberstack, Outseta)

These platforms are Memberful-shaped: they own members, plans, billing, and a "restrict this page" primitive, and they expose a public API. The Memberful validation in §4 generalizes, an adapter against Podia or Memberstack follows the same pattern, with plan-to-tier mapping in adapter-side config and feed generation supplied by the adapter. The PSP layer is internal to the platform.

The limiting factor on these platforms is usually not the data model but the API surface, does the platform expose the operations §1.1-1.8 require? The Memberful adapter works because Memberful's GraphQL API is complete. An adapter against a platform with a read-only public API or no webhook-signing secret would stall on §1.6 and could not reach Level 5.

---

## 7. What the Profile explicitly does NOT require

Profile-compliance does not require any of the following, even though most CMSes and commerce platforms ship them:

1. **A theme system.** Ghost has Handlebars themes; WordPress has PHP themes; Eleventy has Nunjucks/Liquid/whatever. `om` feeds bypass the theme layer in both references and never participate in theme-scoped rendering. A host with no theme system (a static site, a headless commerce backend) is not at a disadvantage.
2. **A comments primitive.** Both references ignore comments entirely. The RSS feed does not carry comments; the access decision does not read them; revocation does not touch them. A host with no comment model is not penalized.
3. **A media library.** Enclosures per post are a Podcasting 2.0 concern. Adapter v1.0 need not integrate with the host's media library; the feed's enclosure URLs can be plain URLs in post content. Enclosure auth is a separate concern (SPEC.md Phase 2 errata).
4. **A block / Gutenberg editor or a structured content schema.** The per-post access policy can be captured in two or three meta keys (WordPress) or one enum-valued field (Ghost). A host with arbitrary markdown or plaintext content can still satisfy §1.4 as long as it has *some* place to attach per-post metadata.
5. **A built-in user-facing "my subscription" page.** The portal surface in §1.8 can redirect entirely to the PSP's hosted billing portal; the host never renders any subscription UI. Both references take this shortcut.
6. **A plugin / extension marketplace.** The adapter can be a sidecar process, a Cloudflare Worker, a standalone Node service, or a platform plugin. Profile-compliance is defined by the capability contract, not by the host's extension shape.

This list is not exhaustive. It exists to prevent a reading of the Profile that implies "to be Profile-compliant, your host needs to look like WordPress or Ghost." It does not.

---

## 8. Relationship to SPEC sections

Each Profile capability maps to one or more `SPEC.md` sections. Adapters satisfy `SPEC.md`; the Profile is a lens for identifying what host-side primitives a `SPEC.md`-conformant adapter depends on.

| Profile capability | Satisfies `SPEC.md` section(s) | Satisfies `../docs/FEATURESET.md` Level |
|---|---|---|
| 1.1 Subscriber identity | §1 Foundational (`<om:provider>`, per-subscriber feed); §4 (pseudonymous identity layer, 0.4) | 1 (Foundational), baseline for all higher levels |
| 1.2 Tier model | §1 (`<om:tier>`, `<om:feature>`); §6 (Payments: `<om:offer>` binding to tiers) | 1, 5 |
| 1.3 Entitlement derivation | §6.3 PSP binding profiles; §8 publisher conformance ("honor revocation in webhook handlers") | 5 |
| 1.4 Per-post access policy | §1 `<om:access>` values; §2 `<om:window>` (0.2+) | 1, 2 |
| 1.5 Feed generation + token gating | §1 `<om:authMethod>url-token</om:authMethod>`; §7 Level 2 (URL-token feeds) | 2 |
| 1.6 Webhook intake + idempotency | §6.3 PSP binding profiles (Stripe/Mollie); §8 publisher conformance | 5 |
| 1.7 Checkout session | §6.2 `<om:offer>`; in-reader checkout flow; §9 discovery doc `endpoints.checkout` | 5 |
| 1.8 Portal / self-service | §7 Level 5 publisher conformance (subscription lifecycle management) | 5 |

The Profile does not address:

- `<om:group>` / SCIM group rosters (SPEC §3 at 0.2), requires a host-side group model the references do not yet implement
- `<om:bundle>` / `<om:bundled-from>` aggregator pattern (SPEC §3 at 0.4), addressed by a future `om-aggregator` Profile, out of scope here
- OM-VC and OM-VC-SD credential issuance (SPEC §4 at 0.2/0.4), requires host-side DID management, not in v1.0 of either reference
- `<om:gift>` redeemable entitlements (SPEC §5 at 0.4), a future Profile capability, not extracted from the references because neither implements it yet

Profile-versus-SPEC is a deliberate asymmetry: the Profile covers what the references actually implement, and advances as the references advance. Profile 1.1 will add whichever of the above ships first in either reference.

---

## 9. Conformance

This document is non-normative. It does not define a conformance level, does not produce certifiable claims, and cannot be cited as a compliance basis.

An implementer who follows the Profile's contract may use the informative label **"Profile-compliant"** in documentation and marketing. That label means "this adapter implements the eight capabilities described in §1 in a way the Profile authors would recognize." It is not audited. The audited claim for an adapter is the SPEC.md conformance level its output satisfies, measured against `om-test-suite` per ROADMAP Phase 3 M9. See `../docs/FEATURESET.md` for the conformance levels.

**What the Profile does not do:**

- Define a pass/fail test (the publisher test suite does that, against SPEC.md)
- Define the wire format (SPEC.md does that)
- Enumerate forbidden host shapes (a host is whatever ships an adapter)
- Serve as the basis for a certification program

**What the Profile does do:**

- Make the next CMS port a one-week extraction rather than a six-week green-field
- Give implementers a shared vocabulary for boundary decisions
- Tell validators (WooCommerce, Memberful, and the next one) what to probe

---

## 10. Versioning

Profile versioning is independent of SPEC versioning.

- **Profile 1.0** maps to `SPEC.md` 0.4 and the references at the state committed on 2026-04-24.
- **Profile 1.1** (anticipated) will add any capability a reference implementation newly exhibits (group rosters, gift redemption, VC issuance) AND that a real adapter author has requested.
- **Profile 2.0** is reserved for a structural change, splitting CMS and Commerce-plugin profiles, or absorbing the aggregator pattern. Not anticipated.

Profile revisions will not retroactively invalidate Profile 1.0 adapters. Profile 1.1 capabilities are additive.

---

## Appendix A, The eight dimensions, at-a-glance

For the implementer who wants the contract on one page:

1. **Subscriber identity**, stable opaque uuid + lookup by id / email / psp-customer + iteration
2. **Tier model**, finite tier set + reverse map from psp-price-id + features-per-tier
3. **Entitlement derivation**, pure function from current subscription to `{tier, features, is_active}`
4. **Per-post access policy**, per-content metadata declaring public / members / paid / tier-restricted
5. **Feed generation + token gating**, HMAC-SHA256 feed tokens; token→subscriber resolution; RSS 2.0 + `om:` renderer that bypasses the host theme
6. **Webhook intake + idempotency**, raw-body-reading endpoint + atomic claim-once store + scheduled prune
7. **Checkout session**, `(offer_id, return_url, customer_email?, correlation_id?) -> {checkout_url, session_id, psp}`
8. **Portal / self-service**, redirect to a PSP or host self-service URL given a feed-token-authenticated subscriber

If a host exposes these eight, an `om` adapter on top of it is writable. That is the whole Profile.
