# `om-miniflux`, Reader Reference Implementation (fork-prep package)

This directory is the **fork-prep package** for adding Open Membership RSS 0.4
support to [Miniflux v2](https://github.com/miniflux/v2). It is not a full
Miniflux checkout. It is the self-contained `om` Go module a Miniflux
maintainer can drop into `internal/om/`, plus documentation describing every
patch to Miniflux's existing source that applying this fork requires.

The design goal is that a maintainer can vendor this directory as
`internal/om/` in a Miniflux checkout, apply the patches in
[`PATCH-PLAN.md`](PATCH-PLAN.md), rebuild, and have Level 1, 2, and 5
conformance without having to redesign any of the module-level plumbing.

## What this adds to Miniflux

`om-miniflux` adds the Indie Reader profile (Levels 1, 2, 5 per
[`/FEATURESET.md`](../../FEATURESET.md)) to Miniflux:

- **Level 1 (Parsing)**, read the `om` namespace; display `<om:tier>` info;
  render `<om:preview>` content in place of gated items; ignore `om` elements
  on feeds that don't declare the namespace.
- **Level 2 (URL token auth + unlocks)**, persist per-feed url-tokens,
  attach them to fetch requests, follow `<om:unlock>` endpoints.
- **Level 5 (Commerce)**, parse `<om:offer>`, drive the checkout flow
  against the publisher's `/api/om/checkout`, poll `/api/om/entitlements`,
  exchange `/api/om/token` for a bearer, store the bearer encrypted at rest
  keyed by `(feed_id, user_id)`, and refresh content when access changes.

Out of scope at v0.1: Level 3 (bearer-with-RFC-9728 discovery, time windows,
SCIM groups), Level 4 (OM-VC 1.0), Level 6 (value-for-value), Level 7
(OM-VC-SD / pseudonymous mode), Level 8 (bundles), and Subscriber Portability
Format 1.0 import/export.

## Conformance target

| Level | Scope | Status in v0.1 |
|---|---|---|
| 1 | Parsing | Supported |
| 2 | URL token + `<om:unlock>` | Supported |
| 3 | Bearer + time windows + SCIM groups | Out of scope |
| 4 | OM-VC 1.0 + revocation checks | Out of scope |
| 5 | Commerce | Supported |
| 6 | Value-for-value | Out of scope |
| 7 | OM-VC-SD / privacy | Out of scope |
| 8 | Bundles | Out of scope |

This matches the **Indie Reader profile** from SPEC.md §7.1 and
../../docs/reader-ARCHITECTURE.md §Scope.

## Directory layout

```
om-miniflux/
├── README.md              this file
├── INTEGRATION.md         runbook for the end-to-end om-ghost interop test
├── PATCH-PLAN.md          every change to upstream Miniflux that applying this fork requires
├── go.mod                 makes the om/ package compile and testable standalone
└── om/                    the drop-in Go package
    ├── namespace.go       Namespace, Prefix, PortabilityNamespace constants
    ├── parser.go          Parse(io.Reader) ParseResult; stdlib encoding/xml only
    ├── types.go           Go structs for every om 0.4 element the Indie profile handles
    ├── auth.go            FeedAuth, AuthStore, ApplyRequest, BuildTokenizedURL, IsUnauthorized
    ├── checkout.go        CheckoutClient, BrowserOpener function pointer
    ├── entitlements.go    EntitlementClient, Poll, ApplyToAuth, Granted
    ├── preview.go         Render: pure substitution of preview content
    ├── discovery.go       FetchDiscovery, ParseDiscovery
    ├── *_test.go          unit tests for each file
    └── testdata/
        ├── basic.xml            public feed with namespace declaration only
        ├── url-token.xml        url-token feed with one preview item
        ├── bearer-paid.xml      bearer feed with multiple tiers and offers
        ├── discovery-basic.json corresponding Level 1/2 discovery document
        └── discovery-full.json  Level 5 discovery document with tax fields
```

## Installation (as a Miniflux fork)

The `om/` package is written to be vendorable into a Miniflux checkout as
`internal/om/`. It has zero non-stdlib dependencies so the vendor step is a
straight file copy.

### Step 1. Pin a Miniflux upstream commit

```bash
git clone https://github.com/miniflux/v2 miniflux-om
cd miniflux-om
git checkout -b om-integration
# Document the pinned upstream SHA in your fork's CHANGELOG.
```

### Step 2. Drop in the om package

```bash
cp -r ../RSS-OPEN-MEMBERSHIP/reference/om-miniflux/om internal/om
```

No `go.mod` merge is needed: the `om` package has no imports outside Go's
standard library.

### Step 3. Apply the patches listed in `PATCH-PLAN.md`

Each entry in [`PATCH-PLAN.md`](PATCH-PLAN.md) names an upstream file, a
change type (new / modify / patch), a size estimate, and an upstream-candidate
flag. Work through them in the order listed; the order is dependency-safe.

### Step 4. Run the SQL migration

```bash
./miniflux -migrate
```

The migration adds two tables, `om_feed_auth` and `om_offers`, both keyed by
`(feed_id, user_id)` per ../../docs/reader-ARCHITECTURE.md §"Per-user vs per-instance
auth". Neither table is touched when a feed doesn't use `om`; non-`om` feeds
are unaffected.

### Step 5. Build and test

```bash
go build ./...
go test ./internal/om/...
```

### Step 6. Run the interop suite

See [`INTEGRATION.md`](INTEGRATION.md) for the end-to-end runbook against
`om-ghost`.

## Architecture overview

Miniflux separates the feed poller (a goroutine that fetches feeds), the
storage layer (PostgreSQL), and the web UI (server-rendered HTML with
minimal JS). The `om` additions fit cleanly into each, following
../../docs/reader-ARCHITECTURE.md.

```
┌──────────────────────────────────────────────────────────────┐
│                        Miniflux instance                      │
│                                                               │
│  ┌────────────────┐    fetcher asks AuthStore.Get(feed,user)  │
│  │  Feed poller   │─── om.ApplyRequest(req, auth)             │
│  │  goroutine     │                                           │
│  └───────┬────────┘                                           │
│          ▼ raw XML                                            │
│  ┌────────────────┐                                           │
│  │  om.Parse()    │── ParseResult{Channel, Items}             │
│  └───────┬────────┘                                           │
│          ▼                                                    │
│  ┌────────────────┐    PostgreSQL                             │
│  │  storage       │─── feeds (existing)                       │
│  │                │    entries (existing)                     │
│  │                │  + om_feed_auth (new)                     │
│  │                │  + om_offers (new)                        │
│  └───────┬────────┘                                           │
│          ▼                                                    │
│  ┌────────────────┐                                           │
│  │   web UI       │── templates substitute om.Render()        │
│  │                │   on preview items                        │
│  │  /om/subscribe │─── om.CheckoutClient.StartAndOpen()       │
│  │  /om/status    │─── om.EntitlementClient.Status()          │
│  └────────────────┘                                           │
└───────────────────────────────────────────────────────────────┘
```

Every outward-facing boundary is represented in `om/` by an interface or a
function-pointer, so the package is testable in isolation and the Miniflux
patches remain small:

- `om.AuthStore` is the persistence boundary; Miniflux's storage package
  satisfies it with the new `om_feed_auth` table.
- `om.BrowserOpener` is the "open a URL in the user's browser" boundary;
  Miniflux satisfies it by passing the URL back through the web-handler
  response so the calling browser tab can `window.open` it.
- `http.Client` is the HTTP boundary; production uses Miniflux's shared
  fetch client, tests use `httptest.NewServer`.

## End-to-end user flow

Concretely, what happens when a user subscribes to a paid Field Notes feed
through `om-miniflux`:

1. **Subscribe (unauth).** User pastes `https://fieldnotes.example/feed` into
   Miniflux's "Add feed" dialog. Miniflux fetches the URL unauthenticated;
   `om.Parse` populates the feed-level `Channel.Provider`, `AuthMethods`,
   `Offers`, and an item-level `Items[n].Access == preview` on any gated item
   with a `<om:preview>` block.
2. **Discovery.** The fetcher calls `om.FetchDiscovery(ctx, client,
   channel.Discovery)` to resolve the publisher's `/api/om/checkout`,
   `/api/om/entitlements`, and `/api/om/token` endpoints.
3. **Render preview.** The feed renders in the reader with gated items
   showing the preview content plus a "Read full article" button. The button
   is a form posting to Miniflux's `/om/subscribe` handler.
4. **Checkout.** The `/om/subscribe` handler invokes
   `om.CheckoutClient.StartAndOpen(ctx, endpoint, req)`, which POSTs to the
   publisher's `/api/om/checkout`, receives a Stripe Checkout Session URL,
   and returns it so the browser can `window.open` a new tab.
5. **User pays in Stripe.** Outside Miniflux. Stripe redirects back to the
   publisher's `success_url`; the publisher's webhook handler updates the
   publisher-side entitlement cache.
6. **Poll for entitlement.** The Miniflux tab polls `/om/status?session_id=X`
   every 3 seconds (10s after the first minute) using
   `om.EntitlementClient.Poll`. When `Active=true`, Miniflux:
   1. Calls `/api/om/token` via `EntitlementClient.ExchangeToken` to get a
      fresh bearer JWT.
   2. Stores the bearer in `om_feed_auth` via `AuthStore.Put`, encrypted at
      rest using the admin secret.
   3. Triggers a feed re-fetch.
7. **Unlock.** The next fetch passes the bearer on the `Authorization`
   header. The publisher returns the full-content feed. `om.Parse` re-runs;
   `om.Granted(item, ent)` returns true on the previously-gated items;
   `om.Render` returns the raw content instead of the preview wrapper.
8. **Cancel / revoke.** When Stripe fires `customer.subscription.deleted` or
   `charge.dispute.created`, the publisher flips its side of the
   entitlement cache. The fetcher's next run still has a bearer, but the
   publisher's response no longer contains the gated content; the item
   reverts to preview rendering. After `grace_hours` expires, the bearer
   refresh path returns `active=false` and the bearer is removed from
   `om_feed_auth`.

## SPEC requirements → Miniflux code-change map

| SPEC.md requirement | File(s) in Miniflux | New / Modify | Upstream-PR candidate |
|---|---|---|---|
| Namespace recognition (§0.1) | `internal/om/namespace.go`, `internal/om/parser.go` | New | Yes |
| `<om:provider>` parsing (§0.1) | `internal/om/parser.go`, `internal/om/types.go` | New | Yes |
| `<om:authMethod>` parsing (§0.1) | `internal/om/parser.go` | New | Yes |
| `<om:tier>`, `<om:feature>` parsing (§0.1, §0.3) | `internal/om/parser.go` | New | Yes |
| `<om:access>` per-item (§0.1) | `internal/om/parser.go` | New | Yes |
| `<om:preview>` substitution (§0.1) | `internal/om/preview.go`, `template/views/entry.html` | New + modify | New: yes; template: carry |
| Discovery-doc fetch (§2) | `internal/om/discovery.go`, `internal/reader/processor/*` | New + modify | Yes |
| `<om:unlock>` per-item or channel (§0.1) | `internal/om/parser.go`, `internal/reader/fetcher/*` | New + modify | Yes |
| url-token auth (§0.1) | `internal/om/auth.go`, `internal/reader/fetcher/fetcher.go` | New + patch | Yes (auth.go); Patch (fetcher hook) |
| Bearer auth (§0.1) | `internal/om/auth.go`, fetcher hook | New + patch | Yes |
| Token refresh on 401 (reader-ARCHITECTURE §"Token refresh") | `internal/om/entitlements.go`, fetcher hook | New + patch | Yes |
| `<om:offer>` display (§0.3) | `internal/om/parser.go`, `template/views/entry.html` | New + modify | New: yes; template: carry |
| `/api/om/checkout` drive (§0.3) | `internal/api/om/subscribe.go` | New | Yes |
| `/api/om/entitlements` poll (§0.3) | `internal/api/om/status.go` | New | Yes |
| `/api/om/token` exchange (§0.3) | `internal/api/om/token.go` | New | Yes |
| `<om:revocation>` display (§2.2) | `internal/om/types.go`, `template/views/om_upgrade_modal.html` | New + new | New: yes; template: carry |
| `<om:feature>` entitlement check (§0.3) | `internal/om/entitlements.go` (`Granted`) | New | Yes |
| Encrypt bearer at rest | `internal/storage/om_auth.go` | New | Discuss (crypto shape) |
| Per-user token storage | `internal/storage/om_auth.go` | New | Yes |
| `/om/subscriptions` management view | `template/views/om_subscriptions.html`, route | New | Carry |
| DB migration | `database/sql/migration_*.sql` | New | Yes |

## Upstream contribution plan

Work splits into three tranches by expected upstream acceptance:

### Tranche A, likely upstream-accepted

Self-contained, zero-diff to existing functionality, opt-in per feed. PR
these together as a single logical change called "Optional Open Membership
RSS (om) module support":

- `internal/om/` package (the files in this directory)
- `database/sql/migration_*.sql` adding the two new tables
- `internal/storage/om_auth.go`, narrowly-scoped storage wrapper
- Extension point in `internal/reader/fetcher/` that delegates
  `om.ApplyRequest` when the feed is in `om_feed_auth`
- Extension point in `internal/reader/processor/` that calls `om.Parse`
  alongside the existing parser and stores the results

Expected size: ~1,400 lines added, ~40 lines modified in existing files.

### Tranche B, upstream-eventual, discuss first

Functionality Frédéric will probably want to shape himself:

- Encrypted-at-rest bearer storage. Miniflux's existing secret-handling uses
  a single admin secret for CSRF and session cookies. Before committing to
  using the same secret for feed tokens, open an issue and propose a
  dedicated `OM_BEARER_ENCRYPTION_KEY` with AES-GCM per plans/PHASE-1-2.md
  decision D2. Carry the simpler single-secret version as fork-only until
  the discussion concludes.
- Token-refresh path on 401. The shape is clean but touches a hot path; PR
  separately so it can be reviewed on its own.

### Tranche C, fork-forever

UX surface that Miniflux's philosophy will likely reject:

- The `/om/subscriptions` management view and its template
- The offer-picker modal on preview items
- The "This feed offers paid subscriptions" banner on feed add
- Any dependency additions (none at v0.1, but future work may add a crypto
  lib for Level 4)

These carry as fork patches indefinitely. The PATCH-PLAN.md classification
matches this tranche breakdown.

If Tranche A merges upstream, `om-miniflux` simplifies to "Miniflux main plus
Tranche C patches," which is a much smaller fork surface than the current
plan assumes.

## Testing

### Unit tests (fixture-based)

```bash
cd reference/om-miniflux
go test ./om/...
```

The unit tests cover:

- **Parsing:** namespace recognition, tier/offer/preview extraction,
  RSS 2.0 and malformed-input handling (`parser_test.go`).
- **Auth:** url-token append, bearer header, expired-token error,
  unsupported-method error, nil-auth no-op, `BuildTokenizedURL`,
  `IsUnauthorized` (`auth_test.go`).
- **Checkout:** end-to-end POST against an `httptest.NewServer`, browser
  opener function pointer called with the returned URL, non-2xx handling,
  missing-redirect handling (`checkout_test.go`).
- **Entitlements:** active/pending status, bearer persistence via
  `ApplyToAuth`, the `Granted` matrix across tiers and features
  (`entitlements_test.go`).
- **Preview:** full content when granted, preview substitution when denied,
  locked placeholder when no preview is declared (`preview_test.go`).
- **Discovery:** parse basic + full discovery documents, fetch over HTTP,
  error on missing provider, tolerant of unknown forward-compat fields
  (`discovery_test.go`).

All fixture feeds round-trip: they are valid RSS 2.0 that parses cleanly
through `encoding/xml` without custom extensions.

### Integration test (against om-ghost)

See [`INTEGRATION.md`](INTEGRATION.md).

## Known limitations of v0.1

Intentional scope reductions; each lifts in a later phase per
plans/PHASE-1-2.md and the roadmap:

- **No DPoP.** `<om:authMethod>dpop</om:authMethod>` declarations are parsed
  but surface as an unsupported-method error at fetch time. DPoP lands in
  Phase 2 M4 Track F alongside `<om:sharing-policy>`.
- **No OM-VC 1.0 verification.** Bearer tokens only. VC presentation is
  Phase 3 work (Level 4).
- **No OM-VC-SD / pseudonymous mode.** The `<om:privacy>` element is parsed
  but not acted on. Pseudonymous flows are Level 7 and require the
  `bbs-2023` cryptosuite. Not in this fork.
- **No bundle support.** `<om:bundled-from>` is parsed into
  `Channel.Raw["bundled-from"]` but verification of a presented bundle
  credential is not implemented. Level 8, Phase 5.
- **No Subscriber Portability Format import or export.** Required for
  Level 5 at spec 1.0; the hook is reserved in `om.PortabilityNamespace`
  but the round-trip isn't implemented. Phase 5 M13.
- **No time-window evaluation.** `<om:window>` is parsed into
  `Items[n].Window` but the fetcher and renderer do not evaluate it against
  the current clock. Level 3 work; Phase 2+.
- **No group subscriptions UI.** A user in a company plan can subscribe and
  the returned bearer may carry group-scope claims, but Miniflux's UI
  doesn't distinguish group from individual entitlements. Phase 3.
- **No Mollie.** Stripe only in v0.1. Mollie reader-side requires no change
  per ../../docs/reader-ARCHITECTURE.md §"Scope discipline", the publisher returns a
  redirect URL whether it's Stripe or Mollie, but live-mode Mollie
  plumbing is Phase 2 M4 Track C.
- **No live-mode Stripe.** The fork runs against Stripe test-mode only in
  v0.1. Live-mode cutover is Phase 2 M4 Track A.
- **No `<om:sharing-policy>` enforcement.** Parsed into `Channel.Raw` but
  not honored. The spec flags this as Provisional through 0.4.1.

## License

Apache 2.0, matching Miniflux upstream. The package-level doc comments,
types, and fixture data are released under the same permissive terms as
SPEC.md (see `/LICENSE-SPEC`).
