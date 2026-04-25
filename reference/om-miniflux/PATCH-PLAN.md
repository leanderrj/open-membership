# Patch plan — applying `om-miniflux` against Miniflux v2

Every change to Miniflux's existing source that applying this fork requires.
Entries are ordered so that applying them in sequence produces a compiling,
testable tree after each step.

Legend for **Type**:

- **new** — file is entirely new; copy from this directory or create
  following the description.
- **modify** — existing file gains new lines; existing behavior unchanged.
- **patch** — existing file is modified in place; existing behavior changes
  (always additively / behind a nil check).

Legend for **Upstream**:

- **yes** — PR this to `miniflux/v2`; self-contained, opt-in, no impact on
  non-`om` feeds.
- **discuss** — PR-candidate but needs an issue first; the shape may need to
  change to satisfy the upstream maintainer.
- **no** — stays in the fork indefinitely; the UX surface is unlikely to be
  accepted without prior demand signals.

Sizes are lines added / lines removed, rounded.

## Tranche A — package vendor + storage + fetcher hook

Drop-in, no conflict with upstream.

| # | File (Miniflux upstream path) | Type | Size | Purpose | Upstream |
|---|---|---|---|---|---|
| A1 | `internal/om/namespace.go` | new | +18 / 0 | Namespace constant and prefix. Copy from this directory. | yes |
| A2 | `internal/om/types.go` | new | +200 / 0 | Typed representation of every om 0.4 element the Indie profile handles. Copy. | yes |
| A3 | `internal/om/parser.go` | new | +170 / 0 | `Parse(io.Reader) (*ParseResult, error)` using stdlib `encoding/xml`. Copy. | yes |
| A4 | `internal/om/auth.go` | new | +115 / 0 | `FeedAuth`, `AuthStore`, `ApplyRequest`, `BuildTokenizedURL`, `IsUnauthorized`. Copy. | yes |
| A5 | `internal/om/checkout.go` | new | +95 / 0 | `CheckoutClient`, `BrowserOpener`. Copy. | yes |
| A6 | `internal/om/entitlements.go` | new | +180 / 0 | `EntitlementClient`, `Poll`, `ApplyToAuth`, `Granted`. Copy. | yes |
| A7 | `internal/om/preview.go` | new | +45 / 0 | `Render`: substitute preview content when entitlement missing. Copy. | yes |
| A8 | `internal/om/discovery.go` | new | +90 / 0 | Fetch and parse `.well-known/open-membership`. Copy. | yes |
| A9 | `internal/om/testdata/*` | new | +200 / 0 | Fixture feeds (`basic.xml`, `url-token.xml`, `bearer-paid.xml`) and discovery JSON. Copy. | yes |
| A10 | `internal/om/*_test.go` | new | +350 / 0 | Unit tests for each file. Copy. | yes |
| A11 | `database/sql/schema_<N>.sql` or equivalent | new | +40 / 0 | Adds `om_feed_auth` and `om_offers` tables keyed by `(feed_id, user_id)` per ../../docs/reader-ARCHITECTURE.md §"Per-user vs per-instance auth". | yes |
| A12 | `database/migrations.go` | modify | +5 / 0 | Register the new migration in the migration table. | yes |
| A13 | `internal/storage/om_auth.go` | new | +120 / 0 | Storage layer that satisfies `om.AuthStore`. PostgreSQL-backed; encrypt bearer on write via Miniflux admin secret. | discuss (encryption shape) |
| A14 | `internal/storage/om_offers.go` | new | +80 / 0 | Persist parsed offers from the feed; read-only from the UI. | yes |
| A15 | `internal/reader/fetcher/fetcher.go` | patch | +15 / -2 | Before executing the feed-fetch request, call `storage.GetOMAuth(feed_id, user_id)` and `om.ApplyRequest(req, auth)` if present. No-op when the feed is not in `om_feed_auth`. | yes |
| A16 | `internal/reader/fetcher/fetcher.go` | patch | +30 / 0 | On 401/403 response, invoke `om.EntitlementClient.ExchangeToken` using the stored refresh token; retry the feed fetch once with the new bearer. | yes |
| A17 | `internal/reader/processor/processor.go` | patch | +20 / 0 | After the existing RSS parse, call `om.Parse(bytes.NewReader(body))` and attach `ParseResult.Channel` + `ParseResult.Items` to the feed and entry structs through a new optional field. | yes |
| A18 | `internal/model/feed.go` | modify | +8 / 0 | Add optional `Membership *om.ChannelMembership` field to the feed model (pointer so absence is cheap). | yes |
| A19 | `internal/model/entry.go` | modify | +8 / 0 | Add optional `Membership *om.ItemMembership` field to the entry model. | yes |

**Tranche A sizes (rough):** +1,800 lines added, ~4 lines removed, 13 files
touched in existing Miniflux tree, 11 new files.

## Tranche B — browser-side checkout routes

Must exist for Level 5 to function end-to-end. These are new routes, no
conflict with existing handlers, but Miniflux's routing philosophy is
minimal so they are flagged as **discuss**.

| # | File | Type | Size | Purpose | Upstream |
|---|---|---|---|---|---|
| B1 | `internal/api/om/subscribe.go` | new | +90 / 0 | `POST /om/subscribe`. Resolves `(feed_id, offer_id, psp)` to the publisher's checkout endpoint (via `om.FetchDiscovery`), calls `om.CheckoutClient.Start`, returns `{session_id, redirect_to}` to the browser. | discuss |
| B2 | `internal/api/om/status.go` | new | +110 / 0 | `GET /om/status?feed_id=X&session_id=Y`. Calls `om.EntitlementClient.Status`, then on `Active=true` calls `om.EntitlementClient.ExchangeToken`, persists the bearer via `storage.PutOMAuth`, and returns the user's current subscription status. | discuss |
| B3 | `internal/api/om/token.go` | new | +60 / 0 | Internal-only route used by status.go for the token exchange; kept separate so tests can stub it. | discuss |
| B4 | `internal/http/router.go` | patch | +6 / 0 | Register the new routes under `/om/*`, authenticated with the existing Miniflux session. | discuss |
| B5 | `internal/http/middleware/csrf.go` | modify | +3 / 0 | Exempt `GET /om/status` from CSRF (it's a poll) while keeping `POST /om/subscribe` protected. | discuss |

**Tranche B sizes:** +269 lines, 3 new files, 2 files patched.

## Tranche C — UI templates and assets

Carry as fork patches indefinitely per `README.md` §"Upstream contribution
plan". These are the surfaces Miniflux's UI philosophy is unlikely to
accept without proof of demand.

| # | File | Type | Size | Purpose | Upstream |
|---|---|---|---|---|---|
| C1 | `template/views/entry.html` | patch | +25 / 0 | When `entry.Membership != nil` and the item is not granted, render `om.Render(entry.Membership, entry.Content, ent)` instead of raw `entry.Content`; render the "Read full article" button wired to `/om/subscribe`. | no |
| C2 | `template/views/feed_entries.html` | modify | +12 / 0 | Show a "This feed offers paid subscriptions" banner when `feed.Membership.Provider != ""` and no bearer is yet stored. | no |
| C3 | `template/views/om_upgrade_modal.html` | new | +80 / 0 | Modal dialog listing offers. Handles Stripe-only v0.1 per reader-ARCHITECTURE §"Scope discipline". | no |
| C4 | `template/views/om_subscriptions.html` | new | +120 / 0 | `GET /om/subscriptions` management view. Lists all feeds with active `om_feed_auth` for the current user. Links "Manage on publisher site" out to the portal URL. | no |
| C5 | `template/partials/om_preview_cta.html` | new | +30 / 0 | Shared partial for the "Read full article" call-to-action rendered below preview content. | no |
| C6 | `static/js/om.js` | new | +150 / 0 | Browser-side polling of `/om/status`, window.open of the Stripe checkout URL returned by `/om/subscribe`, and manual-confirmation fallback per plans/PHASE-1-2.md §2.5 D3. | no |
| C7 | `static/css/om.css` | new | +40 / 0 | Minimal styles for `.om-preview`, `.om-locked`, the upgrade modal, and the subscriptions list. | no |
| C8 | `internal/api/om/subscriptions.go` | new | +70 / 0 | Server-side handler for `GET /om/subscriptions`. | no |
| C9 | `internal/locale/translations/*.json` | modify | +12 strings × N locales | i18n strings for the upgrade CTA, banner, subscriptions view. | no |

**Tranche C sizes:** +527 lines + locale strings, 6 new files, 3 modified.

## Tranche D — build and CI

| # | File | Type | Size | Purpose | Upstream |
|---|---|---|---|---|---|
| D1 | `Makefile` | modify | +15 / 0 | Add `make interop` target that runs the four scenarios from INTEGRATION.md against a local `om-ghost` instance. | no |
| D2 | `.github/workflows/test.yml` | modify | +12 / 0 | Run `go test ./internal/om/...` as part of the test matrix. | yes |
| D3 | `.github/workflows/interop.yml` | new | +40 / 0 | Spin up `om-ghost` in a service container, run `make interop`, upload artifacts. | no |

## Tranche E — docs

| # | File | Type | Size | Purpose | Upstream |
|---|---|---|---|---|---|
| E1 | `README.md` (Miniflux root) | modify | +8 / 0 | One-paragraph note that this fork supports Open Membership RSS 0.4 (Indie Reader profile), with a link to `internal/om/README.md`. | no |
| E2 | `internal/om/README.md` | new | — | Copy [`README.md`](README.md) from this directory. | yes |
| E3 | `docs/om.md` or `ChangeLog` entry | modify | +20 / 0 | Operator-facing doc explaining the two new tables, the `OM_BEARER_ENCRYPTION_KEY` env var (from Tranche B discussion), and the `/om/*` routes. | yes |

## Total size

| Tranche | Files new | Files modified / patched | Lines added | Lines removed |
|---|---|---|---|---|
| A | 11 | 6 | ~1,800 | ~4 |
| B | 3 | 2 | ~270 | 0 |
| C | 6 | 3 | ~530 + locales | 0 |
| D | 1 | 2 | ~67 | 0 |
| E | 1 | 2 | ~30 | 0 |
| **Total** | **22** | **15** | **~2,700** | **~4** |

This matches the "~2,000 lines, one new optional database table, and an
optional UI surface" estimate in ../../docs/reader-ARCHITECTURE.md §"Upstream strategy",
within the margin expected once UI, templates, and interop CI are counted.

## Order of application

Safe dependency order. Each step leaves the tree green for `go build` and
`go test`.

1. **A1–A10** in any order. The `om` package is standalone and all unit
   tests pass after this step against `go test ./internal/om/...`.
2. **A11–A12**. Migration is registered but not yet used.
3. **A13–A14**. Storage layer satisfies `om.AuthStore`; still unused.
4. **A18–A19**. Model extensions. No handler change yet.
5. **A17**. Processor populates the model extensions; still no UI change.
6. **A15–A16**. Fetcher hook starts using stored auth.
7. **B1–B5**. Browser-side subscribe/status/token routes go live.
8. **C1–C2, C6–C7**. Entry rendering picks up preview substitution.
9. **C3, C5**. Upgrade modal and CTA partial.
10. **C4, C8, C9**. Subscriptions management view + i18n.
11. **D1–D3, E1–E3**. Build, CI, and docs.

At step 7 the fork has enough to pass INTEGRATION.md Scenarios 1 and 2
through manual testing (the user manually POSTs `/om/subscribe` and GETs
`/om/status`). At step 8 the end-to-end UX works.

## Risks and mitigations

- **A15–A16 (fetcher patch).** If Miniflux's existing HTTP client resists
  per-request auth injection, budget 3 engineer-days for a targeted refactor
  per plans/PHASE-1-2.md Week 4 risk note. The patch is kept minimal —
  inject a single function call after the existing `http.NewRequest` and
  before `client.Do` — to reduce merge conflict risk.
- **A13 (encryption shape).** File an issue against Miniflux upstream before
  settling on a scheme. Options per plans/PHASE-1-2.md D2: AES-GCM with the
  admin secret (stdlib, simple) or libsodium secretbox (stronger, one new
  dep). Default is AES-GCM; revisit if the maintainer prefers otherwise.
- **C1 (entry.html).** Miniflux's entry template is HTML-escaped per
  Miniflux's existing sanitizer. The preview content is emitted through
  `om.Render` which returns trusted markup; route it through the existing
  sanitizer before template substitution to avoid XSS from a malicious
  publisher.
- **B2 (status.go CSRF exemption).** Exempting a polling endpoint from CSRF
  is safe only if the endpoint is GET and idempotent. Confirm in code
  review before landing.
- **Multi-user `(feed_id, user_id)` keying.** Miniflux stores one row in
  `feeds` for a URL even if multiple users subscribe. The fork's storage
  layer keys `om_feed_auth` by `(feed_id, user_id)` so different users get
  different entitlements for the same feed. Confirm no assumption in
  Miniflux's fetcher expects a single auth per feed; the A15 patch must
  resolve the right user id at fetch time.
