# Phases 1 and 2 Execution Plan — Open Membership RSS

Detailed six-month plan for months 1–6 of the ROADMAP.md schedule. Phase 1 closes the end-to-end Ghost + Miniflux + Stripe demo. Phase 2 onboards the first outside publisher and ships 0.4.1 errata.

Because `reference/om-ghost` and `reference/om-wordpress` are already feature-complete, this plan reassigns Phase 1 effort from publisher-plugin work to the Miniflux fork and the interop harness. No spec features are added; 0.4 is feature-frozen per SPEC.md §E.

## Shipped this session (agent-produced artifacts)

- [x] **Miniflux fork scaffolding** → `reference/om-miniflux/` — fork-prep package: Go `om/` module (namespace, parser, auth, checkout, entitlements, preview, discovery + tests), fixture feeds, README (369 lines), PATCH-PLAN (168 lines), INTEGRATION runbook (256 lines). Status: scaffolded; a human engineer still needs to apply as a Miniflux downstream patch and run the live interop test.
- [x] **Anti-sharing primitive v0** → `../spec/SPEC-SHARING-POLICY.md` (0.1, marked Provisional per ROADMAP risk register)
- [x] **i18n: `tax_inclusive` + `tax_jurisdiction`** → `../spec/SPEC-ERRATA-0.4.1.md` Erratum 1
- [x] **Enclosure auth passthrough** → `../spec/SPEC-ERRATA-0.4.1.md` Erratum 2 (shipped unconditionally rather than conditional-on-podcaster; codifies existing behavior)

Remaining Phase 1–2 work is external/operational and cannot be agent-shipped: Stripe live-mode cutover, webhook idempotency verification, Mollie PSP profile, external security review, publisher outreach, first paying subscriber, errata publication on the canonical URL.

---

## 1. Status snapshot (as of 2026-04-24)

### Already landed (retroactive)

| Deliverable | Source | State |
|---|---|---|
| Ghost plugin v0.1 scaffolding (ROADMAP M1) | `reference/om-ghost/` | Ships Mode A (Worker) + Mode B (Node sidecar), feature-complete per its README |
| Stripe integration + entitlements (ROADMAP M2) | `reference/om-ghost/` | Checkout, webhook (`checkout.session.completed`, `customer.subscription.{created,updated,deleted}`), JWT issuance, Customer Portal bridge, idempotency store, rate limiter |
| WordPress reference (originally Phase 4 M10) | `reference/om-wordpress/` | REST controllers, FeedRenderer, FeedToken, Jwt, SubscriberRepository, uninstall handler, PHPUnit suite |
| Discovery document (`.well-known/open-membership`) | Both refs | Live in both plugins |
| Conformance target | Both refs | Level 5 publisher-side |

### Not yet done

| Deliverable | Status |
|---|---|
| Miniflux fork (`miniflux-om`) | Not started. No reader fork exists under `reference/` (confirmed by `ls`) |
| End-to-end interop demo (Ghost + Miniflux + Stripe test-mode) | Blocked on the fork |
| Reader conformance harness / test fixtures | Not started |
| `charge.dispute.created` webhook wiring | Not explicit in `om-ghost` README; verify in Week 1 |
| Mollie PSP profile | Not started (Phase 2) |
| Live-mode Stripe cutover | Not started (Phase 2) |
| `tax_inclusive` patch across both plugins | Not started (Phase 2) |
| `<om:sharing-policy>` v0 draft | Not started (Phase 2) |
| External security review | Not started (Phase 2) |
| First outside publisher onboarded | Not started (Phase 2) |

### What "closing Phase 1" now means

Phase 1 is closed when all three are true:

1. `miniflux-om` fork exists on a public Git host and is running against an `om-ghost` test instance.
2. The four end-to-end scenarios in §2.3 below pass against test-mode Stripe.
3. A public demo URL, a public test feed, and a short screencast are published.

The Ghost and WordPress plugin work from the original ROADMAP M1 and M2 does not need to be re-executed; it needs to be re-verified against the interop test in §2.3.

---

## 2. Phase 1 execution plan (weeks 1–12)

### 2.1 Week-by-week breakdown

Engineer count assumed below: one Miniflux engineer (the "reader eng"), plus up to 0.5 engineer-weeks per week of `om-ghost` maintainer time for interop fixes. No new plugin feature work.

| Wk | Reader eng focus | Ghost/WP maintainer focus | Artifacts due end of week |
|----|-----------------|--------------------------|---------------------------|
| 1  | Fork Miniflux at a pinned commit, rename module path, CI green on fork | Verify `charge.dispute.created` wiring in `om-ghost`; patch if missing | Branch `miniflux-om/wip/bootstrap`; pinned upstream SHA documented; issue filed if dispute webhook missing |
| 2  | Add `internal/om/` package skeleton (`parser.go`, `discovery.go`, `types.go`); parser stubs with tests on hand-written fixture feeds | Export a set of canonical Level 1/2/5 fixture feeds from `om-ghost` test harness for reader-side consumption | Fixture pack `fixtures/phase1/` in the spec repo; parser stub PR on fork |
| 3  | Level 1 parsing: `<om:provider>`, `<om:authMethod>`, `<om:tier>`, `<om:access>`, `<om:preview>`. Feed discovery doc fetch | — | Parser passes Level 1 fixtures; unit tests green |
| 4  | DB migration: `om_feed_auth` + `om_offers` with `(feed_id, user_id)` keying per ../docs/reader-ARCHITECTURE.md §"Per-user vs per-instance"; auth-aware fetcher | — | Migration `002_add_om_tables.sql`; fetcher honors bearer + url-token |
| 5  | Level 2: accept a pre-tokenized feed URL via the existing "add feed" flow; persist token; retry-on-401 path | Stand up a public `demo.om-ghost.example` test site with test-mode Stripe | Level 2 end-to-end: tokenized Ghost feed renders in Miniflux |
| 6  | UI: "This feed offers paid subscriptions" banner; offers list; preview-then-button item rendering | Test Stripe Checkout Session returns proper `success_url` / `cancel_url` for cross-tab flow | Offers visible in Miniflux; preview-only render matches fixture expectations |
| 7  | Level 5 part 1: `POST /om/subscribe` → proxy to publisher `/api/om/checkout`, open browser tab | — | Subscribe button triggers real Stripe Checkout in browser |
| 8  | Level 5 part 2: `GET /om/status` polling; on success call `/api/om/token`; store bearer in `om_feed_auth`; trigger feed re-fetch | Confirm `/api/om/token` handles both Ghost Members session cookie and pure bearer exchange | First complete test-mode purchase unlocks content in Miniflux |
| 9  | Token refresh path (401 → `/api/om/token` → retry); encrypted-at-rest bearer storage using Miniflux admin secret | Cancellation behavior: verify `customer.subscription.deleted` flips the cache within `grace_hours` | Encrypted tokens in DB; cancellation scenario passes |
| 10 | `/om/subscriptions` management view; manual-poll fallback button; error UI for revoked/expired tokens | Dry-run `charge.dispute.created` with Stripe CLI trigger | Subscription management view live; revocation scenario passes |
| 11 | Interop-test harness scripted: all four scenarios in §2.3 run from a single `make interop` target. Screencast recording | Publish test-feed URL + credentials for working-group review | Green `make interop` run; screencast v1; public test-feed URL |
| 12 | Bug fix, documentation, reader-side README, upstream-PR readiness check per ../docs/reader-ARCHITECTURE.md §"Upstream strategy". Tag `miniflux-om v0.1.0` | Tag `om-ghost v0.1.0-interop` matching the pinned interop commit | `miniflux-om v0.1.0` release; Phase 1 closeout report |

Risk one-liners embedded where they matter:

- Week 4: if Miniflux's existing HTTP client abstraction resists per-request auth-header injection, budget 3 extra days for a targeted refactor before committing to the encrypted bearer store. The reader-ARCHITECTURE §"Token refresh" assumes this is clean; verify in a spike.
- Week 7–8: the cross-tab checkout flow is the highest-risk UX path. If polling is unreliable, fall back to the manual-confirmation button immediately and defer nicer UX to Phase 2.
- Week 12: do not open the upstream PR yet; reader-ARCHITECTURE pushes that to month 9. Phase 1 ships the fork, not the merge.

### 2.1.1 Parsing levels — what "Levels 1, 2, 5" means in code

Mapped from SPEC.md featureset and ../docs/reader-ARCHITECTURE.md §"Scope" into concrete Miniflux deliverables.

| Level | Reader requirement | `miniflux-om` deliverable | Weeks |
|---|---|---|---|
| 1. Parsing | Read `om` namespace; expose `<om:tier>` + `<om:preview>`; honor `<om:access>` | `internal/om/parser.go` with `Parse(io.Reader) (*Feed, error)`; integration with Miniflux's existing RSS reader as extension callback; no UI change required for compliance | Wk 2–3 |
| 2. URL token | Accept a publisher-issued tokenized feed URL; fetch with it; persist per `(feed_id, user_id)` | `internal/storage/om_auth.go` + fetcher hook; token lives in DB, not in feed URL-typing UI | Wk 4–5 |
| 5. Checkout | Drive publisher `/api/om/checkout`; poll `/api/om/entitlements`; exchange for bearer via `/api/om/token`; refresh feed | `internal/api/om/{subscribe,status,token}.go` + UI templates | Wk 6–8 |

Levels 3 (HTTP Basic), 4 (bearer with VC), 6 (OM-VC), 7 (OM-VC-SD), 8 (bundle verification) are explicitly out of scope for Phase 1 per reader-ARCHITECTURE §"Scope discipline".

### 2.2 Miniflux fork: PR strategy

Everything lands as a series of small PRs on the fork first. The upstream-PR decision is deferred to month 9 per ../docs/reader-ARCHITECTURE.md.

| Change | Fork-only vs upstream-eventual | Reason |
|---|---|---|
| New `internal/om/` package | Upstream-eventual | Self-contained; no impact on non-`om` feeds |
| `om_feed_auth` + `om_offers` migrations | Upstream-eventual | Optional tables, opt-in per feed |
| Auth-aware fetcher hook | Upstream-eventual | Extension point in existing fetcher |
| Encrypted-at-rest token storage | Upstream-eventual, but discuss | Touches Miniflux's secret-handling; Frédéric may prefer a different shape |
| `/om/subscribe` + `/om/status` internal API | Upstream-eventual | Browser-only routes, no external surface |
| UI templates (`om_subscriptions`, `om_upgrade_modal`) | Carry as fork patches | Miniflux's UI philosophy is minimal; easier to justify after proof of demand |
| Dependency additions (if any, e.g. encryption lib) | Carry as fork | Minimize upstream footprint |

### 2.3 End-to-end interop test plan

Four scenarios, all against test-mode Stripe. Each must pass deterministically before Phase 1 closes.

| # | Scenario | Preconditions | Steps | Pass criteria |
|---|----------|---------------|-------|---------------|
| 1 | **Subscribe** | Fresh Miniflux user; fresh Ghost member slot; `om-ghost` running with test tier `paid-monthly` | 1. Add feed URL to Miniflux; see free items + preview on gated item. 2. Click Subscribe; pick offer. 3. Complete Stripe test-mode checkout (card `4242…`). 4. Return to Miniflux tab; poll completes. | Bearer stored in `om_feed_auth`; next poll returns full content on the gated item |
| 2 | **Unlock** | Scenario 1 complete | 1. Open the previously-gated item in reader. | Item renders full content, no preview truncation, no 401 |
| 3 | **Cancel** | Scenario 1 complete | 1. User hits `/om/subscriptions` → "Manage on publisher site" → Stripe Customer Portal → cancel at period end (accelerate via `stripe trigger customer.subscription.deleted`). | Within `grace_hours`, item still readable; after grace window, item returns to preview state; no stack traces in fetcher logs |
| 4 | **Revoke** | Scenario 1 complete; separate test member | 1. `stripe trigger charge.dispute.created` for the member's last invoice. 2. Wait 60s. | Feed request returns preview-only within 1 hour, matching SPEC §2.3 Stripe revocation wording |

**Test data:** checked into `reference/om-ghost/test/interop/fixtures/` as YAML, regenerable from a single seed script against a fresh test-mode Stripe account.

**Pass criteria (overall):** all four scenarios pass in CI three times in a row on a clean DB; one successful manual run-through recorded as a screencast.

### 2.4 Artifacts produced each week

Every week ends with at least one of:

- A named branch on `miniflux-om` with a CI-green commit.
- An updated fixture pack in the spec repo.
- A dated entry in `plans/PHASE-1-2-LOG.md` (create this file as the first Week-1 action) recording decisions, test-feed URLs, and links.
- At Week 11 and 12: public artifacts (test feed URL, screencast, release tags).

### 2.5 Decision log (Phase 1)

Decisions the working group must resolve, with a named owner and deadline.

| # | Decision | Owner | Deadline | Default if unresolved |
|---|----------|-------|----------|-----------------------|
| D1 | Miniflux fork public name: `miniflux-om` vs `miniflux-openmembership` | Spec editor + reader eng | End Wk 1 | `miniflux-om` (matches reader-ARCHITECTURE §"Upstream strategy") |
| D2 | Encryption scheme for bearer-at-rest (AES-GCM with admin secret vs libsodium secretbox) | Reader eng | End Wk 3 | AES-GCM; aligns with Go stdlib |
| D3 | Polling interval for `/om/status` (3s vs 5s) | Reader eng | End Wk 6 | 3s for first 60s, back off to 10s thereafter |
| D4 | Whether to ship Mode A or Mode B of `om-ghost` as the canonical demo target | Ghost maintainer | End Wk 4 | Mode B (sidecar) — fewer external dependencies, easier to reproduce |
| D5 | Public test-feed hosting location | Spec editor | End Wk 5 | Subdomain on a working-group-controlled apex; covered in D10 (Phase 2) |
| D6 | Screencast tooling + hosting (asciinema vs mp4 on PeerTube) | Reader eng | End Wk 10 | Both: asciinema for CLI, mp4 for UI |
| D7 | Whether the `miniflux-om` tag schedule tracks upstream Miniflux or is independent | Reader eng | End Wk 12 | Independent; rebase quarterly per reader-ARCHITECTURE |

### 2.6 External dependencies

| Party | What we need | Lead time | Fallback |
|---|---|---|---|
| Ghost maintainers | No action required in Phase 1. Status-quo Ghost works with `om-ghost`. Only engage for Phase 2 outreach. | — | — |
| Frédéric Guillot (Miniflux) | No engagement in Phase 1. Upstream PR deferred to month 9. | — | — |
| Stripe | Test-mode account with Connect or Direct. No support interaction needed. | Same day | — |
| Hosting for test feed | Any cheap VPS or Cloudflare Worker. No dependency beyond the working group. | 1 day | Use a Fly.io or Hetzner box |

### 2.6.1 Test-data seeding

A single-file seed script, `reference/om-ghost/test/interop/seed.ts`, provisions everything needed:

- Test-mode Stripe: two products (`paid-monthly`, `paid-yearly`), one feature (`full-text`), one customer portal configuration, one webhook endpoint pointed at the local sidecar.
- Ghost: two members (`alice@test.invalid`, `bob@test.invalid`), both with UUIDs; one with an active subscription, one free.
- `om-config.yaml`: tier map referencing the above price IDs.
- Mirror copy for WordPress via a parallel `seed.php` in `reference/om-wordpress/tests/interop/`.

Seed runs are idempotent: running twice yields the same state as running once. This is required for CI reproducibility.

### 2.7 Phase 1 exit criteria (binary pass/fail)

- [ ] `miniflux-om` repository public on a working-group-owned Git host.
- [ ] `miniflux-om v0.1.0` tag parses Level 1 fixtures, reads Level 2 feeds, and drives Level 5 checkout.
- [ ] All four interop scenarios (§2.3) pass in CI three consecutive runs.
- [ ] Screencast of a full subscribe → unlock → cancel flow published.
- [ ] Public test feed URL available, rate-limited but open-to-world.
- [ ] `charge.dispute.created` verified end-to-end against a Stripe CLI trigger.
- [ ] `plans/PHASE-1-2-LOG.md` exists with weekly entries.
- [ ] No spec changes landed during Phase 1 (0.4 is frozen).

If any item is unchecked at end of Week 12, stop all Phase 2 outreach and diagnose. Per ROADMAP §"Risk register", the worst outcome is promising a publisher something that does not work.

---

## 3. Phase 2 execution plan (months 4–6)

### 3.1 Month 4 — Production hardening

Six parallel tracks, roughly evenly weighted. None blocks another.

#### Track A: Stripe live-mode cutover

- [ ] Separate live-mode credentials from test-mode; never share a `.env`.
- [ ] Enable Stripe Radar with default rule set; review the first 10 live transactions for false positives.
- [ ] Set up Stripe live-mode webhook endpoints on the demo publisher. Events: `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `charge.dispute.created`, `invoice.payment_failed`.
- [ ] Add a live-mode burn-in test: one small real subscription (on a working-group member's card) that runs through subscribe, renew, cancel, refund. Document every step.
- [ ] Verify `om-ghost` operator docs explain live-mode secrets and webhook-secret rotation.

#### Track B: Webhook idempotency + retry (verification)

The `om-ghost` README already claims idempotency over `event.id` and 7-day SQLite retention. WordPress uses `INSERT IGNORE` on `wp_om_webhook_events`. Month 4 verifies this under realistic loss/retry conditions.

- [ ] Stripe CLI replay: send the same event 5 times in 30s. Expect exactly one state change.
- [ ] Simulate a webhook endpoint 500 during processing. Expect Stripe retries up to 3 days; the idempotency store prevents double-processing.
- [ ] Timeout audit: confirm the sidecar returns 200 only after the state change is durable.
- [ ] Document the retention window and pruning schedule in both plugin READMEs (already present — verify accuracy).

#### Track C: Mollie PSP profile

- [ ] Add Mollie SDK dependency to `om-ghost` (Node) and `om-wordpress` (PHP).
- [ ] Implement Mollie checkout session creation behind the existing `/api/om/checkout` surface, dispatched on `psp=mollie`.
- [ ] Implement Mollie webhook verification; map `subscription.*` and `chargeback` events to the same internal state transitions as Stripe.
- [ ] Add Mollie to `om-config.yaml` schema (already an allowed `<om:psp>` value per SPEC).
- [ ] Interop scenario 1–4 re-run against Mollie in test-mode. Pass/fail matches Stripe.
- [ ] Reader-side: no change required for Level 5 — Mollie returns a checkout URL like Stripe does.

#### Track D: External security review

- [ ] Scope: the Ghost sidecar, the Worker variant, and the WordPress plugin. Out of scope: Ghost core, WordPress core, Stripe SDK internals, Miniflux.
- [ ] Deliverables from reviewer: a written report covering (i) token handling + HMAC verification, (ii) JWT issuance + key management, (iii) webhook signature verification + replay protection, (iv) SQL and XSS vectors in WP admin surfaces, (v) rate-limit bypass paths, (vi) secret-redaction correctness in logs.
- [ ] Fix-turnaround target: each Critical or High finding fixed and re-verified before month 5 publisher outreach begins.
- [ ] Publish the report, redacted where needed, per the "Publish negative results" guiding principle in ROADMAP §"Guiding principles".

#### Track E: i18n — `tax_inclusive` on `<om:price>`

ROADMAP §"Interop & platform-surface track" locates this in Phase 2 M4, triggered by Mollie EU VAT reporting. Spec work + patch in both plugins.

- [ ] Spec: add `tax_inclusive` (boolean) and `tax_jurisdiction` (ISO 3166-1 alpha-2 country code or region URI) attributes on `<om:price>` as a 0.4.1 errata item. No new element.
- [ ] `om-ghost`: emit both attributes when `om-config.yaml` declares them; default `tax_inclusive=false`, `tax_jurisdiction` omitted.
- [ ] `om-wordpress`: same. Surface in Settings → Open Membership as two new fields per tier.
- [ ] Reader (Miniflux): parse both attributes, display on checkout screen ("Price includes VAT" / "Price excludes VAT, jurisdiction: NL").
- [ ] Test fixture coverage: add an inclusive-NL fixture and an exclusive-US fixture; both must round-trip.

#### Track E.1: Reader checkout-screen surfacing

The `tax_inclusive` patch is wasted without reader-side surfacing. Checklist for `miniflux-om`:

- [ ] When rendering an offer, read `tax_inclusive` off `<om:price>`; render "Price includes VAT" or "Price excludes VAT (X%)" based on presence.
- [ ] When `tax_jurisdiction` is present and differs from the subscriber's declared jurisdiction (future — Phase 3), flag a non-blocking warning. Phase 2 ships without jurisdiction matching; just displays the pointer.
- [ ] Fixture pack gains two new fixtures: `eu-vat-inclusive.xml`, `us-no-tax.xml`.
- [ ] Interop Scenario 1 (Subscribe) repeats against both fixtures; pass criterion: correct label rendered before the subscribe click.

#### Track F: Anti-sharing primitive v0 (`<om:sharing-policy>` + DPoP)

ROADMAP flags this as explicitly provisional per its Risk register entry. Ship a draft, clearly marked.

- [ ] Spec: draft `<om:sharing-policy>` at channel level with attributes `max_devices` (int, optional), `telemetry` (enum: `none`|`count-only`|`count-and-ip`), and `binding` (enum: `none`|`dpop`). Mark as Provisional in 0.4.1.
- [ ] Resolves SPEC §H.2 Open Question. Do not promote to stable until after one production podcaster deployment.
- [ ] Reader-side convention: when `binding=dpop`, the reader generates a per-device keypair, uses it in the DPoP header on `/api/om/token` exchange, and the publisher binds the resulting bearer token to the DPoP JKT claim.
- [ ] `om-ghost` / `om-wordpress`: no enforcement change; emit the element, log device counts per token (already in scope for `om-ghost` v0 per om-ghost-ARCHITECTURE §"Anti-sharing").
- [ ] Miniflux: implement DPoP key generation, store JKT alongside the bearer. Opt-in per feed.

Every track F deliverable carries a visible "Provisional — subject to 0.4.x errata" notice.

### 3.2 Month 5 — Publisher outreach and onboarding

Target: 10 candidates contacted, 1 onboarded by end of month.

#### Sourcing the 10 candidates

Four cohorts from ROADMAP Phase 2 M5 and COMPETITIVE-LANDSCAPE §"Two axes of openness".

| Cohort | Why they fit | Source channels | Target count |
|---|---|---|---|
| A. Ghost + FeedPress/Outpost users | Already pay for private paid RSS; switch cost minimal | Ghost forum threads on FeedPress; 404 Media, Aftermath, similar Ghost-on-FeedPress sites listed publicly | 3 |
| B. Substack refugees now on Ghost | Active pain, proven willingness to migrate | Ghost's own "Moved from Substack" case studies; tools like `onghost.com` directory | 3 |
| C. Small investigative journalism publications | Privacy primitive is a unique selling point | Ghost-hosted investigative sites; Sovereign Tech Fund and Knight Foundation grantee lists | 2 |
| D. "Open" column of opensubscriptionplatforms.com | Already self-selected for openness on publisher axis | WooCommerce-powered membership sites, Memberful sites, Memberstack demos | 2 |

#### Pitch-template outline (structure only — do not prewrite prose)

1. **One-sentence hook** tailored to the cohort (cost saved / cookie problem solved / privacy feature / open-values alignment).
2. **Proof points** — the existing `om-ghost` + `om-wordpress` plugins; the Miniflux demo; the public test feed and screencast.
3. **What the publisher does** — install the plugin, point Stripe at the webhook endpoint, map their tiers. Concrete hours estimate.
4. **What the working group does** — install hand-holding, bugfix pipeline priority for month 5, one live call.
5. **What "in production" means** — one live paying subscriber by end of month 6.
6. **What happens if they leave** — their Stripe data stays with them, their content stays in Ghost/WP, they lose nothing.
7. **Low-pressure close** — a 20-minute call offer, linked calendar.

Same template, one email per cohort, customized at paragraph 1 and paragraph 2.

#### Onboarding runbook

For the candidate who says yes. Seven steps, each with an exit gate before proceeding.

| Step | Action | Owner | Exit gate |
|---|---|---|---|
| 1 | Kickoff call — confirm Ghost vs WP; Stripe account state (test or live, existing or new); tier count; podcast-or-not (affects enclosure-auth errata trigger) | Working-group engineer + publisher | Written one-pager summarizing configuration decisions |
| 2 | Staging install — deploy plugin on a staging copy; mirror current content; stub Stripe test-mode keys | Publisher's engineer (if any) or working-group engineer | Staging site responds on `/.well-known/open-membership` and `/feed/om/:token/` |
| 3 | Tier mapping review — translate existing paid tiers into `om-config.yaml` (Ghost) or Settings → Open Membership (WP); verify `stripe_price_ids` match the live-account prices | Working-group engineer | Publisher signs off on the tier map in writing |
| 4 | Test-mode interop run — all four §2.3 scenarios against their own staging instance | Working-group engineer | 3 consecutive clean runs |
| 5 | Live cutover plan — one-page checklist: DNS for `.well-known/open-membership`, live-mode Stripe webhook, feed URL handoff to existing subscribers (email or in-app notice), rollback procedure | Working-group engineer + publisher | Publisher-approved checklist |
| 6 | Live cutover — scheduled in a low-traffic window; working-group engineer on call for 24 hours; webhook log tailed in real time | Working-group engineer (on call) | Zero Critical errors in the first 24-hour window |
| 7 | First paying subscriber target — within 7 days of cutover | Publisher's marketing | One confirmed payment, non-test, non-working-group card |

Publisher exit from the runbook at any step before step 6 is fine and should be reported publicly per the "Publish negative results" principle.

### 3.3 Month 6 — First paying subscriber + 0.4.1 errata

#### First-paying-subscriber flow — who does what

| Actor | Responsibility |
|---|---|
| Publisher | Runs the plugin in live-mode. Points their subscriber base at the new feed URL. Handles their own customer support. |
| Working-group engineer (on call) | Watches webhook logs in real time for the first 72 hours. Fixes any Critical bug within 24 hours. |
| Spec editor | Maintains the errata candidate list. Publishes a weekly "what we learned" note. |
| Miniflux engineer | Ensures `miniflux-om` handles the publisher's feed cleanly; fixes any reader-side bugs exposed by real content. |
| Reader eng + spec editor jointly | Own the `plans/PHASE-1-2-LOG.md` entry for every bug. |

#### Instrumentation for catching bugs

- Structured webhook-event log with request id, event type, processing duration, and state-transition outcome.
- Redacted feed-access log per token per 24 hours (already in `om-ghost` v0 per om-ghost-ARCHITECTURE §"Anti-sharing (v0: log-only)").
- A "stuck sessions" daily report: any Stripe `checkout.session` older than 60 minutes still in `pending` state on the publisher side.
- A Miniflux-side fetcher error log, public-grep-able, redacted.
- A public status page at the demo URL showing live test-feed health.

#### 0.4.1 errata scope

Shippable errata items, in order of confidence:

| Item | Source | Confidence at start of month 6 |
|---|---|---|
| `tax_inclusive` + `tax_jurisdiction` on `<om:price>` | ROADMAP Phase 2 M4, Track E | High — built in month 4 |
| `<om:sharing-policy>` provisional element | ROADMAP Phase 2 M4, Track F | High but marked Provisional |
| Any clarifications surfaced by the external security review | Month 4 Track D | Medium — known after month 4 |
| Any clarifications surfaced by the first live deployment | Month 6 operations | Variable |
| Enclosure auth paragraph (conditional; see below) | ROADMAP Phase 2 M6 | Conditional on persona |

Cutoff: 0.4.1 publishes end of month 6. Anything not surfaced by then becomes a 0.4.2 candidate.

#### Conditional: enclosure-auth errata

Per ROADMAP Phase 2 M6 and §"Interop & platform-surface track".

- **Trigger:** the first onboarded publisher is a podcaster (persona 2 from SPEC §H.5).
- **Scope if triggered:** a single paragraph in 0.4.1 describing how URL tokens and bearer tokens pass through to chunked media URLs (audio/video enclosures). No new element. Parallel in shape to SPEC §8's Podcasting 2.0 co-existence language.
- **If not triggered:** defer to Phase 4 M12 per the interop-track table.
- **Owner:** spec editor, in consultation with the onboarded publisher's engineer.

### 3.4 Phase 2 decision log

| # | Decision | Owner | Deadline | Default if unresolved |
|---|----------|-------|----------|-----------------------|
| D8 | External security reviewer (individual vs small firm) | Spec editor | Start of month 4 | Individual with public track record on webhook/JWT reviews |
| D9 | Mollie profile: subscription-derived entitlements vs per-payment | Ghost maintainer | Mid-month 4 | Subscription-derived, mirroring Stripe's path |
| D10 | Permanent home for the public demo feed (`demo.open-membership.org` or equivalent) | Spec editor | End of month 4 | Subdomain on a working-group-owned apex registered in month 4 |
| D11 | First-candidate sourcing: prioritize cohort A (FeedPress users) or cohort B (Substack refugees) | Spec editor | End of week 1 of month 5 | Cohort A — lowest switch friction per COMPETITIVE-LANDSCAPE §5 |
| D12 | Whether to ship `<om:sharing-policy>` in 0.4.1 at all if no deployment has exercised it | Spec editor + reader eng | Mid-month 6 | Ship as Provisional; ROADMAP risk register explicitly allows this |
| D13 | Whether to backport the 0.4.1 errata to spec file or land in a new `SPEC-0.4.1.md` addendum | Spec editor | End of month 6 | Addendum file; keep SPEC.md at 0.4 until 0.5 |
| D14 | Public case study on the first publisher: written now or at Phase 3 M7 | Spec editor + publisher | End of month 6 | Short version now, long version at Phase 3 |

### 3.5 Phase 2 exit criteria (binary pass/fail)

- [ ] Stripe live-mode in production on the demo publisher and the first outside publisher.
- [ ] Mollie PSP profile shipped in both `om-ghost` and `om-wordpress`, interop-tested.
- [ ] External security review report published; all Critical + High findings fixed.
- [ ] `tax_inclusive` + `tax_jurisdiction` attributes live on both plugins and parsed by `miniflux-om`.
- [ ] `<om:sharing-policy>` v0 drafted and marked Provisional in 0.4.1 errata.
- [ ] At least one outside publisher in production with at least one real paying subscriber.
- [ ] 0.4.1 errata document published at the canonical URL.
- [ ] If the first publisher is a podcaster: enclosure-auth paragraph shipped in 0.4.1. Otherwise: explicit deferral-to-M12 note in the errata.
- [ ] Weekly "what we learned" notes published for the full month of live operation.
- [ ] No new 0.4 features added (feature freeze held).

---

## 4. Handoff to Phase 3

Phase 3 (ROADMAP months 7–9) inherits the following from Phases 1–2. Each inheritance is a specific artifact, not a promise.

### Technical inheritances

| From | Artifact | Consumed by |
|---|---|---|
| Phase 1 Wk 2 | Canonical fixture pack `fixtures/phase1/` for Levels 1/2/5 | Phase 3 M9 publisher test suite v1 |
| Phase 1 Wk 11 | `make interop` target in `om-ghost` | Phase 3 M9 reader conformance harness |
| Phase 1 Wk 12 | `miniflux-om v0.1.0` | Phase 3 M9 — first CI consumer of the harness |
| Phase 2 M4 | Mollie PSP profile | Phase 4 M10 Platform Adapter Profile validation (two PSPs ensures the profile is PSP-shape, not Stripe-shape) |
| Phase 2 M4 | Security review methodology + report format | Phase 4 M10 WordPress security review |
| Phase 2 M4 | `tax_inclusive` + `<om:sharing-policy>` in 0.4.1 | Phase 5 M13 RFC draft — both must reach stable shape before submission |
| Phase 2 M6 | 0.4.1 errata document | Phase 5 M13 format-conversion input |
| Phase 2 M6 | First publisher's deployment experience notes | Phase 4 M10 Platform Adapter Profile — real-world validation data |

### Governance inheritances

Phase 3 M7 custodian conversations become credible only if Phase 2 closed with one production publisher. Talking points the custodian conversation inherits:

- "One reference reader, two reference publishers, at least one outside publisher in production, at least one real paying subscriber, 0.4.1 errata shipped." This is what distinguishes an `om` custodian pitch from a vaporware custodian pitch.
- The published security review is evidence of operational seriousness.
- The public test feed + screencast + interop CI are evidence of working code.
- The "Publish negative results" principle is evidenced by any bug write-ups produced in month 6.

### Grant-application inheritances

Per ../docs/FUNDING.md (not re-read here; content deferred to that document), Phase 3 M8 grant applications depend on:

- A named custodian or custodian-in-progress (Phase 3 M7 output, but reliant on Phase 2 evidence).
- A named first outside publisher (Phase 2 M5 output).
- A shipped 0.4.1 errata (Phase 2 M6 output) as evidence the spec is maintained, not abandoned-at-0.4.
- The Miniflux fork as evidence of a working reader (Phase 1 output).

### What Phase 3 does NOT inherit

Explicit non-inheritances, so the Phase 3 planner doesn't assume them:

- **No test suite.** Phase 3 M9 builds it. The fixture pack is an input, not the suite.
- **No second reader.** NetNewsWire is Phase 4 M11.
- **No ActivityPub co-existence appendix.** Phase 4 M12.
- **No subscriber portability format.** Phase 5 M13.
- **No funded coordinator.** Grant applications are filed in M8; decisions come later.
- **No 0.5 spec work.** Phase 3 focuses on test infrastructure, not spec revision.

### Single-sentence handoff summary

By end of month 6, Phase 3 inherits a working reader fork, two production publisher plugins, at least one outside publisher with real revenue, a published security review, a 0.4.1 errata document, and a full fixture pack — enough to walk into the Internet Archive custodian conversation with working artifacts, not promises.
