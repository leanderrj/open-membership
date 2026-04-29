# NLnet, NGI Zero Commons Fund application

**Programme:** NGI Zero Commons Fund
**Submission URL:** https://nlnet.nl/propose
**Next deadline:** 1 June 2026, 12:00 CEST
**Ask:** €50,000 over 9 months
**Status:** ready to submit; needs fiscal sponsor confirmed and final contact name filled in below

---

The NLnet form is short, under ten fields. Each section below maps to a field on the form. The text is the text to paste in. Character limits noted where they apply.

## Project name

Open Membership RSS

## Project website

https://openmembership.org

Repository: https://github.com/leanderrj/open-membership

## Abstract (max 1200 characters)

Open Membership RSS (`om`) is a small, namespaced extension to RSS that lets any publisher charge for content and any reader unlock it, without depending on Substack, Patreon, or a closed CMS. Three moving parts: a few namespaced elements in an existing RSS feed, a `.well-known/open-membership` discovery document, and a credential the publisher issues at checkout (URL token, OAuth bearer, or W3C Verifiable Credential).

The proprietary version of this already works. FeedPress and Outpost run paid RSS for Ghost publishers; 404 Media and Aftermath are live paying customers. What the open web is missing is interoperability, a feed shape, a discovery document, and a token contract that any publisher and any reader can implement without per-vendor negotiation.

The spec is feature-frozen at 0.4. We are asking NLnet to fund the two reference implementations that take it from a document to a working protocol: `om-ghost` (a plugin for the most-used indie-publisher CMS) and a fork of Miniflux (the reference reader). One year, two implementations, first paying subscriber.

## Have you been involved with NGI/NLnet before?

No. *(adjust if applicable; if a working-group member has had prior NGI funding for an unrelated project, name it here.)*

## Requested amount

€50,000

## Explain what is open source / free software in your project (max 2500 characters)

Everything is openly licensed. The specification text is CC-BY-4.0 (`LICENSE-SPEC` in the repository). All code, including the reference implementations this grant funds, is MIT (`LICENSE`).

Specifically:

- The Open Membership RSS specification (currently 0.4 draft, ~830 lines of normative prose) sits in the public repository under CC-BY-4.0. The companion specs, Atom/JSON Feed mappings, ActivityPub co-existence, subscriber portability, the platform adapter profile, and 0.4.1 errata, are licensed the same way.
- The XML namespace `http://purl.org/rss/modules/membership/` is hosted at purl.org and is not subject to copyright; anyone can implement against it without permission.
- `om-ghost`, the Ghost plugin this grant funds, is published as MIT-licensed source code in the project repository. No CLA is required from contributors.
- The Miniflux fork this grant funds is published under Apache 2.0 (matching upstream Miniflux's license).
- All issues, errata, and design decisions are public on the project's issue tracker. There is no private fork and no held-back "premium" version.
- After the working group's custodian commitment lands (Phase 3 of our roadmap, currently scheduled M7-M9), ownership of both repositories transfers to that custodian. The four candidate custodians, in priority order, are the Internet Archive, Sovereign Tech Fund, NLnet itself, and Software Freedom Conservancy.

The protocol composes with existing W3C and IETF standards: RFC 9728 (OAuth Protected Resource Metadata) for discovery, W3C Verifiable Credentials 2.0 for the privacy-preserving credential profile, the W3C `bbs-2023` BBS+ cryptosuite for selective disclosure, and the W3C Bitstring Status List for revocation. None of these are forks; we use the published versions and contribute back any errata we find.

The license choices are deliberate. CC-BY-4.0 on the spec means anyone can reprint, translate, or remix it, including for commercial use. MIT on the code means a Ghost host or a reader-app vendor can integrate `om-ghost` into a commercial offering without asking. The spec wins by being adopted, not by being protected.

## Tasks (numbered list with deliverables and budget per task)

The grant covers four tasks across nine months. Each has a concrete deliverable a reviewer can check. The budget split is engineering-heavy because the spec is already written; what's missing is working code.

**Task 1, `om-ghost` plugin v0.1 (M1-M3): €30,000**

Deliverable: a Ghost plugin that emits a valid `om` 0.4 feed against a real Ghost instance, serves `.well-known/open-membership`, integrates with Ghost's existing Stripe Members feature, issues entitlement JWTs, and processes Stripe webhooks for subscription lifecycle events including chargebacks. Working end-to-end in test mode. 4 engineer-months.

Verifiable by: cloning the repository, running `docker compose up`, completing a test-mode Stripe purchase, and watching the entitlement JWT validate against a sample reader.

**Task 2, Miniflux reader fork (M3-M5): €15,000**

Deliverable: a fork of Miniflux (the open-source self-hosted RSS reader, ~22k stars) that parses the `om` namespace, presents the unlock prompt for locked items, completes Stripe Checkout in-browser, and stores and presents the resulting bearer token on subsequent fetches. 2 engineer-months.

Verifiable by: pointing the fork at the test Ghost instance from Task 1 and going through a full subscribe-read-cancel-relock flow.

**Task 3, Production deployment with first publisher (M6-M7): €5,000**

Deliverable: at least one publisher (target: a Ghost user already paying for FeedPress or Outpost, who switches to `om-ghost`) running `om-ghost` in production with at least one paying subscriber reading via the Miniflux fork. Onboarding time, integration help, and any small fixes surfaced by real use.

Verifiable by: a public statement from the publisher that they are using the open-source stack and have at least one paying subscriber on it. We will not name candidate publishers in advance for obvious reasons; the deliverable is the public confirmation, not any specific publisher.

**Task 4, Documentation and conformance certification (M7-M9): time only, included in tasks 1-3**

Deliverable: both implementations certified at conformance Levels 1, 2, and 5 by the project's test suite (a separate work item, not funded by this grant); public integration documentation; transfer of ownership to the working group's custodian once that custodian is in place.

Verifiable by: passing test-suite output published at the project URL; a custodian announcement.

Total: €50,000 over 9 months. Engineer rates are at NLnet cost-recovery, not commercial rates.

## Compare your own project with the state of the art

Three categories of existing work, what each does, and what it doesn't.

**Closed platforms.** Substack, Patreon, Apple Podcasts Subscriptions, and Spotify Podcast Subscriptions all solve paid content within their own walled gardens. None expose a portable subscriber identity; none let a reader app from outside their ecosystem fetch paid content. Substack's tokenised paid podcast feeds are the one exception, they work in any podcast app, and they are exactly the model `om` standardises. Substack invented a per-subscriber URL-token paid-RSS mechanism that works at scale with millions of users; we are publishing the spec for it so anyone can build the same thing.

**Open-CMS solutions.** Ghost, WordPress with Memberful, WooCommerce, Memberstack, Memberspace, Podia, and similar tools solve the publisher's data-ownership problem. The publisher owns their database. But every CMS implements paid feeds differently, every reader has to special-case every CMS, and the subscriber's identity is a foreign object trapped in whichever database they happen to have paid into. There is no portable shape for "I am a paying member" that travels between apps the way RSS itself does. `om` is the missing portable shape.

**Proprietary "open" tooling.** FeedPress and Outpost are the closest existing implementations to `om`. They sell paid-RSS-for-Ghost as commercial products, starting at ~€20/publisher/month. Their existence proves the technical approach works; their proprietary nature means every publisher is renting access to their own subscribers from a third-party vendor. `om` is the open-source version of what these companies sell.

**Adjacent open standards.** Podcasting 2.0 is the closest cousin and the closest model. The Podcast Index team added a namespace to RSS, hosted it themselves, kept it open, and let the indie ecosystem adopt it before incumbents engaged. Their `podcast:value` tag handles Lightning value-splits well; it does not handle subscription-based paid content because Lightning is a one-shot payment mechanism. `om` covers the subscription-based paid-content surface that `podcast:value` deliberately does not. The two namespaces compose; the `om` spec defines the co-existence rules.

ActivityPub (W3C, 2018) handles federated social distribution but is silent on paid content. Ghost 6.0's native ActivityPub integration federates posts but says nothing about how a paid post should behave when federated. The `om` spec includes a co-existence appendix (`spec/SPEC-ACTIVITYPUB.md`) that defines exactly that case: how a `<om:access>locked</om:access>` post becomes a preview Activity that federates safely without leaking gated content.

W3C Verifiable Credentials 2.0 and the BBS+ cryptosuite (`bbs-2023`) are the cryptographic substrate `om`'s privacy mode rests on. Neither is application-specific; we apply them to the paid-subscription case via an `om`-VC profile defined in the spec.

## Recommended reading

In order, lightest first:

1. The spec's README (`README.md`), ~180 lines, written for an interested but non-expert reader. It explains the protocol's three moving parts and the three publisher personas the design serves.
2. The 18-month roadmap (`ROADMAP.md`), which lays out exactly what `om-ghost` and the Miniflux fork need to do, month by month, to reach a first paying subscriber.
3. The competitive landscape document (`docs/RELATED-WORK.md`), which compares `om` to Substack, Patreon, Apple Podcasts Subscriptions, Spotify, and the open-CMS tier in concrete terms.
4. The ActivityPub co-existence appendix (`spec/SPEC-ACTIVITYPUB.md`), which is the most-recent piece of work and the one most directly relevant to NLnet's portfolio. It demonstrates the co-existence discipline the spec uses generally, specifying how `om` composes with neighbouring open standards rather than overriding them.
5. The full specification (`SPEC.md`), 836 lines, only if a reviewer wants to read normative prose.

## Fiscal sponsor / payee

- Legal entity: **leme**
- Country: **Netherlands**
- IBAN: **NL77 ADYB 1000 0421 82** (Adyen-issued business IBAN; BIC `ADYBNL2A`)
- Contact: Leander Jansen, leander@leme.nl

leme acts as the interim fiscal sponsor for the project until a permanent custodian is in place (Phase 3, M7-M9). Once the custodian commitment lands, ownership of the funded code transfers to the custodian; the funded engineering work and any residual budget transfer with it. This is documented in the project's governance plan (`docs/GOVERNANCE.md`).

The arrangement avoids Open Collective's 10% overhead and gives NLnet a single counterparty in an EU member state with a regulated PSP-issued IBAN.

## Notes for the submitter (do not paste into the form)

**Tone.** NLnet reviewers are technical. They have read hundreds of these. They can spot marketing copy at twenty paces. The text above is plain because that's what works at NLnet specifically; do not "polish" it before sending.

**Length.** The full submission is approximately 5,000 characters spread across the fields. Some applicants pad to fill space. Don't.

**The 404 Media reference.** Leave it in. It's the strongest single credibility marker we have for NLnet specifically, a real publication, doing investigative work, paying real money for a proprietary version of what we're building. NLnet reviewers know who 404 Media is.

**The "two reference implementations by independent developers" line.** This is borrowed from how IETF handles interoperability proof. NLnet reviewers may or may not know this convention; either way it reads as serious.

**What to leave out of this application but bring up in office hours if invited.** The privacy work (Levels 4 and 7, OM-VC and OM-VC-SD) is the most distinctive part of the spec but is harder to fund discretely than the reference implementations. Save it for follow-on conversation. NLnet has previously hinted that NGI Zero Entrust would be the appropriate vehicle for it; if Entrust reopens during the project, we apply there for the privacy track separately.

**Budget at €50,000.** This is exactly NLnet's published upper limit for a single application. Don't go higher unless the project has expanded scope; don't go lower because the engineering work doesn't fit in less.

**Office hour.** NLnet runs a weekly office hour. Attend one before submitting if there's any doubt about the application. They will tell you, in person, whether your idea fits.
