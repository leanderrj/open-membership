# Open Membership RSS — Roadmap to 1.0

Eighteen months from spec draft to ratified open standard with multiple production deployments. This document covers spec and technical milestones only. For principles, risks, and what 1.0 ratifies, see [ROADSHOW.md](ROADSHOW.md). For budget and funding, see [funding/](funding/).

## Interop & platform-surface track — SHIPPED

All nine gaps surfaced in review after Ghost and WordPress shipped are now delivered as written artifacts in the repository. What remains on each is operational: deployment, external review, or production validation with a real publisher.

| Gap | Artifact | Remaining work |
|---|---|---|
| Atom + JSON Feed mappings | `spec/SPEC-SYNDICATION-MAPPINGS.md` | Test suite validates both formats (see test suite row) |
| Platform Adapter Profile | `spec/SPEC-ADAPTER-PROFILE.md` | Validated against WooCommerce + Memberful without rework; no further work pre-1.0 |
| Static-site reference | `reference/om-eleventy/` (scaffolded) | Onboard a real Eleventy publisher; production deploy |
| ActivityPub co-existence | `spec/SPEC-ACTIVITYPUB.md` | Review pass with Ghost-AP / WP-AP maintainers |
| Reader conformance harness | `reference/om-test-suite/` (scaffolded, Level 1 live, L2/L5 stubbed) | Fill in L2 and L5 tests; deploy at `test.open-membership.org` |
| Subscriber portability | `spec/SPEC-PORTABILITY.md` + `reference/om-portability-roundtrip/` | Run the 26-test matrix against real Miniflux and NetNewsWire forks once they exist |
| Anti-sharing primitive | `spec/SPEC-SHARING-POLICY.md` (v0.1 Provisional) | Hold as Provisional until persona 2 podcaster deploys; errata to 1.0 after |
| i18n: VAT/tax at `<om:price>` | `spec/SPEC-ERRATA-0.4.1.md` Erratum 1 | Publish 0.4.1 at the canonical URL |
| Enclosure auth | `spec/SPEC-ERRATA-0.4.1.md` Erratum 2 | Same |

## The 18-month plan

### Phase 1 — Ship something real (months 1–3)

The goal of Phase 1 is a working end-to-end flow on a test Ghost instance, nothing more. Nothing else in the plan matters if Phase 1 slips past month 3. If it does, stop everything else and figure out why.

**Month 1: Ghost plugin v0.1 scaffolding**

- Fork Ghost, add a custom route `/feed/om` using the existing Handlebars template mechanism
- Emit `om` 0.4 namespace declarations, provider URI, and one tier declaration
- Serve `.well-known/open-membership` with minimal required fields
- Integration test: feed validates as well-formed RSS 2.0, discovery document parses as JSON

Owner: one full-time engineer. Effort: 1 engineer-month.

**Month 2: Stripe integration and entitlements**

- Add Stripe Entitlements feature mapping (`<om:feature>` ↔ Stripe `lookup_key`)
- Implement `/api/checkout` endpoint that creates Stripe Checkout Sessions
- Implement webhook handler for `customer.subscription.created`, `.updated`, `.deleted`, and `charge.dispute.created`
- Issue JWTs carrying `entitlements` claim after successful subscription
- Integration test: test-mode Stripe purchase flow works end-to-end, entitlement JWT validates

Owner: same engineer. Effort: 1 engineer-month.

**Month 3: Reader fork + interop test**

The Miniflux fork is scaffolded at `reference/om-miniflux/` (fork-prep Go `om/` module, fixture feeds, PATCH-PLAN.md, INTEGRATION.md runbook). Remaining work:

- Apply the patch plan to a live Miniflux checkout, merge the `om/` module into its source tree
- Integration test: one human subscribes to a test Ghost instance via the forked Miniflux, content unlocks after payment, content locks again after subscription cancellation

Owner: second full-time engineer (overlapping with Month 2).

**Phase 1 deliverable:** one working end-to-end demo of Ghost + Miniflux + Stripe test-mode.

### Phase 2 — First outside publisher (months 4–6)

This is the riskiest phase because it depends on someone outside the project saying yes. The work is partially technical (productionizing what Phase 1 built) and partially political (convincing a real publisher to switch).

**Month 4: Production hardening**

- Move from test-mode Stripe to live mode with a real Stripe account
- Set up proper webhook signature verification, idempotency keys, retry-on-failure
- Add Mollie PSP profile (second PSP required by the spec; EU-friendly)
- Security review by an external party (a few days of a competent security consultant)

(Spec deliverables for M4 — `tax_inclusive` and `<om:sharing-policy>` v0 — are shipped; see the interop track table above.)

**Month 5: Publisher outreach and onboarding**

- Identify 10 candidate publishers across the three personas. Priorities:
  - Ghost users currently using FeedPress+Outpost for paid RSS (they've already paid for this; offering them the open version is the easiest pitch)
  - Substack refugees who've migrated to Ghost and are looking for paid-RSS support
  - Small investigative journalism publications that need pseudonymous mode
  - **Publishers on the "Open" column of opensubscriptionplatforms.com** (WooCommerce, Memberful, Memberstack, Memberspace, Podia) — they have already self-selected for open values on the publisher-data axis; `om` extends that to the subscriber axis. See [docs/COMPETITIVE-LANDSCAPE.md](docs/COMPETITIVE-LANDSCAPE.md) "Two axes of openness."
- Write outreach emails, have calls, understand actual needs
- Pick the best-fit publisher and onboard them with hands-on support
- Target: one publisher in production by end of month 5

**Month 6: First live paying subscriber**

- First real (non-test) subscription through the `om` checkout flow on the production publisher
- Document every bug, every confusing UX moment, every webhook race condition
- Publish the 0.4.1 errata document (`spec/SPEC-ERRATA-0.4.1.md`, already drafted) at the canonical URL

**Phase 2 deliverable:** first production publisher with real paying subscribers; 0.4.1 errata published.

### Phase 3 — Governance and test infrastructure (months 7–9)

Once there's one production deployment, governance conversations get real. Without it, they're speculative.

**Month 7: Custodian outreach**

Order of asks:

1. **Internet Archive** (custodian-first pitch, low procedural overhead, high probability of yes based on mission alignment)
2. **Sovereign Tech Fund** (Germany; they already funded ActivityPub's test suite, precedent exists)
3. **NLnet Foundation** (Netherlands; NGI Zero program is tailor-made for this)
4. **Software Freedom Conservancy** (safe US-based fallback with institutional credibility)

Draft pitches for all four in parallel; send them in sequence a week apart to avoid looking like a shotgun approach.

**Month 8: Grant applications**

Once a custodian says yes (realistically by month 8), file the grant applications in [funding/](funding/). Applications take 2–4 weeks each to write well; do not rush them, and do not send them simultaneously.

**Month 9: Test suite deployment + format-mapping publication**

Test suite + reader harness are scaffolded at `reference/om-test-suite/` (Level 1 tests live, L2/L5 stubbed). Atom + JSON Feed mappings are published at `spec/SPEC-SYNDICATION-MAPPINGS.md`. Remaining operational work:

- Fill in Level 2 and Level 5 tests in the suite
- Deploy the suite at `test.open-membership.org` (or equivalent custodian URL)
- Verify test suite validates feeds in all three syndication formats (RSS, Atom, JSON Feed)
- Publish the Atom + JSON Feed mappings document at the canonical namespace URL

**Phase 3 deliverable:** custodian commitment, grant applications submitted, test suite deployed, syndication mappings published.

### Phase 4 — Second reader, WordPress, and replication (months 10–12)

The goal of Phase 4 is diversifying the implementer base. Two reference implementations from the same author is a suspicious spec; five implementations from four authors is a healthy protocol.

**Month 10: WordPress plugin + Platform Adapter Profile — SHIPPED**

Both deliverables are complete:
- WordPress plugin: `reference/om-wordpress/` (feature-complete)
- Platform Adapter Profile: `spec/SPEC-ADAPTER-PROFILE.md` — validated against WooCommerce + Memberful without rework; the "split the Profile" fallback is not triggered

**Month 11: Second reader + static-site reference**

Second-reader options in priority order:

1. **NetNewsWire fork** (iOS + macOS, native Apple, large user base). Hardest but highest-leverage.
2. **Reeder support** (closed-source but its developer has historically accepted spec-based PRs). Ask first, then decide.
3. **Feeder for Android** (open-source, active maintainer, Android reaches audiences NetNewsWire can't).

Static-site reference is scaffolded at `reference/om-eleventy/` (Eleventy + Cloudflare Workers; feed, discovery, checkout, entitlements, webhook, token routes; tests). Remaining operational work: identify an Eleventy publisher willing to run the reference in production and migrate them.

Owner: a developer with a CDN-edge background, not the Ghost or WordPress engineer.

**Month 12: Publisher replication + federation co-existence**

By end of Phase 4, target five publishers in production. The outreach pattern from Phase 2 repeats but with faster onboarding — the first publisher's experience becomes a public case study, each subsequent publisher takes less hand-holding.

The ActivityPub co-existence appendix is drafted at `spec/SPEC-ACTIVITYPUB.md`. Remaining operational work: review pass with Ghost ActivityPub and Automattic WordPress AP plugin maintainers; land any feedback as appendix v0.2.

**Phase 4 deliverable:** five production publishers, three publisher references (Ghost, WordPress, Eleventy+edge), second reader, Platform Adapter Profile + ActivityPub co-existence appendices.

### Phase 5 — IETF submission prep (months 13–15)

The spec is now running in production at multiple sites, with a working test suite and a neutral custodian. It's ready to be submitted as an Independent Submission to the IETF.

**Month 13: Format conversion + subscriber portability — SHIPPED**

- IETF Internet-Draft: `ietf/draft-om-rss-00.md` (1,926 lines in kramdown-rfc2629; Security / Privacy / IANA / Implementation Status sections written; SPEC §G/§H/Part II deleted per the disposition table)
- Subscriber portability spec: `spec/SPEC-PORTABILITY.md`
- Portability round-trip harness: `reference/om-portability-roundtrip/` (6-credential × 2-envelope + 14 edge-case matrix, runnable)

Remaining operational work: internal editing pass on the IETF draft for final voice; run the round-trip against real Miniflux + NetNewsWire forks once those exist.

**Month 14: External review**

- Post the RFC-format draft on GitHub for public review
- Solicit reviews from at least three implementers and two non-implementers (one security reviewer, one privacy reviewer)
- Incorporate feedback, produce revision -01

**Month 15: Submit to IRSG**

- Submit to the IETF Independent Stream Editor (currently Eliot Lear as of 2026)
- Typical review time: 6–12 months
- During review, the working group continues implementation and errata work; no spec changes allowed unless IRSG requests them

**Phase 5 deliverable:** RFC submitted to the Independent Stream Editor; subscriber portability format shipped and round-trip-verified.

### Phase 6 — 1.0 release and event (months 16–18)

**Month 16: First IndieWebCamp-style event**

- Two-day event, 15–25 people, in person
- Location: probably Amsterdam or Berlin (European center of gravity for `om` given NLnet and Sovereign Tech Fund connections)
- Format: morning demos, afternoon hackathon, evening social

**Month 17: 1.0 errata freeze**

- Close all 0.5 and 0.6 errata
- Publish 1.0 release candidate
- Announce 30-day public comment period

**Month 18: 1.0 released**

- Final 1.0 published at the custodian URL
- Press release to IndieWeb community, Ghost forum, Podcast Index, Hacker News
- Second event scheduled for month 24

**Phase 6 deliverable:** 1.0 released at the custodian URL; first community event held.

## Critical path

The critical path runs through Phase 2 (first outside publisher) and Phase 3 (custodian + test suite). Phases 4, 5, 6 are standard project-management work once those two are done.

The interop-track additions are deliberately off the critical path — each is either spec work that slots alongside implementation, or a small parallel build — so a slip on one does not cascade into Phase 5 or 6.
