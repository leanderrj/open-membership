# Open Membership RSS — Roadmap to 1.0

Eighteen months from spec draft to ratified open standard with multiple production deployments.

## Guiding principles

These are the rules the roadmap is built on. When a decision comes up that isn't covered by a specific milestone, fall back to these.

1. **Working code beats more spec.** After 0.4, every spec change should be triggered by an implementer hitting a concrete problem, not by an author wanting to add a feature.
2. **Implementers over architects.** The working group prioritizes the people shipping code over the people designing the protocol. If one person does both, that's fine, but in the case of disagreement the implementer's perspective wins.
3. **The three personas are the test.** Every decision gets evaluated against: does this help the Substack writer migrating to Ghost, the Patreon podcaster expanding mediums, or the investigative journalism publication that needs pseudonymous mode? If the answer is "none of them," the thing doesn't ship in 1.0.
4. **Indie ecosystem before incumbents.** Don't court Substack, Patreon, Spotify, or Apple. They'll adopt, fork, or ignore; none of those outcomes should be precondition for 1.0.
5. **Governance before scale.** The custodian commitment happens before the protocol has "enough adopters to justify it," because that's exactly the Winer move that saved RSS from UserLand's collapse.
6. **Publish negative results.** When something doesn't work — a publisher drops the spec, a PSP profile breaks, a test fails — write it up publicly. Open protocols accumulate trust through operational honesty, not marketing.

## The 18-month plan

### Phase 1 — Ship something real (months 1–3)

The goal of Phase 1 is a working end-to-end flow on a test Ghost instance, nothing more. Nothing else in the plan matters if Phase 1 slips past month 3. If it does, stop everything else and figure out why.

**Month 1: Ghost plugin v0.1 scaffolding**

- Fork Ghost, add a custom route `/feed/om` using the existing Handlebars template mechanism
- Emit `om` 0.4 namespace declarations, provider URI, and one tier declaration
- Serve `.well-known/open-membership` with minimal required fields
- Integration test: feed validates as well-formed RSS 2.0, discovery document parses as JSON

Owner: one full-time engineer. Budget: €15,000 (1 month at freelance rates).

**Month 2: Stripe integration and entitlements**

- Add Stripe Entitlements feature mapping (`<om:feature>` ↔ Stripe `lookup_key`)
- Implement `/api/checkout` endpoint that creates Stripe Checkout Sessions
- Implement webhook handler for `customer.subscription.created`, `.updated`, `.deleted`, and `charge.dispute.created`
- Issue JWTs carrying `entitlements` claim after successful subscription
- Integration test: test-mode Stripe purchase flow works end-to-end, entitlement JWT validates

Owner: same engineer. Budget: €15,000.

**Month 3: Reader fork + interop test**

- Fork Miniflux, add `om` feed parsing for Levels 1, 2, and 5
- Implement bearer auth token storage scoped per feed
- Implement `<om:offer>` checkout trigger that opens the publisher's checkout URL in system browser
- Integration test: one human subscribes to a test Ghost instance via the forked Miniflux, content unlocks after payment, content locks again after subscription cancellation

Owner: second full-time engineer (overlapping with Month 2). Budget: €30,000 for two months of parallel work.

**Phase 1 total: ~€60,000, 3 engineer-months, one working end-to-end demo.**

### Phase 2 — First outside publisher (months 4–6)

This is the riskiest phase because it depends on someone outside the project saying yes. The work is partially technical (productionizing what Phase 1 built) and partially political (convincing a real publisher to switch).

**Month 4: Production hardening**

- Move from test-mode Stripe to live mode with a real Stripe account
- Set up proper webhook signature verification, idempotency keys, retry-on-failure
- Add Mollie PSP profile (second PSP required by the spec; EU-friendly)
- Security review by an external party (a few days of a competent security consultant)

Budget: €10,000 engineering + €3,000 security consultant.

**Month 5: Publisher outreach and onboarding**

- Identify 10 candidate publishers across the three personas. Priorities:
  - Ghost users currently using FeedPress+Outpost for paid RSS (they've already paid for this; offering them the open version is the easiest pitch)
  - Substack refugees who've migrated to Ghost and are looking for paid-RSS support
  - Small investigative journalism publications that need pseudonymous mode
- Write outreach emails, have calls, understand actual needs
- Pick the best-fit publisher and onboard them with hands-on support
- Target: one publisher in production by end of month 5

Budget: mostly time rather than money, estimate €5,000 equivalent.

**Month 6: First live paying subscriber**

- First real (non-test) subscription through the `om` checkout flow on the production publisher
- Document every bug, every confusing UX moment, every webhook race condition
- Ship a 0.4.1 errata release with whatever the production deployment surfaced

Phase 2 total: ~€18,000 + the biggest single political win of the whole project.

### Phase 3 — Governance and funding (months 7–9)

Once there's one production deployment, governance conversations get real. Without it, they're speculative.

**Month 7: Custodian outreach**

Order of asks:

1. **Internet Archive** (custodian-first pitch, low procedural overhead, high probability of yes based on mission alignment)
2. **Sovereign Tech Fund** (Germany; they already funded ActivityPub's test suite, precedent exists)
3. **NLnet Foundation** (Netherlands; NGI Zero program is tailor-made for this)
4. **Software Freedom Conservancy** (safe US-based fallback with institutional credibility)

Draft pitches for all four in parallel; send them in sequence a week apart to avoid looking like a shotgun approach. Budget: just time — a week of writing.

**Month 8: Funded engineer**

Once a custodian says yes (realistically by month 8), file the first grant application:

- **Sovereign Tech Fund application** for test suite development (€80,000 over 12 months; matches scale of their ActivityPub grant)
- **NLnet NGI Zero application** for continued Ghost plugin development (€50,000 over 9 months; within their typical grant size)

These are not mutually exclusive; they fund different things. Applications take 2–4 weeks each to write well.

**Month 9: Test suite v1**

While funding is in flight, build the test suite v1 covering Levels 1, 2, 5. The suite is a standalone HTTP service that takes a feed URL and produces a pass/fail report. Deploy at `test.open-membership.org` or equivalent.

Budget (pre-grant): ~€15,000 for 1 engineer-month.

Phase 3 total: ~€15,000 + governance commitments + grant applications submitted.

### Phase 4 — Second reader, WordPress, and replication (months 10–12)

The goal of Phase 4 is diversifying the implementer base. Two reference implementations from the same author is a suspicious spec; five implementations from four authors is a healthy protocol.

**Month 10: WordPress plugin**

Fork an existing WordPress membership plugin (Paid Memberships Pro is the best candidate — large active user base, clean plugin API, community familiar with subscription mechanics). Add `om` feed emission and discovery document.

Owner: a WordPress developer, ideally not the same person as the Ghost engineer. The point is to stress-test the spec against a second implementer's instincts.

Budget: €20,000–€30,000 depending on WordPress plugin complexity.

**Month 11: Second reader**

Options in priority order:

1. **NetNewsWire fork** (iOS + macOS, native Apple, large user base). Hardest but highest-leverage.
2. **Reeder support** (closed-source but its developer has historically accepted spec-based PRs). Ask first, then decide.
3. **Feeder for Android** (open-source, active maintainer, Android reaches audiences NetNewsWire can't).

Budget: €20,000 for either 1 or 3.

**Month 12: Publisher replication**

By end of Phase 4, target five publishers in production. The outreach pattern from Phase 2 repeats but with faster onboarding — the first publisher's experience becomes a public case study, each subsequent publisher takes less hand-holding.

Phase 4 total: ~€45,000 + five production publishers.

### Phase 5 — IETF submission prep (months 13–15)

The spec is now running in production at multiple sites, with a working test suite and a neutral custodian. It's ready to be submitted as an Independent Submission to the IETF.

**Month 13: Format conversion**

- Convert the Markdown spec to IETF-standard XML (xml2rfc) or RFC-ready Markdown (kramdown-rfc)
- Write required sections that are missing: Security Considerations, IANA Considerations, Implementation Status
- Internal editing pass for IETF editorial voice

Budget: €8,000 (a few weeks for a technical writer familiar with IETF conventions).

**Month 14: External review**

- Post the RFC-format draft on GitHub for public review
- Solicit reviews from at least three implementers and two non-implementers (one security reviewer, one privacy reviewer)
- Incorporate feedback, produce revision -01

Budget: mostly volunteer time, estimate €3,000 equivalent for paid reviews.

**Month 15: Submit to IRSG**

- Submit to the IETF Independent Stream Editor (currently Eliot Lear as of 2026)
- Typical review time: 6–12 months
- During review, the working group continues implementation and errata work; no spec changes allowed unless IRSG requests them

Phase 5 total: ~€11,000 + an RFC in the queue.

### Phase 6 — 1.0 release and event (months 16–18)

**Month 16: First IndieWebCamp-style event**

- Two-day event, 15–25 people, in person
- Location: probably Amsterdam or Berlin (European center of gravity for `om` given NLnet and Sovereign Tech Fund connections)
- Format: morning demos, afternoon hackathon, evening social
- Budget: €8,000–€15,000 for venue, food, travel subsidies for implementers who can't self-fund

**Month 17: 1.0 errata freeze**

- Close all 0.5 and 0.6 errata
- Publish 1.0 release candidate
- Announce 30-day public comment period

**Month 18: 1.0 released**

- Final 1.0 published at the custodian URL
- Press release to IndieWeb community, Ghost forum, Podcast Index, Hacker News
- Second event scheduled for month 24

Phase 6 total: ~€15,000 + 1.0 released.

## Total budget

Approximate totals across all phases: **~€165,000** in direct engineering/event spend, **~€130,000 in matching grants secured** (Sovereign Tech Fund + NLnet), and **some unpaid volunteer time** from the working group.

The critical path runs through Phase 2 (first outside publisher) and Phase 3 (custodian + funding). Phases 4, 5, 6 are standard project-management work once those two are done.

## Risk register

Named risks and mitigations.

**Risk: Ghost plugin takes longer than 3 months.**
- Probability: medium-high. Ghost's plugin architecture is not the deepest in the CMS world.
- Mitigation: aggressive MVP scoping. Level 1 + Level 2 + Stripe-only is acceptable for Phase 1. Everything else can slip to Phase 2.
- Escalation: if month 3 arrives without a working demo, pause outreach and publisher onboarding entirely. The worst outcome is promising a publisher something that doesn't work.

**Risk: First publisher outreach fails.**
- Probability: medium. Publishers are busy; switching infrastructure is risky.
- Mitigation: start outreach in month 4 with 10 candidates, expect 1 yes. If zero yeses by end of month 5, reframe — maybe the pitch is wrong, maybe the publisher persona is wrong.
- Escalation: if no publisher onboards by end of month 6, the spec may need significant simplification. Go back to 0.4, strip features, see if a simpler `om-lite` can get a yes.

**Risk: Custodian says no, then says no, then says no.**
- Probability: low-medium. Four candidates with different angles should produce one yes.
- Mitigation: if all four decline, the fallback is a lightweight foundation modeled on the Podcast Index — one person, one domain, one public Git repo, no institutional overhead. Less durable but workable for 1.0.
- Escalation: if no custodian path exists, delay 1.0 until one does. Don't ratify 1.0 under informal governance.

**Risk: Grant applications rejected.**
- Probability: medium. These grants are competitive; rejection isn't a signal of quality.
- Mitigation: apply to all three (Sovereign Tech Fund, NLnet, Stripe Open Source). Expect one yes.
- Escalation: the project can survive on volunteer labor for months 7–15 if needed, but the IETF submission and second reader work become considerably slower.

**Risk: Key crypto suite (`bbs-2023`) doesn't advance to Recommendation on schedule.**
- Probability: low-medium. W3C timelines slip regularly.
- Mitigation: OM-VC-SD 1.0 can track the CR version. If major breaking changes happen, release OM-VC-SD 1.1 as an errata and document the migration path.
- Escalation: if BBS+ is abandoned (unlikely, but possible), fall back to SD-JWT for selective disclosure. OM-VC-SD 1.0 becomes a deprecated profile.

**Risk: Substack or Patreon announces competing open standard.**
- Probability: low. These companies benefit from proprietary moats; an open standard is against their interests.
- Mitigation: if it happens, evaluate technical merit honestly. If their spec is better, adopt it. If ours is better and already in production at five sites, continue. Don't compete on marketing.
- Escalation: genuine fork scenarios are 1.x work, not 1.0 work.

**Risk: An adversarial actor (large podcast app, large reader) implements `om` poorly and claims conformance without passing the test suite.**
- Probability: medium-long-term. Almost inevitable if `om` reaches any scale.
- Mitigation: the test suite publishes certification results publicly. The governance process (via the custodian) handles "claims conformance but fails suite" cases by listing the failing implementation on a public page.
- Escalation: this is a post-1.0 problem but the enforcement machinery should be drafted before 1.0.

## What 1.0 ratifies, concretely

By end of month 18, the project owns:

- A frozen spec document at a canonical URL, held by a neutral custodian
- A published RFC (or one in the final stages of IRSG review)
- An open-source test suite that any implementer can run
- At least ten publishers in production across the three personas
- Two reference publisher implementations (Ghost, WordPress)
- Two reference reader implementations (Miniflux, NetNewsWire or equivalent mobile)
- A working group of 5–8 with at least one paid coordinator
- Two events held (month 16, one tentatively scheduled for month 24)
- A public record of errata, fixes, and negative results

That's a protocol. Not a product, not a platform, not a company. The goal is that `om` outlives every current participant by a decade, the way RSS has now outlived its creators.

## What happens after 1.0

Not the 1.0 team's responsibility to specify, but worth flagging:

- Maintenance mode with occasional 1.x errata for compatibility with evolving W3C specs
- Additional PSP binding profiles (Adyen, Paddle, Chargebee) as community submissions
- Additional reader and CMS implementations as community projects
- A 2.0 if and when the ecosystem genuinely needs breaking changes — realistically, not for 3–5 years minimum

The right attitude for the current team after 1.0 is to step back slowly, not step away suddenly. Codify decisions into the test suite and governance docs, make sure the working group survives the departure of any one member, and only then move on.
