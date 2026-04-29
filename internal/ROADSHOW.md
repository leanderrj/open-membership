# Open Membership RSS, Roadshow

The pitch deck in prose form. This document carries the case for `om` as an open standard: the principles the work is built on, the risks named honestly, what shipping 1.0 actually ratifies, and what comes after. For dates, deliverables, and phases, see [ROADMAP.md](ROADMAP.md). For budget, see [funding/](funding/).

## Guiding principles

These are the rules the project is built on. When a decision comes up that isn't covered by a specific milestone, fall back to these.

1. **Working code beats more spec.** After 0.4, every spec change should be triggered by an implementer hitting a concrete problem, not by an author wanting to add a feature.
2. **Implementers over architects.** The working group prioritizes the people shipping code over the people designing the protocol. If one person does both, that's fine, but in the case of disagreement the implementer's perspective wins.
3. **The three personas are the test.** Every decision gets evaluated against: does this help the Substack writer migrating to Ghost, the Patreon podcaster expanding mediums, or the investigative journalism publication that needs pseudonymous mode? If the answer is "none of them," the thing doesn't ship in 1.0.
4. **Indie ecosystem before incumbents.** Don't court Substack, Patreon, Spotify, or Apple. They'll adopt, fork, or ignore; none of those outcomes should be precondition for 1.0.
5. **Governance before scale.** The custodian commitment happens before the protocol has "enough adopters to justify it," because that's exactly the Winer move that saved RSS from UserLand's collapse.
6. **Publish negative results.** When something doesn't work, a publisher drops the spec, a PSP profile breaks, a test fails, write it up publicly. Open protocols accumulate trust through operational honesty, not marketing.

## Risk register

Named risks and mitigations. Funding-related risks live in [funding/](funding/).

**Risk: Ghost plugin takes longer than 3 months.**
- Probability: medium-high. Ghost's plugin architecture is not the deepest in the CMS world.
- Mitigation: aggressive MVP scoping. Level 1 + Level 2 + Stripe-only is acceptable for Phase 1. Everything else can slip to Phase 2.
- Escalation: if month 3 arrives without a working demo, pause outreach and publisher onboarding entirely. The worst outcome is promising a publisher something that doesn't work.

**Risk: First publisher outreach fails.**
- Probability: medium. Publishers are busy; switching infrastructure is risky.
- Mitigation: start outreach in month 4 with 10 candidates, expect 1 yes. If zero yeses by end of month 5, reframe, maybe the pitch is wrong, maybe the publisher persona is wrong.
- Escalation: if no publisher onboards by end of month 6, the spec may need significant simplification. Go back to 0.4, strip features, see if a simpler `om-lite` can get a yes.

**Risk: Custodian says no, then says no, then says no.**
- Probability: low-medium. Four candidates with different angles should produce one yes.
- Mitigation: if all four decline, the fallback is a lightweight foundation modeled on the Podcast Index, one person, one domain, one public Git repo, no institutional overhead. Less durable but workable for 1.0.
- Escalation: if no custodian path exists, delay 1.0 until one does. Don't ratify 1.0 under informal governance.

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

**Risk: Static-site reference (Eleventy + edge) gains no outside maintainer.**
- Probability: medium. A reference implementation with no production user atrophies within a year.
- Mitigation: pick an existing Eleventy-based indie publisher before starting Phase 4 M11; offer to migrate them in exchange for running the reference. Don't build it green-field in isolation.
- Escalation: if no publisher commitment by end of month 10, downgrade M11 to a documentation-only "static-site adapter recipe" and defer the working reference to 1.x.

**Risk: ActivityPub co-existence design stalls on Ghost/WP AP team availability.**
- Probability: medium. Both teams are small and have their own roadmaps; an outside spec's appendix is unlikely to be their priority.
- Mitigation: scope to a non-normative appendix first, so lack of consensus doesn't block 1.0. Offer to host the co-authored drafting session at the IndieWebCamp event in month 16 if async drafting doesn't converge.
- Escalation: if no drafting partner materializes by month 12, ship the appendix as "open question, see §G.2" and let 1.x close it.

**Risk: Anti-sharing primitive lands too early and fragments.**
- Probability: low-medium. If `<om:sharing-policy>` ships in M4 before a real deployment hits the problem, the design will be wrong in the same way pre-deployment specs always are.
- Mitigation: ship the M4 draft as explicitly provisional, clearly marked "subject to errata once persona 2 (podcaster) is in production." Don't promote it to a stable element until at least one publisher has used it in anger.
- Escalation: if the first production podcaster needs a shape the M4 draft didn't anticipate, replace it wholesale in a 0.4.x errata rather than extend it.

**Risk: Platform Adapter Profile fails external validation at M10.**
- Probability: low-medium. Two CMSes (Ghost, WordPress) may have converged on shared assumptions that WooCommerce or Memberful break.
- Mitigation: the validation is the point of running it against WooCommerce and Memberful before finalizing. Rework is cheaper at draft stage than after publication.
- Escalation: if the Profile cannot cover all four without becoming a laundry list, split it into "CMS Profile" and "Commerce-plugin Profile" and accept that one more shape exists in the world.

## What 1.0 ratifies, concretely

By end of month 18, the project owns:

- A frozen spec document at a canonical URL, held by a neutral custodian
- A published RFC (or one in the final stages of IRSG review)
- An open-source publisher test suite + reader conformance harness, both in one repo, that any implementer can run
- At least ten publishers in production across the three personas
- Three reference publisher implementations (Ghost, WordPress, Eleventy + edge)
- Two reference reader implementations (Miniflux, NetNewsWire or equivalent mobile)
- Non-normative appendices covering: Atom + JSON Feed mappings, Platform Adapter Profile, ActivityPub co-existence, subscriber portability format, enclosure auth, and a provisional anti-sharing primitive
- A working group of 5-8 with at least one paid coordinator
- Two events held (month 16, one tentatively scheduled for month 24)
- A public record of errata, fixes, and negative results

That's a protocol. Not a product, not a platform, not a company. The goal is that `om` outlives every current participant by a decade, the way RSS has now outlived its creators.

## What happens after 1.0

Not the 1.0 team's responsibility to specify, but worth flagging:

- Maintenance mode with occasional 1.x errata for compatibility with evolving W3C specs
- Additional PSP binding profiles (Adyen, Paddle, Chargebee) as community submissions
- Additional reader and CMS implementations as community projects
- A 2.0 if and when the ecosystem genuinely needs breaking changes, realistically, not for 3-5 years minimum

The right attitude for the current team after 1.0 is to step back slowly, not step away suddenly. Codify decisions into the test suite and governance docs, make sure the working group survives the departure of any one member, and only then move on.
