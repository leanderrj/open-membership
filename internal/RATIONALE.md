# Project Rationale

Notes on the institutional and strategic choices made for the 0.5 cycle of Open Membership RSS. This document is internal: it explains why the technical decisions in `SPEC.md` are what they are, and how the project intends to reach 1.0. None of it is normative.

## 1. Custodianship

Before 1.0, the specification needs a neutral home. Candidate custodians, in the order to approach:

1. **Internet Archive.** Mission-aligned; has hosted similar specs; low political overhead.
2. **NLnet Foundation.** Already funds open-internet infrastructure; custodian role is adjacent to existing programs.
3. **Software Freedom Conservancy.** Boring, durable, the safest option. Highest procedural cost.
4. **A new lightweight foundation modeled on Podcast Index.** Best fit philosophically; highest setup cost. Reserved as a fallback if all of the above decline.

The custodian's role is narrow: hold the namespace URI and the canonical specification text, host the test suite, and act as a point of escalation if the working group dissolves. The custodian is not expected to fund or staff the working group.

## 2. Working group composition

A 5-8 person working group of which at least one member is funded part-time:

- Two from independent-publisher backgrounds (Ghost or Substack-refugee newsletter operators).
- Two from reader-app backgrounds (Miniflux, NetNewsWire, Inoreader).
- One from the W3C VC working group orbit, for the OM-VC-SD work.
- One from the Podcasting 2.0 community, for `podcast:value` coexistence.
- One paid coordinator.

Funding for the coordinator is the single most important piece. NLnet's NGI Zero programs are the right shape: small grants, multi-year, mission-aligned, no equity. The Sovereign Tech Fund is a secondary target with precedent (a 2023 grant of €152,000 to socialweb.coop for ActivityPub interoperability testing).

## 3. RFC submission

The specification is intended for IETF Independent Submission, not Standards Track. Independent Submissions yield an RFC number without requiring a working-group charter or vendor consensus, which matches the position of a specification with multiple deployments but no incumbent industry sponsor. The original RSS specifications followed an analogous path via Resource.org and the W3C purl space.

Submission package required:

- A clean specification document in IETF format (mostly mechanical conversion from the current Markdown).
- An Implementation Status section listing the reference implementations and any other deployments.
- A Security Considerations section addressing token theft, credential replay, revocation race conditions, and the privacy limits acknowledged in `SPEC.md` §10.
- An IANA Considerations section requesting registration of the namespace URI and the `.well-known` suffix.

Submission goes to the Independent Stream Editor (currently Eliot Lear); review timeline is typically 6-12 months.

## 4. The 0.5 sequence

If the 0.5 cycle were sequenced strictly:

- **Months 1-2:** `om-ghost` plugin development. Nothing else matters until a real publisher can ship.
- **Months 2-3:** Miniflux fork in parallel; first end-to-end interop test by month 3.
- **Months 3-4:** Test suite v1, covering at minimum the Indie Reader profile.
- **Months 4-5:** First non-affiliated publisher onboarded.
- **Months 5-6:** Custodian conversation, working group formation, NLnet application.
- **Months 6-9:** WordPress port, NetNewsWire fork, second non-affiliated publisher, RFC submission package.

By month 9 the criteria for 1.0 should be in sight: two reference implementations, a working test suite, three or more independent publishers, a neutral custodian commitment, a funded coordinator, and an RFC in the submission queue.

## 5. Out of scope for 0.5

Recorded so the discipline is visible:

- **No new tags.** A missing primitive surfaces an issue for 1.0; it is not silently added to 0.5.
- **No new PSP profiles.** Stripe and Mollie cover the bulk of the addressable publisher population. Adyen, Paddle, and Chargebee are 1.x work.
- **No new credential profiles.** OM-VC 1.0 and OM-VC-SD 1.0 are sufficient.
- **No "Open Membership Foundation."** Premature institutionalisation is what kills small protocols. The custodian arrangement above is sufficient governance for 1.0.

## 6. Failure modes to watch

- **Specification-tinkering procrastination.** Drafting 0.6 because implementations are slow. The correct response to a slow implementation is to assist the implementer, not to extend the specification.
- **Premature platform engagement.** Approaches from incumbents during the 0.5 cycle invite design pressure away from the indie-publisher fit. Defer such conversations until after 1.0.
- **Cryptosuite churn.** `bbs-2023` is at Candidate Recommendation. If the W3C process re-opens substantive issues and the cryptosuite changes, OM-VC-SD 1.0 will need a corresponding point release. The W3C VC WG mailing list is the canonical channel to monitor.

## 7. Lessons from other open specifications

### 7.1 Podcasting 2.0

The closest analog. The Podcast Index team added a namespace to RSS, hosted it independently, and let the indie ecosystem adopt it before the incumbents. Adoption of `podcast:transcript` and `podcast:chapters` is broad; `podcast:value` is narrower because it is Lightning-only. The lesson for this project is the multi-PSP design: open-membership commerce primitives must accommodate fiat rails alongside Lightning, since the bulk of subscription revenue still flows through fiat. The Podcast Index governance shape (small team, public artifact, indie-first) is the model to copy.

### 7.2 ActivityPub

ActivityPub is structurally a successful open protocol but is silent on monetization, which has produced a fragmentation of bespoke per-server payment integrations. This specification is the explicit answer for paid content. ActivityPub has also demonstrated that test infrastructure for a serious open protocol must be funded work rather than volunteer work.

### 7.3 OpenID Connect

OIDC took roughly four years from initial work (2010) to final specification (2014) and another five years to dominance. Reference implementations (Auth0, Okta, AWS Cognito) drove adoption more than the specification itself; OpenID Foundation's self-certification process is what made "compliant" mean something to enterprise procurement. The `om-test-suite` is the analogous artifact for this specification.

### 7.4 Signal Protocol

Technically excellent and effectively a closed ecosystem because there is no registry, no discovery, and the reference implementation is also a service. The `.well-known/open-membership` document and the test-suite-as-artifact (rather than test-suite-as-service) directly address both failure modes.

### 7.5 IndieWeb

Webmention, Micropub, and IndieAuth show that small-scale open-web protocols can sustain multi-implementation deployments over a decade. The IndieWebCamp model (twice-yearly small in-person events where implementers gather and propose changes face-to-face) is the right shape for the 0.5-1.0 cycle.

### 7.6 RSS itself

RSS won on four properties, three of which are within this project's control:

- **Simplicity.** The full specification is on the order of 600 lines of Markdown; a competent developer can implement Level 5 in a week. Every errata that adds complexity is a tax on adoption.
- **Custodian transfer before it matters.** Winer transferred RSS ownership to Harvard before the specification was popular enough to need governance. Section 1 above is the analogous step.
- **Intentional implementation diversity.** Multiple reference implementations with deliberately different design choices, within the bounds the specification permits.

The fourth property, the orange icon, is a visual-identity question deferred until 1.0.
