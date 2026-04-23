# `om-ghost` — Technical Architecture

The reference Ghost implementation of Open Membership RSS. This document describes what the plugin does, how it integrates with Ghost's existing architecture, and how it avoids the trap of requiring Ghost core changes.

## Design constraints

1. **No Ghost core fork.** `om-ghost` must work with an unmodified Ghost install. Any feature that requires patching Ghost core is out of scope.
2. **Works with Ghost(Pro) and self-hosted.** The plugin should be deployable on both paid Ghost(Pro) instances (where theme upload is the only customization vector) and self-hosted Ghost (where more is possible).
3. **Depends on Ghost's existing Stripe integration.** The plugin does NOT set up its own Stripe connection. It uses the Stripe account the publisher has already connected to Ghost.
4. **No new database.** Subscriber state lives in Ghost's Members system. The plugin reads via the Content API; it does not maintain parallel state.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Ghost Instance                         │
│                                                              │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────┐ │
│  │  Theme with  │    │    Ghost      │    │   Existing   │ │
│  │ om templates │    │   Content API │    │    Stripe    │ │
│  │  + routes    │    │               │    │  integration │ │
│  └──────┬───────┘    └───────┬───────┘    └──────┬───────┘ │
│         │                    │                    │         │
│         │                    ▼                    │         │
│  ┌──────┴──────────────────────────────┐         │         │
│  │      om-ghost custom routes         │         │         │
│  │                                     │         │         │
│  │  /feed/om/:token      (paid feed)   │         │         │
│  │  /.well-known/open-membership       │         │         │
│  │  /api/om/checkout                   │─────────┤         │
│  │  /api/om/entitlements               │         │         │
│  │  /api/om/portal                     │         │         │
│  │  /api/om/token                      │         │         │
│  └─────────────────────────────────────┘         │         │
│                                                  │         │
└──────────────────────────────────────────────────┼─────────┘
                                                   ▼
                                            ┌──────────────┐
                                            │   Stripe     │
                                            │   API        │
                                            └──────────────┘
```

## Components

### 1. Theme-level additions (ships with any Ghost theme)

**`content/themes/mytheme/partials/om-head.hbs`**
Handlebars partial that emits the `om` namespace declarations and discovery link. Publishers include this in their theme's `default.hbs` in place of normal feed link tags:

```handlebars
<link rel="alternate" type="application/rss+xml" title="Paid feed"
      href="{{@site.url}}/feed/om/{{@member.subscription_token}}" />
<link rel="alternate" type="application/open-membership+json"
      href="{{@site.url}}/.well-known/open-membership" />
```

**`content/themes/mytheme/om-feed.hbs`**
The Handlebars template that Ghost uses when serving the paid feed. Emits the `om` XML structure with full content for entitled items.

**`routes.yaml` additions**
Publishers add these routes:

```yaml
routes:
  /feed/om/:token/:
    template: om-feed
    content_type: text/xml

  /.well-known/open-membership:
    template: om-discovery
    content_type: application/json
```

Ghost's dynamic routing layer handles the URL matching; the `:token` segment is passed to the template as a route parameter.

### 2. Server-side additions (requires self-hosted Ghost OR Ghost(Pro) with an external service)

The routes in §1 handle feed serving but can't validate tokens against the Members database directly from a Handlebars template. The plugin adds a small Node.js service (~400 lines) that:

- Handles `/api/om/checkout` — accepts POST with `offer_id`, `psp`, `price_id`, creates a Stripe Checkout Session, returns the URL
- Handles `/api/om/entitlements?session_id=X` — polls a Stripe session for provisioning status
- Handles `/api/om/token` — accepts a Ghost Members session cookie OR a tokenized URL param, issues a JWT with `entitlements` claim
- Handles `/api/om/portal` — redirects to Stripe Customer Portal for subscription management
- Listens for Stripe webhooks — updates an internal entitlements cache

For Ghost(Pro) users who can't run a Node sidecar, the plugin ships a Cloudflare Worker variant that deploys alongside the Ghost(Pro) instance and uses the Ghost Admin API to read Members data.

### 3. JWT issuer

The plugin issues JWTs with this shape:

```json
{
  "iss": "https://publisher.example",
  "sub": "member_abc123",
  "aud": "https://publisher.example",
  "exp": 1745420400,
  "iat": 1745416800,
  "entitlements": ["full-text", "ad-free", "early-access"],
  "tier_id": "paid",
  "subscription_id": "sub_abc123"
}
```

Entitlements are derived from Stripe entitlements if the publisher uses Stripe Entitlements, or from the publisher's tier mapping if they use vanilla Stripe Products. The mapping is configured in a `om-config.yaml` file the publisher maintains alongside `routes.yaml`:

```yaml
tiers:
  free:
    features: []
  paid:
    features: [full-text, ad-free]
    stripe_price_ids:
      - price_monthly_...
      - price_yearly_...
  founding:
    features: [full-text, ad-free, early-access, backstage]
    stripe_price_ids:
      - price_founding_...
```

### 4. `.well-known/open-membership` generation

The discovery document is generated at request time from:

- Ghost's own site settings (URL, name)
- `om-config.yaml` (tiers, features, groups)
- Stripe API (connected account ID, available prices)
- Static constants in the plugin (spec version, supported auth methods)

## The URL-token model

Ghost Members already have unique `uuid` values. The plugin uses a signed derivative of the member UUID as the feed token:

```
feed_token = HMAC-SHA256(
  key = publisher_signing_key,
  message = member_uuid + ":" + subscription_plan_id
)
```

This has three properties:

1. The token is deterministic — a given member+plan always produces the same token. Good for UX (user can bookmark their feed URL across subscriptions).
2. The token is unguessable — a random attacker can't forge tokens without the signing key.
3. Revocation is instant — when a subscription ends, the plugin checks the member's current status on each feed request and returns HTTP 403 with a signup prompt if the subscription is inactive.

On each feed request:

1. Parse the token out of the URL
2. Verify the HMAC against candidate member UUIDs (the plugin maintains a small in-memory cache; cold lookups hit the Ghost Admin API)
3. Check the member's current subscription status
4. If active, render the full-content feed with items gated by entitlements
5. If inactive, return a feed with only the `om:access members-only` announcement and a signup prompt item

## Anti-sharing (v0: log-only, v1: optional enforcement)

`om-ghost` v0 (Phase 1 of the roadmap) does NOT implement device fingerprinting. That's a Phase 2 or Phase 3 addition, and the spec hasn't yet defined `<om:sharing-policy>` (it's in the 0.5 open questions).

v0 DOES log:

- Feed request count per token per 24 hours
- Unique IP+User-Agent pairs per token per 24 hours
- The highest-read article per token per 24 hours

Publishers can see these in a simple admin view. If they want to act on the data (e.g., email a suspected sharer), that's manual for v0.

v1 (if `om` 0.5 specifies `<om:sharing-policy>`) adds optional per-device limits configurable by the publisher. This matches the FeedPress/Patreon model.

## Deployment modes

**Mode A: Ghost(Pro) + Cloudflare Worker**

- Publisher on Ghost(Pro) can't run sidecars
- Theme changes uploaded via Ghost Admin
- Cloudflare Worker deployed separately, handles the `/api/om/*` endpoints
- Worker uses Ghost Admin API key (stored in Worker secrets) to read Members data
- Stripe webhook destination is the Worker URL

**Mode B: Self-hosted Ghost + sidecar Node service**

- Publisher runs Ghost themselves
- Sidecar Node service runs on same host, accessible at `/api/om/*` via reverse-proxy
- Uses Ghost Admin API locally
- Stripe webhook destination is the local service URL

**Mode C: Self-hosted Ghost + integrated npm plugin**

- Future goal; requires Ghost to accept proper server-side plugin architecture
- Would eliminate the sidecar entirely
- Not in scope for `om-ghost` v1.0

## File layout

```
om-ghost/
├── README.md
├── package.json
├── om-config.example.yaml
├── routes.example.yaml
├── theme/
│   ├── om-feed.hbs
│   ├── om-discovery.hbs
│   └── partials/
│       └── om-head.hbs
├── worker/                 # Cloudflare Worker (Mode A)
│   ├── index.ts
│   ├── checkout.ts
│   ├── entitlements.ts
│   ├── token.ts
│   └── webhook.ts
├── service/                # Node sidecar (Mode B)
│   ├── index.ts
│   ├── checkout.ts
│   ├── entitlements.ts
│   ├── token.ts
│   ├── webhook.ts
│   └── feed-cache.ts
├── shared/
│   ├── ghost-client.ts
│   ├── stripe-client.ts
│   ├── jwt.ts
│   └── types.ts
└── test/
    ├── e2e.test.ts
    ├── token.test.ts
    ├── entitlements.test.ts
    └── conformance/       # runs against the om-test-suite
```

## Interfaces with existing Ghost features

**Ghost Members** — read via Admin API. Not modified.

**Ghost Stripe integration** — used as-is. The Stripe account configured in Ghost Admin is the same account the plugin reads products/prices/subscriptions from. The plugin does not create a second Stripe connection.

**Ghost Content API** — used to fetch posts for feed generation, honoring Ghost's native access-control rules (public vs. members-only vs. paid-only).

**Ghost Admin API** — used to read member state, subscription status, and tier membership.

**Ghost Webhooks (optional)** — if the publisher has Ghost-native webhooks enabled, the plugin subscribes to `member.added`, `member.activated`, `member.deleted`. Otherwise it polls the Admin API on cache expiry.

## What's out of scope for v1.0

- Non-Stripe PSPs (Mollie, PayPal, Adyen, Paddle). These are Phase 2 additions.
- OM-VC credential issuance. The plugin issues simple JWTs; upgrading to OM-VC 1.0 requires Ghost-side DID management, which is Phase 3.
- OM-VC-SD selective disclosure. Requires the `bbs-2023` cryptosuite, Phase 4 at earliest.
- Bundle aggregator mode. A Ghost instance could run as a bundle aggregator, but the code path is different enough to warrant a separate plugin (`om-aggregator`) rather than folding it into `om-ghost`.
- Group subscriptions (publisher-managed family plans). The spec supports them, but v1.0 ships with individual subscriptions only. Families can be added in a v1.1 release.

## Testing

v1.0 ships with:

- Unit tests for JWT issuance, HMAC token generation, Stripe webhook parsing
- Integration tests against a test-mode Stripe account
- End-to-end tests against a dockerized Ghost instance
- Conformance tests that run the plugin against `om-test-suite` Levels 1, 2, 5

The last one is the important one for spec credibility. Every `om-ghost` release MUST pass the test suite at the claimed conformance level.

## Licensing

MIT. Code ownership by the working group after custodian commitment; interim ownership by the initial engineer under a contributor agreement that transfers to the custodian on Phase 3 completion.

## Why Ghost and not WordPress first

Decided during roadmap scoping: Ghost is the better first target because:

1. Its Members + Stripe model is the closest existing primitive to what `om` describes; less impedance mismatch
2. The custom-routes-and-templates mechanism makes the RSS/discovery endpoints achievable without server-side plugin architecture
3. The Ghost community is philosophically aligned (independent publishers, no algorithmic feed, "you own your content")
4. 404 Media and similar publishers are already on Ghost and already paying for proprietary versions of this feature — the adoption story writes itself
5. Ghost's codebase is small and approachable; WordPress's is vast and politically complex

WordPress support is Phase 4 specifically because it's harder, not because it's less important.
