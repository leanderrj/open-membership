# om-eleventy architecture

This document goes one level deeper than `README.md`. Read it once if you are bringing up a production deployment, porting to a different edge runtime (Deno Deploy, Vercel Edge, Netlify Edge, Fastly Compute), or writing a case study.

## The split: build-time vs. request-time

Every `om` publisher needs to answer two questions on every request:

1. Is this caller entitled to the content they are asking for?
2. What does the content look like right now?

A dynamic server-side publisher (Ghost, WordPress) answers both at request time. A static-site generator cannot: the content is built once and uploaded as flat files. That means entitlement must be answered at the edge, and the content must be available at the edge — either as a static artifact the edge function reads, or as an asset the edge fetches and overlays.

`om-eleventy` picks the first path. The Eleventy build emits:

- `_site/index.html` — the landing page
- `_site/posts/<slug>/index.html` — one page per post, rendered with an awareness of the post's `om_access` value so that gated posts show a preview + unlock link on the website
- `_site/public.xml` — an RSS+om feed containing open posts in full and gated posts as preview stubs
- `_site/.well-known/open-membership` — a JSON discovery document reflecting the publisher's configuration
- `_site/om-config.yaml` — a copy of the publisher config, so introspection tools can see what the publisher is advertising

The Cloudflare Worker is the edge runtime. Its routes are:

| Path | Purpose |
|---|---|
| `/.well-known/open-membership` | Overrides the static discovery document with one that reflects live endpoint URLs (`env.PUBLIC_URL` can differ from what was committed to the repo) |
| `/feed/om/:token/` | Renders a fresh RSS+om feed for the subscriber the token resolves to. Entitled items get full bodies; the rest get previews |
| `/api/checkout` | POST — creates a Stripe Checkout Session for a given offer |
| `/api/entitlements` | GET — polls Stripe (by `session_id`) or KV (by `feed_token`) for the current entitlement view |
| `/api/token` | POST — exchanges a feed token for a short-lived HS256 JWT carrying entitlement claims |
| `/api/webhook` | POST — Stripe webhook sink. Verifies signature, dedupes by event id, writes member state to KV |
| everything else | Falls through to `env.ASSETS.fetch()`, which serves the static bucket |

## State shape

Cloudflare KV is the only persistent state. Four key prefixes:

| Prefix | Value | Purpose |
|---|---|---|
| `member:<feed_token>` | `MemberState` JSON | Authoritative member record, keyed by the URL-borne token |
| `sub:<stripe_subscription_id>` | `<feed_token>` | Reverse index used by webhook updates |
| `cust:<stripe_customer_id>` | `<feed_token>` | Reverse index used by dispute handling |
| `idem:<stripe_event_id>` | `"1"` with 7-day TTL | Webhook idempotency claim |

No sessions, no OAuth, no API keys beyond the Stripe and HMAC secrets stored as Worker secrets.

## Why KV and not D1 / Durable Objects

- **KV** fits the access pattern: read-heavy, token-keyed lookup, eventually consistent is fine (Stripe retries absorb propagation delay), and the free tier is generous.
- **D1** would be over-specified. There are no relational queries to run; the member record is self-contained.
- **Durable Objects** would be appropriate if the webhook handler needed a strict atomic claim. KV with a read-then-put is weaker than a true compare-and-swap, but because every handler is idempotent at the record-overwrite level, a duplicate claim is not a correctness problem. We traded strict atomicity for lower operational footprint.

If a future version needs atomic claims — e.g., for credit balance accounting, which `om` 0.4 does not define — the DO migration is a one-file change behind the `Kv` facade.

## The per-subscriber feed render

At render time the Worker has:

- `config`: publisher-side `om.config.yaml`, bundled at deploy
- `member`: KV record resolved from the URL token
- `entitlement`: pure function of `member.status` + `member.stripe_price_id` + config
- `items`: the item set that should appear in the feed

For the v0.1 scaffold, `items` is a fixture inside the Worker (see `worker/src/routes/feed.ts`). The production path reads the Eleventy-built static manifest: either a JSON file emitted during build (`_site/om-items.json`) or the live `_site/public.xml` parsed on demand. The scaffold leaves both approaches as a TODO — the render function is decoupled from the item loader.

Access decision, per item (see `lib/feed.ts::decideAccess`):

- `access=open` → always grant content
- `access=members-only` + active member → grant content, relabel as `open`
- `access=locked` or `preview` + active member whose tier matches `om_required_tiers` → grant content, relabel as `open`
- otherwise → drop the body, emit the preview, emit `<om:unlock>`

This is the same decision function as `om-ghost` and `om-wordpress`; the Profile (§1.4) names it explicitly.

## Failure modes and degradation

| Failure | Behavior |
|---|---|
| KV read fails | Handler returns 5xx; Stripe retries webhooks; readers retry feed fetches via their standard HTTP retry |
| Stripe API unavailable | `/api/checkout` and `/api/entitlements` return 5xx; the feed continues to serve from KV state |
| Worker not deployed, static site live | Public feed (`/public.xml`) still serves from the bucket; members-only items show preview stubs; `/api/*` returns 404. Readers at Level 1 still see the discovery doc and the open items |
| Token unguessable but unknown | 404 (not 401). Matches `om-ghost` / `om-wordpress` |

## Non-goals for v0.1

- OM-VC / OM-VC-SD (Level 4, SPEC §4): out of scope; no DID key management in KV
- Bundles / aggregator role (SPEC §3): out of scope
- Pseudonymous mode end-to-end (SPEC §4.3): the KV records are keyed by Stripe customer id, which links to the payment identity. Supporting pseudonymous mode means routing payments through an aggregator and dropping the `cust:` index
- Multi-PSP: Stripe only
- Group rosters (`<om:group>`, SPEC §3 at 0.2): no group-admin UI. A group admin would need to run a small additional surface the Worker does not ship

Each of these has a documented upgrade path in `adapter-profile-fit.md`.
