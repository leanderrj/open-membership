# Phases 3 and 4, Execution Plan (Months 7-12)

Turns ROADMAP.md Phase 3 (governance + test infrastructure) and Phase 4 (diversifying the implementer base) into week-granular work. Budget and grant content is deferred to ../funding/README.md; this file tracks engineer-weeks, ownership, and decision gates only. 0.4 is feature-frozen; every artifact below is either non-normative (appendices, Profile) or tooling around the existing spec.

## Shipped this session (agent-produced artifacts)

- [x] **Atom + JSON Feed mappings** → `../../spec/SPEC-SYNDICATION-MAPPINGS.md` (382 lines, non-normative companion)
- [x] **Publisher test suite + reader conformance harness skeleton** → `reference/om-test-suite/`, Go scaffold with Level 1 parsing/discovery tests implemented and Levels 2/5 stubbed; two entrypoints (`cmd/om-test-publisher`, `cmd/om-test-harness`); shared fixtures; Dockerfile + Makefile
- [x] **Platform Adapter Profile** → `../../spec/SPEC-ADAPTER-PROFILE.md` (377 lines), validated against WooCommerce + Memberful without rework; the ROADMAP "split the Profile" fallback is NOT triggered
- [x] **Static-site reference scaffolding** → `reference/om-eleventy/`, Eleventy 3.x + Cloudflare Workers skeleton with TypeScript worker routes (feed, discovery, checkout, entitlements, webhook, token), lib (token HMAC, JWT, Stripe, KV, config), sample posts, Vitest suite
- [x] **ActivityPub co-existence appendix** → `../../spec/SPEC-ACTIVITYPUB.md` (341 lines), three federation patterns specced, decision table per auth method, Ghost + WordPress implementation guidance

Remaining Phase 3-4 work is external/operational and cannot be agent-shipped: custodian outreach, grant applications, test-suite deployment to `test.open-membership.org`, second-reader fork (NetNewsWire/Feeder), Eleventy-publisher onboarding, publisher replication to five, Ghost-AP / WP-AP team engagement for the ActivityPub appendix review pass.

---

## 1. Status snapshot

### What is already shipped going into Phase 3

| Area | State | File |
|---|---|---|
| Spec 0.4 draft | Feature-frozen; minor errata only through 1.0 | `SPEC.md` |
| Featureset matrix | Authoritative; Levels 1-8 defined | `../../docs/FEATURESET.md` |
| Governance model | Drafted; custodian/working-group shape defined | `../../docs/GOVERNANCE.md` |
| Ghost publisher reference | Production; Level 5 on publisher side; Node + Cloudflare Worker dual runtime | `reference/om-ghost/` |
| WordPress publisher reference | Production; Level 5; Stripe only in v0.1 | `reference/om-wordpress/` |
| Miniflux reader fork | Shipped in Phase 1 M3 (assumed present as Phase-1 deliverable) | external fork |
| First production publisher + 0.4.1 errata | Per Phase 2 M6 |, |

### What Phase 4 M10 becomes given WordPress is done

ROADMAP.md Phase 4 M10 originally listed two line items: **WordPress plugin** and **Platform Adapter Profile**. The WordPress plugin is shipped. M10 in execution is therefore a single deliverable: the **Platform Adapter Profile**, extracted from the common shape of `om-ghost` + `om-wordpress` and validated against WooCommerce and Memberful before publication. This is an extraction-and-validation exercise, not a greenfield build. See §3.1.

### Forward-looking surface for months 7-12

- **Phase 3 (M7-M9):** all forward-looking. Custodian outreach (M7), grant applications (M8), and the triple technical deliverable, publisher test suite v1 + reader conformance harness + Atom/JSON Feed mappings (M9).
- **Phase 4 M10:** Platform Adapter Profile extraction + external validation.
- **Phase 4 M11:** forward-looking; second reader + static-site reference.
- **Phase 4 M12:** forward-looking; replication to five publishers + ActivityPub co-existence appendix + enclosure-auth errata (conditional).

---

## 2. Phase 3, Governance and test infrastructure (M7-M9)

### 2.1 Month 7, Custodian outreach

Four candidates, asked one per week, with the pitch adapted from each previous response. Order matches ROADMAP.md Phase 3 M7 and ../../docs/GOVERNANCE.md §"Shortlist and order of asks". Drafts for all four are written in week 1 in parallel so the sequence can run without drafting delays.

**Global drafting checklist (applied to every pitch, tailored per custodian):**

- One-page cover: problem (paid-RSS is solved only inside walled gardens), `om`'s position (open namespace, feature-frozen at 0.4, two reference implementations in production), specific ask (hold canonical URL + serve as legal entity of last resort, per ../../docs/GOVERNANCE.md §"What the custodian actually does")
- Attachments: `SPEC.md`, `../../docs/GOVERNANCE.md` (custodian section), `ROADMAP.md` (risk register + 1.0 deliverables), link to `reference/om-ghost/` and `reference/om-wordpress/`
- Minimum agreement proposal as an appendix, the five-clause one-pager from ../../docs/GOVERNANCE.md §"The minimum custodian agreement"
- Named primary contact and backup contact in the working group

**Week 1, draft all four; send to Internet Archive (IA)**

| Element | Content |
|---|---|
| What goes in the pitch | Mission alignment (open standards + digital preservation); low-procedural-overhead ask; reference to their history of hosting specs; warm intro path via professional contacts if available |
| What IA gets in return | Attribution on the canonical URL; optional conference slot at their annual event; listing as steward in every 1.0+ release; a working protocol that routes paid-RSS out of walled gardens |
| Likely concerns | Scope creep into fiscal sponsorship; long-term staffing implications; whether `purl.org` is the right canonical host (A: independent of IA, we just want them holding our `.org` subdomain or `archive.org/open-membership-rss`) |
| Decision criterion | Warm response within 2 weeks → proceed; silence at 3 weeks → gentle nudge; explicit decline → move to week 2 candidate immediately |

**Week 2, Sovereign Tech Fund (STF)**

| Element | Content |
|---|---|
| What goes in the pitch | STF already funded ActivityPub test infrastructure; `om` is the paid-content complement to that work; dual role (custodian + potential M8 funder, see ../funding/README.md) is natural for them |
| What STF gets | A second federated-content protocol under their stewardship; a clear mapping to the EU's public-digital-infrastructure thesis; deliverables they can point to at year-end |
| Likely concerns | Scope of the custodial role vs. their mission as funder (A: scope it to the five ../../docs/GOVERNANCE.md clauses only); whether the spec needs EU-legal review before they host it (A: not at custodian layer; at most a data-protection note) |
| Decision criterion | Answer expected 2 weeks after grant approval per ../../docs/GOVERNANCE.md. If no grant decision yet, send the custodian pitch separately and flag it as orthogonal |

**Week 3, NLnet Foundation**

| Element | Content |
|---|---|
| What goes in the pitch | NGI Zero fit; their existing role as NGI coordinator means stewardship is not a new capability; board-level decision expected |
| What NLnet gets | Alignment with NGI's subscriber-data-portability thesis; a project already in production with two reference implementations; a clean hand-off into their existing stewardship infrastructure |
| Likely concerns | Formal board process adds ~4-6 weeks; they may prefer to see a fiscal-sponsor arrangement first; they may prefer a Dutch-hosted URL (A: we can live at `nlnet.nl/projects/open-membership-rss` or similar) |
| Decision criterion | Answer at 4-6 weeks per ../../docs/GOVERNANCE.md. If we get a yes here before IA responds, hold, IA is still preferred on procedural overhead |

**Week 4, Software Freedom Conservancy (SFC)**

| Element | Content |
|---|---|
| What goes in the pitch | Safe US institutional fallback; SFC's project-membership model is the clearest legal wrapper; cite precedent projects they steward |
| What SFC gets | A project with production adopters, two reference implementations, and a ratified spec within 12 months; working-group governance already designed to their standards |
| Likely concerns | Project-membership application is heavy; their intake cadence is quarterly; they may ask for a 501(c)(3)-compatible governance statement (A: ../../docs/GOVERNANCE.md covers this) |
| Decision criterion | Answer at 2-3 months per ../../docs/GOVERNANCE.md. Only reached if all three earlier candidates decline |

**Follow-up cadence (per candidate):**

- Day 0: send pitch
- Day 7: no response → one-line nudge
- Day 14: no response → second nudge; flag as cold in working-group log
- Day 21: no response → move on; continue sequence but keep the thread open
- Explicit decline: ask for referral, then close

**Fallback if all four decline:** ../../docs/GOVERNANCE.md risk register and ROADMAP.md risk register already converge: spin up a lightweight Podcast-Index-shaped foundation, one person, one domain, one public Git repo. Documented as the M7 escalation in the working-group log; does not delay M8 grant work.

**M7 exit criteria:**

- At least one custodian candidate in active dialogue by end of week 4
- Minimum agreement draft reviewed by ../../docs/GOVERNANCE.md editor
- Named backup custodian (second in active dialogue) in case primary stalls

### 2.2 Month 8, Grant applications

Grant content, amounts, and detailed narratives live in ../funding/README.md. This section covers only the drafting and submission logistics.

**Submission order and cadence:**

| Week | Application | Drafter | Reviewer | Notes |
|---|---|---|---|---|
| W1 | Sovereign Tech Fund | Spec editor | Protocol editor + one publisher-side implementer | 2-4 weeks of drafting; kick off M7 week 4 if possible to front-load |
| W1-W2 | Stripe Open Source sponsorship | Community/documentation lead | Paid coordinator (once seated) or protocol editor | Shorter form than STF; can run in parallel without conflict |
| W3-W4 | NLnet NGI Zero | Protocol editor | Spec editor + one reader-side implementer | NLnet's form is the most structured; allow two weeks for edits |

**Internal review bar before submission:**

- Each grant application is reviewed by at least one working-group member not on the drafting team
- Pitches must match the four audience-framings in ../../docs/RELATED-WORK.md §"The strategic narrative", no frankenstein mixes of them
- Every application must link to: `SPEC.md`, `../../docs/FEATURESET.md`, `reference/om-ghost/`, `reference/om-wordpress/`, a production publisher case study from Phase 2 M6
- The review reviewer writes a one-paragraph "what this application is asking for" summary; if the drafter disagrees with the summary, the pitch is unclear and needs a rewrite before submission
- No two applications submitted in the same week; a 7-day gap between submissions minimum, so the first response can inform the second

**Pre-submission gates:**

1. Custodian commitment (or active dialogue) from M7, grant funders ask about stewardship; a warm custodian conversation is adequate if no signed agreement yet
2. Phase 2 M6 case study published, funders want to see a live subscriber, not a demo
3. Public registry for conformance started (stub at custodian URL, see §2.3), funders want to see institutional scaffolding forming

**M8 exit criteria:**

- At least two grant applications submitted
- All three applications drafted (even if one is not yet submitted by end of M8)
- No application submitted without internal review, this is non-negotiable; rushed applications are worse than late ones

### 2.3 Month 9, Test suite v1 + reader harness + format mappings

Three deliverables, one repo. New repo at `github.com/open-membership-rss/om-test-suite` (eventually to live under the custodian's GitHub org once custody transfers).

**Shared repo layout (plan, not mandated by spec):**

```
om-test-suite/
├── fixtures/            Canonical feed + discovery document fixtures
│   ├── level-1/         Foundational: parse + render
│   ├── level-2/         URL token auth, unlock, preview substitution
│   ├── level-5/         Commerce: offers, checkout, entitlements
│   ├── atom/            Same fixtures re-expressed in Atom
│   └── json-feed/       Same fixtures re-expressed in JSON Feed
├── publisher-suite/     Runs against a live feed URL + discovery doc
├── reader-harness/      Publisher-emulator; a reader points at it
├── mappings/            Non-normative Atom + JSON Feed mapping specs
└── docs/                Implementer instructions + pass/fail taxonomy
```

One repo because the fixtures are shared; separate entrypoints so a publisher doesn't accidentally run the reader harness.

#### 2.3.1 Publisher test suite v1

**Scope:** Levels 1, 2, 5 only. Levels 3, 4, 6, 7, 8 are post-1.0 test-suite work; they are not part of v1. This matches the "Indie Reader" profile in ../../docs/FEATURESET.md §"Conformance profiles" and the ROADMAP.md M9 scope.

**Architecture:** standalone HTTP service. Accepts a feed URL + discovery document URL in a form submission; runs the fixture pipeline in a worker; renders a pass/fail report with per-check rationale and a link to the relevant SPEC.md / ../../docs/FEATURESET.md section.

**Deployment target:** `test.open-membership.org` (subdomain of the custodian-held canonical domain once available; provisional deployment on Cloudflare Pages or Fly.io during M9 while custodian onboarding completes).

**Test categories per level:**

| Level | Category | Representative tests (not exhaustive) |
|---|---|---|
| 1 | Namespace + parse | `xmlns:om` declared; `<om:provider>` present and well-formed URL; `<om:tier>` at least one; `<om:access>` on at least one item |
| 1 | Discovery document | `.well-known/open-membership` returns HTTP 200 with `application/json`; `spec_version` string matches `SPEC.md`; required fields per SPEC.md §9 |
| 1 | Preview semantics | An item with `<om:access>locked</om:access>` has a non-empty `<om:preview>` block |
| 2 | URL token auth | Feed URL containing a token serves content unique to that token; missing token returns HTTP 401 or 403 |
| 2 | Unlock endpoint | `<om:unlock>` URL accepts the stored token and returns unlock content |
| 2 | Access revocation | When a token is simulated-revoked, subsequent fetches return 403 (no content leak through stale cache) |
| 5 | Offer declaration | `<om:offer>` references a declared `<om:tier>` and at least one `<om:psp>`; the offer's checkout URL is reachable |
| 5 | Checkout initiation | POST to `/api/checkout` with valid body returns a redirect URL and a session ID |
| 5 | Entitlements polling | GET `/api/entitlements?session_id=...` returns a consistent state before and after simulated subscription |
| 5 | Webhook honoring | Stripe webhook for `customer.subscription.deleted` revokes entitlement within the publisher's declared `grace_hours` |
| 5 | Revocation policy | `<om:revocation>` block present in discovery; policy value is one of the three SPEC.md §2.1 enum values |

**Pass/fail taxonomy:**

- **Pass**, test ran, output matched expectation
- **Fail**, test ran, output did not match; the suite surfaces the diff
- **Warn**, output was correct but a non-normative SHOULD was violated
- **Skip**, test did not apply (e.g., a publisher with no `<om:offer>` gets Level 5 skipped)
- **Error**, the publisher endpoint was unreachable or returned 5xx

A publisher "passes Level N" if every test at every level ≤ N is Pass or Skip.

#### 2.3.2 Reader conformance harness

A publisher-emulator. Serves deterministic fixtures (canonical feeds, canonical discovery document, canonical checkout endpoint that issues deterministic JWTs). A reader running CI points at the emulator, runs its own protocol flow, and asserts its state matches the expected state.

**Structure:**

- Emulator is a single binary / Docker image (same Hono-shaped app as `om-ghost`'s `shared/app.ts`, simplified)
- Fixtures live in the `fixtures/` directory alongside the publisher suite, shared source of truth
- Reader's CI plugs in by: `docker run om-emulator --fixture=indie-paid-monthly` then asserts on the reader's observable state (feed items shown, offer prompt shown, post-checkout unlock)
- Canonical fixtures published as OCI images too, so a reader's CI can pin a version

**How a reader plugs in:**

1. Add `om-emulator` as a CI service
2. Point the reader build at `http://localhost:8080/feed/om/TEST_TOKEN`
3. Reader's test suite runs its own user-flow assertions against known-good feed content
4. Harness provides a "conformance claim" generator: reader runs a script, uploads results, gets a pass/fail badge for registry listing (../../docs/GOVERNANCE.md §"Self-certification")

**Shared-repo split with publisher suite:** fixtures are the dependency. Both entrypoints import from `fixtures/`. Changes to fixtures require bumping the suite version because they retroactively affect conformance claims.

#### 2.3.3 Atom + JSON Feed mappings

Published as non-normative appendices, Appendix C (Atom mapping) and Appendix D (JSON Feed mapping) of `SPEC.md`. Note: `SPEC.md` is not modified by this plan; the appendices are drafted as standalone markdown inside `om-test-suite/mappings/` during M9, then merged into `SPEC.md` in the 0.5 cut (out of scope for this plan).

**Mapping scope (per format):**

| `om` element / concept | Atom equivalent / placement | JSON Feed equivalent / placement |
|---|---|---|
| `xmlns:om` namespace | `xmlns:om` on `<feed>` root | Top-level `_om` extension object per JSON Feed extensions convention |
| `<om:provider>` | `<om:provider>` as child of `<feed>` | `_om.provider` |
| `<om:tier>` | `<om:tier>` as child of `<feed>`; same attributes | `_om.tiers[]` |
| `<om:access>` per item | `<om:access>` as child of `<entry>` | `_om.access` on each `items[]` object |
| `<om:preview>` | `<om:preview>` as child of `<entry>`; full content lives in `<content>` when access permits | `_om.preview` + `content_html` filtered by access |
| `<om:unlock>` | Same element nested under `<entry>` | `_om.unlock` |
| Full content vs. preview | `<content type="html">` filtered at render time by entitlement | `content_html` / `content_text` filtered at render time |
| Discovery document | Unchanged (`.well-known/open-membership`, format-agnostic) | Unchanged |
| Feed token in URL | Same URL shape (path component) | Same URL shape |
| Enclosures / media | `<link rel="enclosure">` with auth token per Phase 2 M6 errata | `attachments[]` with bearer-token URL |

**Edge cases to resolve in M9:**

- Atom's `<category>` vs. RSS's `<category>`, no `om` interaction; just note parity
- JSON Feed's lack of mandatory GUID, readers MUST synthesize one from `url` for entitlement keying; mapping spells this out
- Atom's `<updated>` semantics vs. `om`'s time windows, window evaluation uses server-side time regardless of feed format
- JSON Feed 1.1's `authors[]` vs. `author`, no `om` interaction; note only
- Enclosure-auth pass-through in all three formats, token form depends on format; mapping enumerates the three expressions of the same token

**Why non-normative matters:** RSS 2.0 remains the canonical format. Atom and JSON Feed are re-expressions of the same `om` semantics. The test suite validates any of the three; a publisher emitting Atom does not claim a different conformance level, just a different syndication substrate.

#### 2.3.4 Week-by-week breakdown for Month 9

This is the only month of Phase 3 with real technical build. Effort: ~5 engineer-weeks across 4 calendar weeks (publisher-suite + reader-harness engineer overlap by one week; mappings drafter runs parallel).

| Week | Publisher suite | Reader harness | Atom + JSON Feed mappings |
|---|---|---|---|
| 1 | Repo scaffolded; fixture schema drafted; Level 1 fixtures written; discovery-doc validator built | Emulator scaffolded on `om-ghost`'s `shared/app.ts` as starting point; `fixtures/` wired in | Mapping spec outlines drafted; cross-reference table (§2.3.3 above) fleshed out with full element inventory |
| 2 | Level 2 fixtures; URL-token simulator; 401/403 coverage; HTTP service skeleton; pass/fail taxonomy formalized | Fixture loader; deterministic JWT issuer; emulator Docker image | Atom mapping first draft; worked example (the `SPEC.md` Appendix A investigative-journalism publisher re-expressed in Atom) |
| 3 | Level 5 fixtures; Stripe test-mode integration via `stripe-mock`; checkout + webhook coverage; report renderer | Emulator CI integration guide written; Miniflux CI as pilot consumer; fixture versioning scheme | JSON Feed mapping first draft; same worked example in JSON Feed; edge-case list resolved |
| 4 | Deploy to provisional URL; `om-ghost` + `om-wordpress` run against it as smoke test; documented failures filed as errata candidates; announcement blog post | Reader harness announcement; second reader author (Phase 4 M11 candidate) given early access to test their fork against | Both mappings reviewed by working-group members; published at `om-test-suite/mappings/` for public comment |

**Dependencies:**

- Fixture shape must be stable by end of week 1 or both suites delay
- `stripe-mock` available in CI, external dependency; plan B is a minimal hand-rolled Stripe stub covering only `checkout.sessions` + webhook events
- `om-ghost` and `om-wordpress` must be pinned to specific versions for the smoke test, any drift between suite fixtures and reference-plugin behavior is a bug in one of the three, surfaced and triaged

**Decision log entries to record at M9 close:**

- Where does `test.open-membership.org` live? (Cloudflare Pages if custodian not yet onboarded; move to custodian-controlled DNS within one quarter of custodian onboarding)
- Is the reader harness fixture set versioned independently of the publisher suite? (Recommend yes; v1 → v1.x additions in either direction should not retroactively invalidate conformance claims)
- What is the policy for registering a failing run in the public registry? (Per ../../docs/GOVERNANCE.md §"Self-certification": claim + result are both listed; the implementer owns the narrative of "we fail test X because of Y, fix in vZ")

#### 2.3.5 Phase 3 exit criteria

- Custodian commitment (signed agreement OR warm verbal commitment with signed draft in circulation)
- At least two grant applications submitted through ../funding/README.md-described channels; internal-review bar held
- `om-test-suite` repo public, with publisher suite v1, reader harness, and Atom/JSON Feed mapping drafts
- At least `om-ghost` + `om-wordpress` passing Level 1/2/5 against the suite (otherwise the suite is wrong OR the references are wrong, either way, blocker)
- At least one external reader (the Phase 1 Miniflux fork) able to run CI against the harness

---

## 3. Phase 4, Second reader, WordPress, and replication (M10-M12)

### 3.1 Month 10, Platform Adapter Profile

WordPress is shipped (`reference/om-wordpress/`), so M10 is single-purpose: extract the adapter contract implicit in `om-ghost` + `om-wordpress`, write it as a non-normative implementer's guide, and validate it against two external platforms before publishing. Modeled on the OIDF Implementer's Guide, contract on one side of a spread, concrete mappings on the other.

#### 3.1.1 Extraction methodology

The Profile is distilled from the observable boundary between **host primitives** (what the CMS already gives you) and **`om`-specific behavior** (what the plugin adds). The extraction pass reads both references side-by-side looking for the same eight moving parts.

| Extraction dimension | What to read in `om-ghost` | What to read in `om-wordpress` |
|---|---|---|
| Member representation | `shared/ghost-client.ts` + Ghost Members API responses | `src/Membership/MemberState.php` + WP user-meta keys in README "Subscriber model" table |
| Tier mapping | `shared/config.ts` + `om-config.yaml` | `src/Config/ConfigRepository.php` + Settings-page tier JSON |
| Per-post access rule | `shared/feed-render.ts` + Ghost `visibility` field | `src/Feed/FeedRenderer.php` + `om_access` + `om_required_tiers` post meta |
| Feed token derivation | `shared/token.ts` (HMAC-SHA256 of `uuid + plan_id`) | `src/Security/FeedToken.php` (HMAC-SHA256 of analogous inputs) |
| JWT issuance | `shared/jwt.ts` | `src/Security/Jwt.php` |
| PSP webhook ingestion | `shared/stripe-client.ts` + webhook handler | `src/Stripe/StripeClient.php` + `/wp-json/om/v1/webhook` |
| Idempotency | `shared/idempotency.ts` (SQLite) | `src/Security/IdempotencyStore.php` (`wp_om_webhook_events` table) |
| Rate limit | `shared/rate-limit.ts` (token buckets) | `src/Security/RateLimiter.php` (transient fixed window) |

The two plugins converged independently on the same eight dimensions. The Profile is the union of "what each dimension's contract looks like," expressed abstractly.

**Extraction procedure:**

1. For each of the eight dimensions, write the abstract contract in one paragraph: inputs, outputs, required invariants
2. Write the Ghost concrete mapping in one paragraph (what Ghost gives you, how the plugin bridges it)
3. Write the WordPress concrete mapping in one paragraph (what WP gives you, how the plugin bridges it)
4. If the two concrete mappings are structurally different in a way the abstract contract does not cover, the abstract contract is under-specified, iterate
5. Do not add a dimension the references do not exhibit. If WooCommerce or Memberful need it, they surface it in §3.1.3 validation, not extraction

**Do not write the Profile content in this plan.** This plan describes the process. The Profile document itself is produced in M10 weeks 1-3 and lives at `GOVERNANCE-docs/platform-adapter-profile-1.0.md` (or equivalent) once published.

#### 3.1.2 Draft Profile structure (shape only)

The Profile document has these sections. Content is not written here.

| Section | Contains |
|---|---|
| 0. Purpose and non-normative status | Why this exists; that it does not add spec features; that it binds only to implementers who choose to follow it |
| 1. The host primitive contract | Abstract definitions of the eight dimensions (members, tiers, access, token, JWT, webhook, idempotency, rate limit) |
| 2. Ghost mapping | Per-dimension, "what Ghost gives you / what `om-ghost` adds / file references into `reference/om-ghost/`" |
| 3. WordPress mapping | Same structure, pointing at `reference/om-wordpress/` |
| 4. WooCommerce mapping (validation pass) | Filled during §3.1.3 |
| 5. Memberful mapping (validation pass) | Filled during §3.1.3 |
| 6. Deviation guide | What happens when a host is missing one of the eight primitives (e.g., a static-site generator has no built-in "members") |
| 7. Relationship to SPEC.md | Explicit: nothing in the Profile overrides `SPEC.md`; the Profile is a lens, not a spec |
| 8. Version and errata | Initial 1.0 maps to `SPEC.md` 0.4; Profile versioning is independent of spec versioning |

#### 3.1.3 Validation pass against WooCommerce and Memberful

Per ../../docs/RELATED-WORK.md §"The 'Open' column is `om`'s adapter pipeline", these two are the cleanest external stress test of the Profile. The validation is the point; it is what turns the Profile from speculative into shipped.

**Integration points to probe (per platform):**

| Probe | WooCommerce specifics | Memberful specifics |
|---|---|---|
| Member representation | WooCommerce Subscriptions uses WP users + the Subscriptions post-type; does the Profile's "member contract" accommodate a subscription being a post? | Memberful members live in Memberful's own database, bridged into WP via plugin; does the Profile allow the member primitive to live off-host? |
| Tier mapping | WC product variations map loosely to `<om:tier>`, is the Profile's tier contract flexible enough for variation-backed tiers? | Memberful plans map directly; the question is whether `om-wordpress`'s tier-JSON settings shape is reusable |
| Per-post access | WC "Members-only product" plugin family gates posts via shortcode; does the Profile require a capability-style API or can it live at shortcode level? | Memberful's "Protect this post" checkbox, does the Profile's access contract accommodate binary gating vs. tier-specific gating? |
| Feed token | WC does not ship feed tokens; we would add them via HMAC like `om-wordpress`. Does the Profile's token contract require host-provided UUIDs or accept any stable per-member identifier? | Memberful provides its own per-member IDs; verify the Profile's derivation contract doesn't over-constrain input |
| PSP webhook | WC ingests Stripe webhooks via its own handler; can a Profile-conformant plugin co-exist with WC's own? | Memberful is its own PSP effectively; the Profile must allow the PSP layer to be bypassed when the host owns billing |

**Acceptance criterion:** both WooCommerce and Memberful fit the Profile without rework to the Profile's abstract contract. If either requires the Profile to add a new abstract dimension or mutate an existing one, the Profile is wrong, not the platform. Per ROADMAP.md risk register.

**What we do if they don't fit:**

1. If only one requires reshape, and the reshape is additive (a new optional dimension), add it, the Profile is iterating, not broken
2. If both require the same reshape in the same direction, add it, the Profile was under-specified
3. If they require divergent reshapes, split the Profile into "CMS Profile" (Ghost, WordPress, Memberful) and "Commerce-plugin Profile" (WooCommerce) per the ROADMAP risk-register escalation path. Accept that the world has two shapes and document them both

**Who runs the validation pass:**

- The Profile author (spec editor) does not do the WooCommerce or Memberful pass, the point is external eyes
- One week of a WooCommerce-experienced WP engineer's time (contracted, see ../funding/README.md)
- One week of a Memberful-experienced WP engineer's time (contracted)
- Each produces a written "fit report", either "fits as-is" or "these three things broke"

#### 3.1.4 Ownership and review

| Role | Who | What they do |
|---|---|---|
| Draft owner | Spec editor | Writes sections 0-3 and 6-8 of the Profile; owns extraction |
| Validation owners | Two external CMS engineers (WooCommerce + Memberful) | Each writes section 4 or 5 as a fit report; flags contract gaps |
| Reviewers | Two working-group members not on drafting team | Review Profile against `SPEC.md` to confirm non-normative status holds |
| Release gate | Working group lazy consensus | Per ../../docs/GOVERNANCE.md §"Decision-making" |

#### 3.1.5 Month 10 week-by-week

| Week | Spec editor | WooCommerce engineer | Memberful engineer |
|---|---|---|---|
| 1 | Extract sections 0-3 (Ghost + WordPress concrete mappings + abstract contract) |, |, |
| 2 | Hand draft 0.9 to both validators; begin section 6 (deviation guide); start draft ActivityPub co-existence scoping doc in parallel | Read draft; build a Profile-conformant WC adapter sketch (not production) | Read draft; build a Profile-conformant Memberful adapter sketch (not production) |
| 3 | Integrate validator feedback into contract; finalize sections 6-8 | Submit fit report | Submit fit report |
| 4 | Working-group review; publish v1.0 of the Profile; announcement post pointing at the repo |, |, |

**M10 exit criteria:**

- Profile published in the repo as non-normative guide
- Both fit reports (WooCommerce + Memberful) published alongside
- Zero rework to the Profile required *or* documented split into CMS/Commerce-plugin Profiles
- Pointer from `SPEC.md` (via an errata PR for 0.4.1) to the Profile's canonical URL, **note:** the errata PR is proposed here; merging is out of scope for this plan (no SPEC.md edits)

### 3.2 Month 11, Second reader + static-site reference

Two forward-looking builds running in parallel. Different engineers; no shared code.

#### 3.2.1 Second-reader decision tree

Candidates and order from ROADMAP.md Phase 4 M11.

| Candidate | Platform | License | Pro | Con | Decision signal |
|---|---|---|---|---|---|
| NetNewsWire fork | iOS + macOS | MIT | Large Apple-platform user base; hardest + highest leverage; native matters for mobile reach | Apple-specific toolchain; review process for App Store; single maintainer (Brent Simmons) has his own roadmap | Warm reply from Brent to an upstream PR sketch by M11 week 1 |
| Reeder support (closed-source) | iOS + macOS | Closed | Reeder's developer has historically accepted spec-based features; closed-source means our changes ship via him, not a fork | Closed source = no direct PR path; we're asking, not contributing | Response to a concrete spec-conformance ask within one week |
| Feeder | Android | GPLv3 | Open source, active maintainer, Android reaches audiences NetNewsWire cannot; clean codebase | Android platform has weaker paid-RSS adoption signal so far; maintainer capacity unknown | Maintainer willing to accept an `om`-parsing PR with Level 1/2/5 scope |

**Decision criteria (evaluated at M11 week 2):**

1. Has the first candidate's maintainer engaged (replied, given scoping feedback)? If yes → commit. If no → escalate to second candidate and re-evaluate in week 3
2. Is the Level 5 commerce flow in scope for v0 of the fork? If no → the choice is wrong regardless of maintainer engagement
3. Does the platform's user base include at least one of the three personas from ROADMAP.md §"Guiding principles #3"? If no → wrong choice; jump to next candidate

**Go/no-go gate:** M11 week 2, Friday. If no commitment by then, downgrade M11 second-reader to "a second Miniflux-shape reader (likely Feeder) with commitment by M11 week 3" and accept the lower leverage. If week 3 also yields nothing, escalate: ship M11 with static-site reference only + write a public call for a second reader that carries into Phase 5.

#### 3.2.2 Static-site reference on Eleventy + Cloudflare Workers

**Why Eleventy + Cloudflare Workers specifically (per ROADMAP M11 + Risk register):**

- Eleventy has a substantial indie-publisher base, the Risk register notes we must onboard an existing Eleventy publisher rather than building greenfield
- Cloudflare Workers are the edge substrate `om-ghost`'s Mode A already uses, so the runtime is a known quantity
- Between the two, the spec's endpoints (`/api/checkout`, `/api/entitlements`, `/api/token`, webhook intake) run at the edge, the static feed is generated at build time; everything else is dynamic at the edge

**Architecture:**

| Component | Where it runs | What it does |
|---|---|---|
| Feed | Build time (Eleventy) | `.11ty.js` template emits `/feed/om/[token].xml` for every active subscriber at build time; tokens are HMAC-derived like `om-ghost`'s and `om-wordpress`'s |
| Discovery doc | Build time (Eleventy) | Static `/.well-known/open-membership` served from the origin |
| `/api/checkout` | Cloudflare Worker | Creates Stripe Checkout Session; same Hono handler as `om-ghost`'s Mode A |
| `/api/entitlements` | Cloudflare Worker | Polls Stripe for session state |
| `/api/token` | Cloudflare Worker | Exchanges feed token for JWT |
| `/api/portal` | Cloudflare Worker | Redirects to Stripe Customer Portal |
| `/api/webhook` | Cloudflare Worker | Stripe webhook intake; state sink is Cloudflare KV + Durable Objects (idempotency) |
| Subscriber state | Cloudflare KV | No central database; per-subscriber entitlement records, keyed by feed-token-hash |
| Rebuild trigger | Worker → webhook → Eleventy build API | On `customer.subscription.created` / `.deleted`, trigger a site rebuild to regenerate that subscriber's feed file; partial rebuild if Eleventy supports it, full rebuild otherwise |

**Feature matrix for v0 (intentionally narrow):**

| Level | v0 support | Notes |
|---|---|---|
| 1 | Yes | Namespace, provider, tier, preview in every generated feed |
| 2 | Yes | URL-token auth; static-generated per-token feed files |
| 5 | Yes | Commerce endpoints via Workers |
| 3 | No | Bearer + SCIM deferred to static-site v1 |
| 4 | No | OM-VC deferred to static-site v1 |
| 6, 7, 8 | No | Out of scope for any publisher reference in v0 |

This mirrors the "Indie Reader" profile in ../../docs/FEATURESET.md §"Conformance profiles", the Eleventy reference is the publisher-side twin of that profile.

**Finding an Eleventy publisher to onboard:**

Per ROADMAP.md risk register: "pick an existing Eleventy-based indie publisher before starting Phase 4 M11; offer to migrate them in exchange for running the reference."

| Step | Action | Timing |
|---|---|---|
| 1 | Compile shortlist of 8-12 Eleventy-based indie publishers with paid content ambitions. Source: 11ty.dev showcase + Ghost-migration forum posts + ../../docs/RELATED-WORK.md §"Closed column" migrants | M10 week 3 (overlaps with Profile work) |
| 2 | Outreach: "we'll build you paid-RSS infrastructure for free; you run the reference; we write a case study" | M10 week 4 |
| 3 | Target one commitment by end of M10 (otherwise M11 downgrade per risk register) | M10 week 4 hard deadline |
| 4 | M11 W1: kickoff with committed publisher; architecture handoff | M11 W1 |

If no commitment by end of M10: downgrade M11 reference to a documented "static-site adapter recipe" (no running publisher). Shipping a recipe is still valuable, it's the shape every Hugo/Astro/Jekyll publisher will copy later. Escalation is mild, not catastrophic.

#### 3.2.3 Month 11 week-by-week

| Week | Second reader | Static-site reference |
|---|---|---|
| 1 | Maintainer scoping conversation (already queued from M10 week 4); PR-sketch drafted; fork opened | Eleventy publisher kickoff; target architecture reviewed jointly |
| 2 | **Go/no-go gate Friday.** First PR landing: Level 1 parsing (namespace + `om:provider` + `om:tier` display) | Cloudflare Worker skeleton; Stripe Checkout endpoint; deploy to publisher's domain as shadow infra |
| 3 | Level 2: URL-token persistence, unlock, preview substitution | Feed generation + KV state sink; first end-to-end token-auth fetch |
| 4 | Level 5: in-app checkout flow (opens system browser); entitlement polling; first live test against the Phase 3 publisher test suite | Webhook intake + rebuild trigger; case study published; reference runs against publisher test suite |

**M11 exit criteria:**

- Second-reader fork passes Level 1/2/5 against the reader harness from M9
- Static-site reference passes Level 1/2/5 as publisher against the publisher suite
- At least one live Eleventy publisher running the reference in production
- Case study published (per Guiding Principle 6: publish negative results too, if the reference doesn't deliver, the blog post still ships)

### 3.3 Month 12, Replication + ActivityPub co-existence

Three parallel tracks.

#### 3.3.1 Publisher onboarding cadence (target: 5 in production by end of M12)

Baseline going into M12: 1 publisher from Phase 2 M6 + the Eleventy publisher from M11. Net-new needed in M12: 3.

**Onboarding pattern (borrowed from Phase 2 M5, accelerated):**

| Week | Target | Cadence |
|---|---|---|
| 1 | Second outside publisher (net new) | Likely a Ghost publisher from the Phase 2 M5 shortlist of 10 who was a "maybe" the first time. Onboarding now takes 3-5 days because the infra is proven |
| 2 | Third outside publisher (net new) | Targeting a WordPress publisher using `om-wordpress` directly |
| 3 | Fourth outside publisher (net new) | From ../../docs/RELATED-WORK.md "Open column": Memberful or WooCommerce publisher, using the Profile-validated adapter |
| 4 | Catch-up + case study writeup | Buffer for slippage; write three short case studies (not one long one) |

**What "in production" means:**

- Feed URL at the publisher's domain is `om`-conformant per the publisher test suite
- At least one real paying subscriber
- Discovery document discoverable via link-rel in their site header
- Publisher name listed in the conformance registry at the custodian URL

**Escalation if cadence slips:**

- Two publishers short by M12 W3 → push the ActivityPub appendix to async and reallocate coordinator time to onboarding
- Three short by M12 W4 → publish as "4 publishers in production, 1 in flight" per Guiding Principle 6 (publish negative results); do not inflate the count

#### 3.3.2 ActivityPub co-existence appendix

Per ROADMAP.md Phase 4 M12 and Risk register ("Risk: ActivityPub co-existence design stalls on Ghost/WP AP team availability").

**Specific question the appendix answers:**

> Given a federated inbox fetch carrying an HTTP Signature that identifies a remote actor, how does the receiving server decide whether that actor has an `om` entitlement sufficient to receive a gated post? Parallel in shape to SPEC §8's Podcasting 2.0 co-existence rules.

**Scope (non-normative):**

- HTTP Signature → actor URI → `om` subscriber matching (actor URI is the identity; subscriber record is keyed on it or on a bound credential)
- What happens to a gated post federating to a follower whose inbox is unauthenticated (answer: it does not federate at all, or federates as a preview, the appendix defines which)
- How `<om:privacy>pseudonymous-required</om:privacy>` interacts with ActivityPub's public-by-default norms (answer: pseudonymous publishers do not federate gated posts; unlinkability would be broken by the act of federation itself)
- Token/bearer carry between the ActivityPub inbox fetch and the `om` unlock endpoint

**Engagement plan:**

| Week | Action | Owner |
|---|---|---|
| M10 W2 | Initial reach-out to Ghost ActivityPub team + Automattic WP AP plugin maintainers. Scope: "we'll draft; you review, no code obligation on your side" | Spec editor (overlapped with Profile work) |
| M11 | Collect responses; schedule one 60-minute call with whoever replies; draft outline based on call | Spec editor |
| M12 W1 | Appendix draft 1.0: scope, question, non-normative mapping, open questions | Spec editor |
| M12 W2 | Review cycle with Ghost AP + WP AP contacts | Spec editor |
| M12 W3 | Revision; integrate feedback or record dissent | Spec editor |
| M12 W4 | Ship appendix at `om-test-suite/appendices/activitypub-coexistence-1.0.md` (draft, non-normative; merges into `SPEC.md` in 0.5, out of scope for this plan) | Spec editor |

**Fallback if engagement stalls (per Risk register):**

- Ship the appendix as "open question, see §G.2" with the question defined precisely but the answer deferred to 1.x
- Offer to host the co-authored drafting session at the IndieWebCamp-style event in Phase 6 M16 as a follow-up
- Do not block 1.0 on this appendix

#### 3.3.3 Enclosure-auth errata (conditional)

Per ROADMAP.md interop track + Phase 2 M6: "if the onboarded publisher is a podcaster, close the audio/video gap in 0.4.1." If the Phase 2 M6 publisher was text-only, the errata ships in M12 alongside the first podcast-persona replication.

**Decision tree (evaluated at M12 W1):**

| Condition | Action |
|---|---|
| Enclosure-auth errata already shipped in Phase 2 M6 | No-op in M12 |
| Not yet shipped, but no podcast publisher onboarded by M12 W2 | Defer further; flag as blocker for 0.5 |
| Not yet shipped, and a podcast publisher is onboarding in M12 W1 or W2 | Ship errata in M12 W3 alongside their go-live |

**Errata content scope (reiterated from ROADMAP.md):** one paragraph defining how URL tokens and bearer tokens pass through to chunked-media enclosure URLs. No new element. All three format mappings (RSS, Atom, JSON Feed) get the passthrough mechanic, the M9 mapping work already anticipated this in its edge-case list.

**Owner:** spec editor. **Effort:** one engineer-day of drafting + review cycle.

#### 3.3.4 Phase 4 decision log entries

Recorded at M12 close. Each is a single paragraph plus a pointer to the motivating issue/PR (per ../../docs/GOVERNANCE.md §"Transparency commitments").

- Final second-reader choice + why (NetNewsWire / Reeder / Feeder)
- Static-site reference: live publisher adopted (yes/no); if no, recipe-only fallback published
- Platform Adapter Profile: single profile or split into CMS + Commerce-plugin
- ActivityPub co-existence appendix state (shipped / open-question / deferred)
- Enclosure-auth errata state (shipped in Phase 2 / shipped in Phase 4 M12 / still deferred)
- Publisher count at M12 close (target 5; record actuals)

#### 3.3.5 Phase 4 exit criteria

- Platform Adapter Profile published and externally validated (or split per escalation path, documented)
- Second reader shipped, at minimum Level 1/2/5 conformance against the harness
- Static-site reference running against at least one live publisher (or recipe-only with documented downgrade)
- 5 publishers in production across the three personas (or documented shortfall per Principle 6)
- ActivityPub co-existence appendix draft published (or deferred with explicit open-question framing)
- Enclosure-auth errata closed (shipped or explicitly deferred to 0.5)

---

## 4. Handoff to Phase 5

Phase 5 (M13-M15, IETF submission prep; see ROADMAP.md Phase 5) inherits:

| From | What Phase 5 gets | Phase-5 dependency |
|---|---|---|
| M7 | Custodian committed; canonical URL in custodian's control | Phase 5 M13 format-conversion work needs a canonical URL pinned in the RFC draft |
| M8 | Grant applications submitted; some decisions expected by M13 | Phase 5 work is grant-funded per ../funding/README.md, a no-money runway is possible but tight |
| M9 | Publisher test suite v1 + reader harness + Atom/JSON Feed mapping drafts | Phase 5 M13 "Implementation Status" section of the RFC cites the suite's public registry; M14 external review cites mapping work |
| M10 | Platform Adapter Profile (+ fit reports) | Phase 5 references the Profile as part of non-normative appendix inventory in the RFC |
| M11 | Second reader + static-site reference | **Hard dependency:** Phase 5 M13's subscriber portability format (see `../../spec/SPEC-PORTABILITY.md`) requires working readers at both ends of the round-trip. Miniflux (from Phase 1) + second reader (from M11) must both exist as functioning endpoints. If M11 second-reader slips, M13 portability round-trip slips with it |
| M12 | 5 publishers in production; ActivityPub co-existence appendix draft; enclosure-auth state | Phase 5 references publisher count as evidence of "running in production at multiple sites" (ROADMAP.md §"Critical path"); appendix becomes part of the RFC non-normative appendix set |

**Specific Phase-5-critical artifacts Phase 4 must deliver:**

1. A working second reader that can import and export the portability JSON-LD shape, without this, M13's "Miniflux → NetNewsWire round-trip" cannot be demonstrated, and the RFC submission's "Implementation Status" section is weakened
2. Publisher test suite with stable fixture versions, the RFC's IANA considerations and Implementation Status sections both cite the suite; fixture drift post-Phase-3 would mean rewriting those sections in Phase 5
3. Custodian agreement signed, the RFC is submitted "under the stewardship of [custodian]" per ../../docs/GOVERNANCE.md §"What the custodian actually does"; without custody, submission waits
4. Public conformance registry populated with at least `om-ghost`, `om-wordpress`, Miniflux fork, second reader, and the static-site reference, the registry *is* the Implementation Status section

**What does NOT cross the Phase-4/Phase-5 boundary:**

- No new spec features. 0.4 remains feature-frozen through 1.0; 0.5 is the errata-+-evidence cut. Any spec feature idea surfaced in Phase 4 goes into a post-1.0 issue tracker, not into the Phase 5 drafting process
- No Phase 4 case-study style narrative directly into the RFC, the RFC's voice is editorial; case studies live at the custodian URL and are cited
- No non-normative appendices get promoted to normative during Phase 5. The Profile, the Atom/JSON Feed mappings, the ActivityPub appendix, and the portability format all remain non-normative through 1.0 at least

---

## 5. Summary of engineer-week estimates

Indicative only, ../funding/README.md has costs; this table has effort.

| Month | Deliverable | Effort (engineer-weeks) |
|---|---|---|
| M7 | Custodian outreach (drafting + sequencing, no engineering) | ~1 (coordinator + editor time) |
| M8 | Grant applications (drafting + review, no engineering) | ~2 (across three applications) |
| M9 | Publisher test suite v1 | ~3 |
| M9 | Reader conformance harness | ~2 |
| M9 | Atom + JSON Feed mappings | ~1 |
| M10 | Platform Adapter Profile (spec editor + two external validators) | ~3 (1 editor + 1 WC + 1 Memberful) |
| M11 | Second reader (Level 1/2/5 fork) | ~4 |
| M11 | Static-site reference (Eleventy + Workers) | ~3 |
| M12 | Publisher onboarding × 3 (replication) | ~2 (coordinator-heavy, not engineer-heavy) |
| M12 | ActivityPub co-existence appendix | ~1 |
| M12 | Enclosure-auth errata (conditional) | ~0.2 |

Total across Phase 3 + Phase 4: ~22 engineer-weeks of engineering + ~3 weeks of coordination/editorial time. Fits within a 6-month window with the contributor shape in ../../docs/GOVERNANCE.md §"Composition" (two publisher-side, two reader-side, one editor, one community lead, one paid coordinator), no single role is on the critical path for more than two consecutive months.
