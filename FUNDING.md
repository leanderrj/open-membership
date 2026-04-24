# Budget & Funding

Where the money goes (budget below) and where it comes from (grant pitches further down). The [ROADMAP](ROADMAP.md) is spec and technical milestones only; the financial dimension lives here.

---

## Budget

Direct engineering and event spend across the 18-month roadmap, by phase. All figures are approximate and in euros unless noted.

### Phase 1 — Ship something real (months 1–3)

| Month | Work | Effort | Cost |
|---|---|---|---|
| M1 | Ghost plugin v0.1 scaffolding | 1 engineer-month | €15,000 |
| M2 | Stripe integration and entitlements | 1 engineer-month | €15,000 |
| M3 | Miniflux reader fork (overlapping M2) | 2 engineer-months parallel | €30,000 |
| | **Phase 1 total** | **3 engineer-months** | **€60,000** |

### Phase 2 — First outside publisher (months 4–6)

| Month | Work | Cost |
|---|---|---|
| M4 | Production hardening (Stripe live, Mollie PSP, webhook hardening) | €10,000 |
| M4 | External security review (few days of a consultant) | €3,000 |
| M4 | i18n (`tax_inclusive` on `<om:price>`) + anti-sharing primitive v0 | €4,000 |
| M5 | Publisher outreach and onboarding (mostly time) | €5,000 equivalent |
| M6 | First live paying subscriber + 0.4.1 errata (rolled into M4/M5 spend) | — |
| | **Phase 2 total** | **~€22,000** |

### Phase 3 — Governance and test infrastructure (months 7–9)

| Month | Work | Cost |
|---|---|---|
| M7 | Custodian outreach (time only, pre-grant) | — |
| M8 | Grant applications (time only, 2–4 weeks per application) | — |
| M9 | Publisher test suite v1 | €15,000 |
| M9 | Reader conformance harness | €10,000 |
| M9 | Atom + JSON Feed appendix work | €3,000 |
| | **Phase 3 total (pre-grant)** | **~€28,000** |

### Phase 4 — Second reader, WordPress, and replication (months 10–12)

| Month | Work | Cost |
|---|---|---|
| M10 | WordPress plugin | €20,000–€30,000 |
| M10 | Platform Adapter Profile (incl. WooCommerce + Memberful validation passes) | €6,000 |
| M11 | Second reader (NetNewsWire fork or Feeder for Android) | €20,000 |
| M11 | Static-site reference (Eleventy + Cloudflare Workers) | €12,000 |
| M12 | Publisher replication (outreach + onboarding time) | included in M5 cadence |
| M12 | ActivityPub co-existence appendix (coordination + writing) | €5,000 |
| | **Phase 4 total** | **~€68,000** |

### Phase 5 — IETF submission prep (months 13–15)

| Month | Work | Cost |
|---|---|---|
| M13 | Markdown-to-IETF format conversion (technical writer) | €8,000 |
| M13 | Subscriber portability format (spec + Miniflux↔NetNewsWire round-trip proof) | €3,000 |
| M14 | External review (security + privacy reviewers) | €3,000 |
| M15 | IRSG submission (time only) | — |
| | **Phase 5 total** | **~€14,000** |

### Phase 6 — 1.0 release and event (months 16–18)

| Month | Work | Cost |
|---|---|---|
| M16 | First IndieWebCamp-style event (venue, food, travel subsidies) | €8,000–€15,000 |
| M17 | 1.0 errata freeze and RC (rolled into working-group time) | — |
| M18 | 1.0 released (press + comms) | rolled in |
| | **Phase 6 total** | **~€15,000** |

### Total

- **Direct engineering and event spend:** ~€205,000 (including ~€40,000 of interop-track work distributed across Phases 2–5)
- **Matching grants secured:** ~€130,000 target (Sovereign Tech Fund + NLnet — see pitches below)
- **Volunteer time:** working group members, reviewers, event attendees

The critical path runs through Phase 2 (first outside publisher) and Phase 3 (custodian + test infrastructure). The interop-track additions are deliberately off the critical path.

### Funding risk

**Risk: Grant applications rejected.**
- Probability: medium. These grants are competitive; rejection isn't a signal of quality.
- Mitigation: apply to all three (Sovereign Tech Fund, NLnet, Stripe Open Source). Expect one yes.
- Escalation: the project can survive on volunteer labor for months 7–15 if needed, but the IETF submission and second reader work become considerably slower. See "What if all three say no" at the end of this document.

---

## Funding pitches

Three grant applications, each targeting a different funder with a different angle on the same protocol. Send in sequence about a week apart. Expect one yes, plan for two nos.

---

## Pitch 1: Sovereign Tech Fund (Germany)

**Target program:** Sovereign Tech Agency (part of Sovereign Tech Fund)
**Ask:** €80,000 over 12 months
**What it funds:** Interoperability test suite development and maintenance
**Precedent:** €152,000 grant to socialweb.coop in 2023 for ActivityPub test infrastructure

### Pitch summary (200 words)

The Open Membership RSS specification defines an open standard for paid, tiered, and privacy-preserving content subscriptions on top of RSS. The specification is complete at version 0.4; the gap is interoperability testing.

Proprietary platforms (Substack, Patreon, Apple Podcasts Subscriptions) each solve paid-content delivery within their own walled gardens. FeedPress and Outpost sell a bespoke Ghost-compatible version starting at ~€20/publisher/month. Investigative journalism publications like 404 Media are real paying customers. But none of these interoperate, and their collective existence confirms that the technical approach works.

An open standard without an open test suite is not credible. We are requesting funding for the development, hosting, and 12-month maintenance of an interoperability test suite — the same role socialweb.coop plays for ActivityPub. The suite tests all eight conformance levels of the specification across publisher implementations (Ghost, WordPress), reader implementations (Miniflux, NetNewsWire), and payment service providers (Stripe, Mollie).

This is sovereign infrastructure: an open protocol that lets independent publishers conduct paid-content business without depending on any single company. The test suite is the artifact that makes "this protocol is real" an auditable claim rather than a marketing one.

### Budget breakdown

- Engineering (test suite development): €50,000 (6 engineer-months at ~€8,300/month)
- Hosting and operations: €6,000 (12 months × €500/month for hosted test service)
- Security audit: €8,000 (one round by an external firm)
- Documentation and integration guides: €8,000
- Contingency / maintenance reserve: €8,000

Total: €80,000.

### Why Sovereign Tech Fund specifically

Four reasons this fits the Fund's mandate directly:

1. **Infrastructure, not applications.** The Fund exists to support the open-source backbone of the digital commons. Open Membership RSS is plumbing for federated paid content — closer to how RFC 9728 is plumbing for OAuth than how Mastodon is an application. The test suite specifically is infrastructure.
2. **Clear precedent.** The 2023 ActivityPub testing grant is the most directly analogous prior Fund decision. Same category (open-protocol test infrastructure), similar scope, similar funding level.
3. **German publishers benefit directly.** Independent German-language publications (Übermedien, Krautreporter, and others in the Steady ecosystem) stand to gain from an open alternative to Substack and Patreon. German journalism funding bodies have been actively interested in Substack-alternative infrastructure.
4. **EU digital sovereignty context.** Reducing dependency on US platforms (Substack, Patreon, Apple) for journalism's subscription infrastructure is explicitly within the political frame the Fund operates in.

### Deliverables

- **Month 3:** Test suite v1.0 covering Levels 1, 2, 5 — the Indie Reader profile
- **Month 6:** Test suite v1.1 covering Levels 3, 4 — adds OAuth bearer auth and OM-VC 1.0 verification
- **Month 9:** Test suite v2.0 covering Levels 6, 7, 8 — value-for-value, privacy mode, bundles
- **Month 12:** Public certification program live, first ten implementations certified, maintenance documentation transferred to the working group's custodian

### What you get

Public attribution on the test suite homepage and every certification result. A biannual public report on ecosystem health (how many implementations, how many certification passes, errata filed). Your name on the published RFC as an acknowledged funder.

---

## Pitch 2: NLnet Foundation (Netherlands)

**Target program:** NGI Zero Commons Fund or NGI Zero Core
**Ask:** €50,000 over 9 months
**What it funds:** Reference implementation development (Ghost plugin + reader fork)
**Precedent:** Hundreds of small open-source protocol projects funded at this scale; this is exactly their typical grant shape

### Pitch summary (200 words)

Open Membership RSS is an open-spec extension to RSS for paid, tiered, time-gated, group-shared, and privacy-preserving content. The specification (0.4 draft) composes with existing W3C and IETF standards (Verifiable Credentials 2.0, RFC 9728 OAuth Protected Resource Metadata, the W3C BBS+ cryptosuite). What it needs to reach production maturity is reference implementations.

We are requesting funding for two reference implementations: (a) `om-ghost`, a plugin for the Ghost CMS that lets any Ghost publisher serve paid RSS feeds to any standard RSS reader; and (b) a fork of the Miniflux RSS reader that implements the consumer side of the protocol.

Ghost is the right publisher target because an independent publisher (404 Media, run by veterans of Vice's technology coverage) already proved the demand by paying two separate companies (FeedPress and Outpost) to build a proprietary version in 2024. We are building the open-source interoperable alternative.

The two implementations must be written by independent developers to demonstrate the protocol's portability. Once deployed, they enable a class of publisher (investigative journalism, niche commentary, specialist education) to operate subscription businesses without depending on Substack, Patreon, or Apple.

### Budget breakdown

- `om-ghost` plugin development: €30,000 (4 engineer-months)
- Miniflux reader fork: €15,000 (2 engineer-months)
- Integration testing, documentation, first publisher deployment: €5,000

Total: €50,000.

### Why NLnet specifically

1. **Program fit.** NGI Zero Commons and NGI Zero Core explicitly fund "the open internet, open standards, privacy-preserving and decentralized technologies." Open Membership RSS is all four.
2. **Typical grant size and duration.** €50,000 / 9 months matches NLnet's standard grant shape. Not asking for something exceptional.
3. **Stackable with other grants.** NLnet explicitly supports receiving funding from multiple sources; the Sovereign Tech Fund test-suite ask is non-overlapping (they fund test infrastructure; you fund reference code).
4. **Alignment with NLnet's philosophy.** NLnet funds protocols that strengthen user agency. Open Membership RSS makes subscriber identity portable and publisher dependence on platforms optional. Both are direct user-agency wins.

### Deliverables

- **Month 3:** `om-ghost` v0.1 running against a test Ghost instance, emitting valid `om` 0.4 feeds
- **Month 5:** Miniflux fork parsing `om` feeds, completing Stripe checkout flow, rendering gated content
- **Month 7:** First publisher in production on `om-ghost`, with a real paying subscriber using the Miniflux fork
- **Month 9:** Both implementations certified at the relevant conformance levels by the test suite (see Sovereign Tech Fund grant), public documentation published, code transferred to working group custodian

### Open-source commitments

Both implementations released under permissive licenses (MIT for `om-ghost`, Apache 2.0 for the Miniflux fork). No CLA required from contributors. Code hosted under the working group's Git organization; after custodian commitment (month 7), ownership transfers to the custodian.

All protocol design changes surfaced during implementation are published as errata on a public issue tracker. No private fork, no hidden improvements.

---

## Pitch 3: Stripe Open Source Program

**Target program:** Stripe Open Source Program (informal; individual sponsorship via Stripe developer relations)
**Ask:** $25,000 over 12 months or individual engineer time contribution
**What it funds:** PSP binding profile maintenance and Stripe-specific reference code

### Pitch summary (150 words)

Open Membership RSS is an open standard for paid content subscriptions on top of RSS. Stripe is the reference payment service provider in the specification, with a fully-specified binding profile using Stripe Entitlements, Stripe Checkout Sessions, and Stripe webhooks.

The spec treats Stripe as the default, most-featured binding. Alternative PSPs (Mollie, PayPal, Adyen) are supported but get simpler bindings because they lack Stripe's native Entitlements feature.

We are requesting either a $25,000 Stripe Open Source grant or equivalent engineer time to keep the Stripe binding profile current with Stripe's API evolution, maintain reference code in `om-ghost`, and serve as the technical liaison between the Open Membership working group and Stripe's Developer Relations team.

This is strategic sponsorship for Stripe: the protocol makes Stripe the default commerce layer for an entire open ecosystem of paid content. Every publisher who adopts `om` becomes a Stripe customer.

### Why this is defensible for Stripe

1. **Commerce moat protection.** If Stripe is the reference PSP in a successful open protocol, new entrants to Stripe's market (Mollie, Adyen, Paddle) have to match the Stripe binding rather than define their own. Stripe maintains first-mover standardization advantage.
2. **New customer acquisition.** Every publisher who leaves Substack for a self-hosted stack running `om` needs a Stripe account. Substack's underlying Stripe volume doesn't transfer; new merchants sign up directly.
3. **Developer relations pattern match.** Stripe has funded open-source protocol work before (OpenAPI, TypeScript tooling, various webhook-related IETF drafts). This is the same shape at a smaller scale.
4. **Low risk.** $25,000 is below the threshold that requires Stripe executive approval; a single DX team manager can fund it out of a discretionary budget.

### The ask in more concrete terms

Either:

**(a) Cash grant:** $25,000 to the working group's fiscal sponsor (either the custodian or an existing open-source fiscal sponsor like Open Collective). Funds support ~3 engineer-months of Stripe-binding-specific maintenance, test fixture updates, documentation.

**(b) Engineer time:** A Stripe engineer contributes 10 hours/month for 12 months as a public open-source contribution. Same effective value, different accounting path. Also creates an official "Stripe endorses this binding" signal that a cash grant doesn't.

**(c) Both:** Nothing in Stripe's program prevents both paths; cash for maintenance, engineer hours for feature reviews. This is the ideal outcome.

### What we don't ask for

No press release, no Stripe logo in `om` marketing materials, no exclusivity. The spec stays provider-agnostic; Stripe just happens to have the best-developed binding because Stripe has the richest API. If Mollie, Adyen, or Paddle later contribute equivalent engineering time to their own bindings, the spec treats their contributions with equal weight.

### Deliverables

- Continuously-updated Stripe binding profile tracking Stripe API releases
- Reference code in `om-ghost` that uses Stripe Entitlements end-to-end, following Stripe's current best practices
- Public conformance test suite results for the Stripe binding
- One blog post on Stripe's developer blog describing the integration (optional, good for adoption)

---

## Funding strategy summary

| Funder | Ask | Focus | Timeline | Probability of yes |
|---|---|---|---|---|
| Sovereign Tech Fund | €80,000 | Test suite | 12 months | Medium-high (clear precedent) |
| NLnet NGI Zero | €50,000 | Reference implementations | 9 months | Medium (typical grant shape) |
| Stripe Open Source | $25,000 or equivalent | Stripe binding | 12 months | Low-medium (requires DevRel relationship) |

Total if all three succeed: ~€155,000 + Stripe engineer time. That covers approximately 70% of the roadmap's 18-month budget. The remaining 30% can come from:

- Publisher contributions (publishers who adopt `om` often want to fund its development; 404 Media's Jason Koebler stated publicly that paying for the FeedPress/Outpost integration was worth it for them)
- Smaller journalism-focused grants (Knight Foundation's Knight Futures Lab, the Open Technology Fund's Dynamic Infrastructure Fund)
- Individual donations via Open Collective or equivalent

The most important thing: **don't apply for all of these at once**. Sequence them. Each application takes 2–4 weeks to write well; rushing one because you sent it alongside another is the fastest way to get three nos. Sovereign Tech Fund first (precedent is strongest). NLnet second, 3–4 weeks later (benefits from citing "Sovereign Tech Fund application in review" in the submission). Stripe last, with a working `om-ghost` demo in hand.

## What if all three say no

The project is not dead. The work moves slower and relies more on volunteer time. The test suite ships later. Reference implementations get built in fits and starts. 1.0 slips to month 24 rather than month 18.

Three specific fallbacks:

1. **Individual donations via Open Collective.** The combined journalist/RSS-enthusiast community is small but motivated. A $10,000–$30,000 annual donor base is plausible if the project has a public face and a visible roadmap.
2. **Publisher-sponsored development.** Ask the three personas directly. "We need $5,000 to build the Stripe binding, would you sponsor it in exchange for early access?" Cold but honest; some publishers will say yes.
3. **Volunteer-only with slower timeline.** If funding is impossible, the roadmap still works, just stretched. A volunteer-only project might take 3 years to 1.0 rather than 18 months. Not fatal, just slower.

The project survives any single funding rejection. What it does not survive is trying to scale up faster than its funding allows; that's the failure mode that kills most open-source protocols.
