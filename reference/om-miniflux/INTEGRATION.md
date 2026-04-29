# Integration runbook, `om-miniflux` against `om-ghost`

This is the end-to-end interop test that closes Phase 1 per
`plans/PHASE-1-2.md` §2.3. It exercises every code path in the `om` package
against the publisher reference implementation running in test mode.

Four scenarios must pass three consecutive runs on a clean database before
Phase 1 is considered closed:

1. **Subscribe**, a fresh user subscribes, pays through Stripe test-mode,
   and sees gated content unlock.
2. **Unlock**, on the next fetch, the previously-gated item renders in full
   without re-authentication.
3. **Cancel**, the user cancels through the publisher's Customer Portal;
   content remains available through `grace_hours`, then reverts to preview.
4. **Revoke**, a Stripe chargeback event triggers the publisher's
   revocation policy; within one hour, content returns to preview on the
   reader side.

## Prerequisites

- A running `om-ghost` instance (Mode B sidecar recommended per
  plans/PHASE-1-2.md decision D4). Configuration per
  `reference/om-ghost/README.md`.
- Stripe test-mode account with at least one product + two prices
  (`paid-monthly` and `paid-yearly`). Seed via the `seed.ts` script
  referenced in plans/PHASE-1-2.md §2.6.1.
- A Miniflux checkout with this fork applied per
  [`README.md`](README.md) §"Installation (as a Miniflux fork)".
- The Stripe CLI (`stripe`) on PATH. Required for Scenario 4.
- `curl` and `jq` for manual verification steps.

## Environment variables

```bash
export OM_GHOST_URL="http://localhost:4000"
export OM_GHOST_FEED_URL="${OM_GHOST_URL}/feed/om/"
export MINIFLUX_URL="http://localhost:8080"
export STRIPE_API_KEY="sk_test_..."       # test-mode only
export STRIPE_CUSTOMER_EMAIL="alice@test.invalid"
```

## One-time setup

### 1. Seed `om-ghost`

```bash
cd reference/om-ghost
npm run seed                              # provisions tiers, prices, customer
```

Verify:

```bash
curl -s "${OM_GHOST_URL}/.well-known/open-membership" | jq .provider
# expected: "http://localhost:4000" or your configured provider URL
```

### 2. Confirm the Stripe webhook is wired

```bash
stripe listen --forward-to "${OM_GHOST_URL}/api/om/webhook"
```

Leave this running in a separate terminal throughout the test.

### 3. Apply Miniflux migrations

```bash
cd ../../  # back to repo root
./miniflux -migrate
```

Verify the two new tables exist:

```bash
psql miniflux -c "\dt om_*"
# expected:
#  public | om_feed_auth | table
#  public | om_offers    | table
```

### 4. Create a Miniflux user

Through the Miniflux web UI or CLI. Use a throwaway email; the test does not
use the Miniflux identity for anything outside the reader side.

## Scenario 1, Subscribe

### Steps

1. Log into Miniflux as the test user.
2. Click "Add feed". Enter `${OM_GHOST_FEED_URL}`.
3. Wait for the first fetch. The feed should appear in the sidebar.
4. Open the feed. Expect:
   - One or more public items rendering in full.
   - At least one gated item rendering the preview text plus a "Read full
     article" button.
5. Click "Read full article" on a gated item.
6. The upgrade modal opens listing the offers. Pick `paid-monthly`.
7. Click "Subscribe via Stripe". A new browser tab opens to
   `https://checkout.stripe.com/...`.
8. In the Stripe tab, pay with test card `4242 4242 4242 4242`, any future
   expiry, any CVC, any ZIP.
9. Stripe redirects back to the publisher's success URL. Close or leave that
   tab; return to the Miniflux tab.
10. The Miniflux tab polls `/om/status` every 3s. Within 15s the modal
    updates to "Subscription active".

### Pass criteria

- `om_feed_auth` has a row for `(feed_id, user_id)` with `auth_method =
  'bearer'` and a non-empty `bearer_token`.
- The bearer token in the database is encrypted at rest (does not appear
  verbatim in a `SELECT bearer_token FROM om_feed_auth`).
- Publisher-side webhook log contains a `checkout.session.completed` event
  for the session ID Miniflux polled.
- No stack traces in Miniflux fetcher logs.

### Troubleshooting

- **Polling hangs.** The publisher webhook may not be arriving. Check the
  Stripe CLI output for the `checkout.session.completed` line. If it's not
  there, the browser tab never completed Stripe.
- **401 on next fetch.** The bearer was stored but not applied. Check
  `internal/reader/fetcher/fetcher.go` patch per PATCH-PLAN.md; confirm
  `om.ApplyRequest` is invoked before `client.Do`.

## Scenario 2, Unlock

### Steps

1. With Scenario 1 complete, trigger a Miniflux refresh of the feed
   (sidebar refresh button or wait for the polling interval).
2. Open the previously-gated item.

### Pass criteria

- The item renders the full content (the text is longer than the preview
  was).
- No `om-preview` or `om-locked` HTML class appears in the rendered body.
- Miniflux's fetcher log shows a 200 response from the feed URL with
  `Authorization: Bearer ...` on the request.

## Scenario 3, Cancel

Scenario tests the `<om:revocation policy="prospective-only" grace_hours="N">`
path: cancellation leaves already-listed content readable until the grace
window expires.

### Steps

1. In the Miniflux UI, go to `/om/subscriptions`. Confirm the feed is
   listed with its tier and renewal date.
2. Click "Manage on publisher site". A browser tab opens to Stripe's
   Customer Portal (via `/api/om/portal?feed_token=...`).
3. In the portal, cancel the subscription at period end.
4. Trigger the `customer.subscription.deleted` event immediately rather than
   waiting for the period end:

   ```bash
   stripe trigger customer.subscription.deleted
   ```

5. Wait for the publisher's webhook handler to process the event (typically
   <1s from the `stripe listen` terminal).
6. Within the `grace_hours` window, return to Miniflux and refresh the feed.
   Open the previously-gated item.

### Pass criteria during grace window

- The item still renders in full.
- `om.EntitlementClient.Status` returns `Active=true` (the grace window is
  enforced publisher-side in the feed response, not reader-side).

### Pass criteria after grace window

Configure `grace_hours=0` on the test tier to avoid waiting:

1. Re-run the scenario with `grace_hours=0` or set the system clock forward
   in the publisher sandbox.
2. Trigger another feed fetch.

- The item reverts to preview rendering.
- `om.EntitlementClient.Status` returns `Active=false`.
- Miniflux's `om_feed_auth` row is retained (the token is still valid for
  fetching the feed; the publisher just no longer returns the gated content
  through it).
- No stack traces in fetcher logs.

## Scenario 4, Revoke

### Steps

1. With Scenario 1 complete, ensure the publisher is configured with
   `<om:revocation policy="chargeback-revocation" grace_hours="0">` on the
   tier (`bearer-paid.xml` fixture is pre-configured this way).
2. Trigger a Stripe chargeback:

   ```bash
   stripe trigger charge.dispute.created
   ```

3. Within ~60s, the publisher flips the bit on the entitlement. The SPEC
   requires this within 1 hour.
4. Wait 60s, then refresh the Miniflux feed.

### Pass criteria

- Previously-gated items revert to preview rendering within 1 hour
  (typically within 60s in test mode).
- `om_feed_auth` bearer token is marked expired and the refresh path
  discards it cleanly.
- Publisher webhook log contains the `charge.dispute.created` event and a
  corresponding state transition.

## Clean-up between runs

Each scenario run should start from a clean state. For CI reproducibility:

```bash
# drop Miniflux om state
psql miniflux -c "TRUNCATE om_feed_auth, om_offers;"

# reset om-ghost Stripe state
cd reference/om-ghost
npm run seed -- --reset
```

The `seed` script is idempotent, matching plans/PHASE-1-2.md §2.6.1.

## CI integration (target for Week 11)

```bash
make interop
```

The `interop` target (added to Miniflux's Makefile as part of this fork)
runs Scenarios 1-4 in sequence and exits non-zero on the first failure. It
is the single source of truth for Phase 1 exit criterion "All four interop
scenarios pass in CI three consecutive runs".

## What this runbook does NOT cover

The following are out of scope for Phase 1 and appear in later phases:

- Mollie PSP interop (Phase 2 M4 Track C).
- `<om:sharing-policy>` / DPoP enforcement (Phase 2 M4 Track F).
- `tax_inclusive` + `tax_jurisdiction` display on the checkout screen
  (Phase 2 M4 Track E.1).
- VC-presentation auth (Level 4, Phase 3).
- Bundle-credential presentation (Level 8, Phase 5).
- Live-mode Stripe (Phase 2 M4 Track A).
- First outside-publisher run-through (Phase 2 M5).

Each of these has its own runbook added in the phase that lands it.
