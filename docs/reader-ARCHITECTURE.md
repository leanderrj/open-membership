# Reader Reference Architecture, Miniflux Fork

The reader side of the first interop test. Forks [Miniflux](https://miniflux.app) to add `om` support. The goal is proving that a normal RSS reader can subscribe to a paid `om` feed, drive the checkout flow, and render gated content correctly.

## Why Miniflux and not NetNewsWire

NetNewsWire would be the higher-impact target (large active iOS+macOS user base, open-source, Apple platform reach). Miniflux is the better v0 choice because:

1. **Self-hosted web UI.** The checkout flow happens in a browser. No per-platform native integration required.
2. **Go codebase, ~40k lines.** Small and approachable for one engineer.
3. **Active single-maintainer governance.** Frédéric Guillot has a track record of accepting well-scoped PRs.
4. **Existing multi-account semantics.** Each Miniflux user already has their own feed subscriptions; adding per-feed authentication tokens fits the mental model.
5. **Upstream-merge possibility.** If the PR is accepted into Miniflux proper (rather than remaining a fork), the adoption story improves dramatically.

NetNewsWire gets a parallel effort in Phase 4 (months 10-12) using lessons learned from Miniflux.

## Scope

The Miniflux fork must support:

- **Level 1 (Parsing):** read `om` namespace declarations, display `<om:tier>` info, show `<om:preview>` content for gated items
- **Level 2 (URL token):** accept a pre-obtained tokenized feed URL, fetch content with it normally
- **Level 5 (Checkout):** present an "Upgrade to read" button when user hits a gated item, launch the publisher's `/api/om/checkout` flow in the system browser, poll `/api/om/entitlements` for completion, refresh the feed after entitlement is granted

Levels 3, 4, 6, 7, 8 are out of scope for v0.

## Architecture

Miniflux has a clean separation between the **feed poller** (a goroutine that periodically fetches feeds), the **storage layer** (PostgreSQL), and the **web UI** (server-rendered HTML with minimal JS). The `om` additions fit cleanly into each.

```
┌─────────────────────────────────────────────────────────────┐
│                    Miniflux instance                         │
│                                                              │
│  ┌──────────────┐                                           │
│  │   Feed       │                                           │
│  │   Poller     │◀── periodic: fetch feed URL               │
│  │              │    (may include auth token in URL or      │
│  └──────┬───────┘     Authorization header)                 │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │  om parser   │───▶│  PostgreSQL  │                       │
│  │              │    │              │                       │
│  │  - reads     │    │  + om_       │                       │
│  │   discovery  │    │   feed_auth  │                       │
│  │   doc        │    │   table      │                       │
│  │  - persists  │    │  + om_       │                       │
│  │   offers     │    │   offers     │                       │
│  │              │    │   table      │                       │
│  └──────────────┘    └──────┬───────┘                       │
│                             │                                │
│                             ▼                                │
│                      ┌──────────────┐                       │
│                      │   Web UI     │                       │
│                      │              │                       │
│                      │  + Subscribe │                       │
│                      │   button     │                       │
│                      │  + Manage    │                       │
│                      │   subscription│                      │
│                      └──────┬───────┘                       │
│                             │                                │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼ (in browser)
                     ┌─────────────────┐
                     │  Publisher's    │
                     │  /api/om/       │
                     │  checkout       │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │     Stripe      │
                     │    Checkout     │
                     └─────────────────┘
```

## Components

### 1. `internal/reader/om/`, feed parsing

A new Go package that handles the `om` namespace. Integrates into Miniflux's existing RSS parser as an extension; feeds without `om` are unaffected.

```go
package om

type Feed struct {
    Provider       string
    DiscoveryURL   string
    AuthMethods    []string
    Tiers          []Tier
    Offers         []Offer
    RevocationPolicy string
}

type Offer struct {
    ID       string
    TierID   string
    Prices   []Price
    Checkouts []Checkout
}

func Parse(reader io.Reader) (*Feed, error) { /* ... */ }
```

### 2. `internal/storage/om_auth.go`, auth state

Per-feed auth token storage. Schema additions to Miniflux's PostgreSQL:

```sql
CREATE TABLE om_feed_auth (
    feed_id         BIGINT PRIMARY KEY REFERENCES feeds(id),
    provider        TEXT NOT NULL,
    auth_method     TEXT NOT NULL,
    url_token       TEXT,
    bearer_token    TEXT,
    bearer_expires  TIMESTAMP,
    refresh_token   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE om_offers (
    id              BIGSERIAL PRIMARY KEY,
    feed_id         BIGINT NOT NULL REFERENCES feeds(id),
    offer_id        TEXT NOT NULL,
    tier_id         TEXT,
    data            JSONB NOT NULL,
    UNIQUE (feed_id, offer_id)
);
```

### 3. `internal/reader/fetcher/om_auth.go`, auth-aware fetch

When fetching a feed that has `om_feed_auth` state, the fetcher:

1. Checks if `bearer_token` is set and not expired → uses `Authorization: Bearer <token>` header
2. Otherwise checks if `url_token` is set → uses the token as URL parameter
3. Otherwise fetches unauthenticated (gets a preview-only feed)

### 4. `internal/api/om/`, checkout API

Miniflux exposes (to the browser only, not to external callers) a small API:

- `POST /om/subscribe`, starts the checkout flow
  - Input: `feed_id`, `offer_id`, `psp`
  - Action: POSTs to the publisher's `/api/om/checkout`, receives a checkout URL, returns it to the browser
- `GET /om/status?feed_id=X`, polls for entitlement
  - Polls the publisher's `/api/om/entitlements?session_id=Y` endpoint
  - On success, calls `/api/om/token` to receive a fresh JWT, stores it in `om_feed_auth`
  - Returns the user's current subscription status

### 5. UI changes

**Feed view:**
- Items with `<om:access>preview` show the preview content, then a "Read full article" button
- Clicking the button opens a modal showing available offers from the feed's `om:offer` list
- User picks an offer, clicks "Subscribe via Stripe", and is redirected to the checkout URL in a new tab

**Subscription management:**
- New view at `/om/subscriptions` listing all feeds where the user has active `om` auth
- Shows: feed name, tier, renewal date, "Manage on publisher site" link

**Initial discovery:**
- When a user subscribes to a new feed URL, the parser checks for `om` markup. If found, Miniflux shows a banner: "This feed offers paid subscriptions. Some content requires a subscription."

## The tricky parts

**Cross-browser-tab flow.** The user clicks "Subscribe" in Miniflux, goes to Stripe in a new tab, completes payment. Miniflux needs to know they succeeded. Two approaches:

1. **Return URL with polling.** Miniflux shows "Waiting for confirmation..." and polls `/om/status` every 3 seconds. The user completes Stripe, Stripe redirects back to the publisher's URL (which may just show a confirmation page), Miniflux's poll picks up the success.
2. **Manual "I've completed payment" button.** Uglier UX but works in all browsers. Button triggers an immediate status check.

v0 uses polling with a manual fallback if polling times out.

**Token refresh.** Bearer tokens from the publisher expire. The fetcher needs to detect 401 responses, call `/api/om/token` with the refresh token, store the new bearer token, retry the feed fetch. This is standard OAuth client plumbing; Miniflux's existing HTTP client abstractions make it reasonably clean.

**Storing tokens securely.** Miniflux stores feed URLs in plaintext today; stored bearer tokens should be encrypted at rest. The fork adds a small encryption layer using the Miniflux admin-configured secret key. Not bulletproof against a compromised Miniflux server, but substantially better than plaintext.

**Per-user vs per-instance auth.** Miniflux is multi-user but feeds are shared across users (two users subscribing to the same feed URL result in one `feeds` row). For `om`, different users will have different entitlements on the same feed. The fix: `om_feed_auth` is keyed by `(feed_id, user_id)` not just `feed_id`. Slight storage schema change from §2 above.

## Scope discipline

What the fork does NOT do in v0:

- **No multiple-PSP support.** Stripe only. Adding Mollie to the reader side happens in Phase 2 along with the publisher-side Mollie addition.
- **No VC verification.** Bearer tokens only. OM-VC comes in Phase 3.
- **No group subscription UI.** A user in a company group plan can still subscribe, but the UI treats it as an individual subscription with group-scoped entitlements. Fine for v0.
- **No bundle discovery.** If a feed declares `<om:bundled-from>`, v0 ignores it. Bundle support lands in Phase 5.

## Testing

v0 ships with:

- Unit tests for the parser, storage layer, auth logic
- Integration tests against a local `om-ghost` instance running in Docker
- Interop test: `om-test-suite` compliance for the Miniflux fork claiming Level 2 + Level 5 support
- At least one public-facing test feed (hosted by the working group) that exercises every `om` feature a v0 reader should handle

## Upstream strategy

The fork is called `miniflux-om`. When the implementation stabilises, a pull request is opened against Miniflux main describing the scope: roughly 2,000 lines, one optional database table, an opt-in UI surface, opt-in per feed.

If the PR is accepted, `miniflux-om` sunsets and users converge on Miniflux main. If it is rejected on grounds of scope or maintenance burden, `miniflux-om` continues as a permanent fork rebased against upstream quarterly and serves as the canonical reference reader. Either outcome is acceptable; the specification requires *a* reader that exists and works, not a specific one.

## File layout

```
miniflux-om/
├── (existing miniflux files)
├── internal/
│   ├── om/
│   │   ├── parser.go
│   │   ├── discovery.go
│   │   └── types.go
│   ├── storage/
│   │   └── om_auth.go
│   ├── reader/fetcher/
│   │   └── om_auth.go
│   └── api/
│       └── om/
│           ├── subscribe.go
│           ├── status.go
│           └── token.go
├── template/
│   ├── views/
│   │   └── om_subscriptions.html
│   └── partials/
│       └── om_upgrade_modal.html
└── migrations/
    └── 002_add_om_tables.sql
```

## Licensing

Apache 2.0 matching Miniflux upstream.
