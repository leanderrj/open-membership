# Open Membership RSS

`om` is an open-spec extension to RSS for paid, tiered, time-gated, group-shared, value-for-value, and privacy-preserving content. It is to subscription content what RSS itself was to syndication: a small, namespaced contract that any publisher can emit and any reader can consume, with no platform in the middle and no permission required to participate.

This repository holds the specification, the supporting design and governance documents, and the reference implementations.

## The problem

Paid subscriptions on the open web are stuck. The publishers who want to charge their readers — newsletters, podcasts, investigative outlets, indie authors — have two real options today, and both involve renting a relationship with their audience from a closed platform. Substack and Patreon work, but they own the subscriber list, the payment rails, the reader UX, and ultimately the leverage. When a writer or podcaster wants to leave, they discover how much of "their business" was actually the platform's. Even the "open" tier of this market — Ghost, WordPress with Memberful, WooCommerce, Memberstack, Memberspace, Podia — solves the publisher's data-ownership problem but does nothing for the *subscriber*: every paid feed is a snowflake, every reader app has to special-case every CMS, and there is no portable shape for "I am a paying member" that travels between apps the way RSS itself does.

The proprietary version of what `om` describes already exists and already sells. FeedPress and Outpost run paid RSS for Ghost publishers — 404 Media, Aftermath, and others are live paying customers — and the underlying mechanics work fine. What the market lacks is interoperability: a feed shape, a discovery document, a token contract, and a payment-binding model that any publisher can implement and any reader can read without negotiating with a vendor. That gap is the exact gap an open standard fills, and it changes the pitch to publishers from "help us prove this can work" to "here is the open version of what you are already paying for."

## What `om` actually is

`om` is an RSS namespace (`http://purl.org/rss/modules/membership/`, suggested prefix `om`) plus a discovery document at `.well-known/open-membership` plus a small set of conventions for how readers obtain and present credentials. The spec is feature-frozen at 0.4. The path to 1.0 is not new features; it is shipping working implementations, getting them independently adopted, establishing neutral governance, and securing an RFC number.

A publisher who adopts `om` adds a few elements to their existing RSS feed — `<om:provider>` to declare who is in charge, `<om:tier>` to describe the price points and periods, `<om:access>` per item to say whether it is open, preview, locked, or members-only, `<om:unlock>` to point at the endpoint that turns a credential into the full content, and `<om:psp>` to declare which payment service providers they support. A discovery document at `/.well-known/open-membership` ties the rest together: where to check out, how to authenticate, where the entitlement token endpoint lives. None of this requires the reader to know anything about the publisher's platform; the contract is in the feed.

A reader that adopts `om` parses the namespace, displays previews for items the user does not yet have access to, hands the user off to the publisher's own checkout flow when they want to subscribe, stores the resulting credential, and presents the unlocked content the next time the feed is fetched. The simplest level of conformance — Level 1, parsing — is "one afternoon" of work. The fullest — Levels 5 through 8, covering commerce, value-for-value, pseudonymous credentials, and bundle aggregation — is multi-month work but cleanly cumulative: an implementer commits to a level, the test suite verifies the level, and the level is what they advertise.

The spec's most distinctive technical bet is **identity unlinkability**. Without it, every publisher in the ecosystem accumulates a profile of every cross-publisher subscriber, which both recreates the surveillance problem an open standard is meant to avoid and makes the spec a non-starter for the publishers who would benefit from it most: investigative journalism, medical and mental-health publications, legal-research services, and any publication whose subscriber list is itself sensitive intelligence. `om` solves this through a Verifiable Credential profile (OM-VC and OM-VC-SD, the latter using BBS+ selective disclosure) that lets a subscriber prove "I am a paid member of this tier" without revealing a stable identifier the publisher can correlate against any other publisher's data.

## Who it is for

Three publisher personas drive every design decision. They are not market segments; they are the test of whether a feature is actually pulling its weight.

**The Substack writer who has migrated to Ghost.** They escaped one walled garden and landed in a less walled one, but they still have no portable subscription mechanism. With `om`, the same Ghost instance that hosts their writing emits a paid feed any RSS reader can consume, and their subscribers can read in whatever app they prefer. The pitch is concrete: drop in a plugin, your existing Stripe account keeps working, your subscribers stop being trapped in the Ghost web reader.

**The Patreon podcaster who wants to expand mediums.** Patreon gives them per-tier URL-token feeds and a payment relationship; it does not give them text or video on the same terms, and it does not let them participate in the Podcasting 2.0 value-for-value model in a clean way. `om` keeps the per-tier URL-token mechanism they already use, adds the multi-medium support Patreon does not offer, and composes cleanly with Lightning value-splits when the podcaster wants to support them.

**The investigative or specialist publication that needs the privacy layer.** Smaller population, but the one for whom no current platform works at all. A subscriber list that could be subpoenaed is a subscriber list the publication cannot ethically maintain; `om`'s pseudonymous mode (OM-VC-SD with per-publisher unlinkable pseudonyms) is built for them. If `om` reaches 1.0 with even five such publications in production, it has accomplished something none of the incumbents can.

These three names should appear in every implementation conversation. They are the test of whether a feature, an erratum, or a process change is actually serving the spec's purpose.

## Where the work is

The spec is feature-complete at 0.4. The repository carries that spec, two production-quality reference publisher implementations, scaffolded reference reader and harness work, six non-normative companion appendices covering the parts of a deployment that happen off-feed, an authoritative feature inventory, a governance and custodian shortlist, a competitive landscape analysis, three phase-by-phase execution plans, an IETF Internet-Draft of the spec in kramdown-rfc2629 format, and verbatim copies of every upstream specification the design depends on (RSS 1.0, RSS 2.0, Atom, ActivityPub, Verifiable Credentials, Bitstring Status List, RFC 7643/7644 for SCIM, RFC 9728 for the discovery model, the BBS cryptosuite, and the Podcasting 2.0 namespace).

Two reference publisher implementations are feature-complete: a Ghost plugin and Node sidecar with a Cloudflare Worker variant (`reference/om-ghost/`, targeting conformance Level 5, TypeScript and Hono and Stripe), and a WordPress plugin (`reference/om-wordpress/`, also Level 5, PHP 8.1+, Stripe SDK, firebase/php-jwt, custom rewrite for `/feed/om/:token` and `/.well-known/open-membership`, REST endpoints under `/wp-json/om/v1/*`). A static-site reference (`reference/om-eleventy/`, Eleventy plus Cloudflare Workers) is scaffolded and awaiting a real Eleventy publisher to migrate. A reader fork (`reference/om-miniflux/`) is fork-prepared with a Go `om/` module, fixture feeds, a patch plan, and an integration runbook; the merge into a live Miniflux checkout is Phase 1 month 3 work. A reader conformance harness and publisher test suite (`reference/om-test-suite/`) is scaffolded with Level 1 tests live and Levels 2 and 5 stubbed. A subscriber-portability round-trip harness (`reference/om-portability-roundtrip/`) implements the 26-test matrix that proves a Reader A → Reader B → Reader A export is byte-equivalent across the credential and envelope shapes the spec defines.

## The path to 1.0

Eighteen months from spec draft to ratified open standard with multiple production deployments. The phases are sequenced around the riskiest unknowns, not the hardest engineering: Phase 1 is a working end-to-end demo on a test Ghost instance; Phase 2 is a real outside publisher saying yes and a real subscriber paying through the open flow; Phase 3 is governance under a neutral custodian and a deployed test suite at a custodian-hosted URL; Phase 4 is the second reader, the WordPress plugin, the static-site reference, and five publishers in production; Phase 5 is the IETF Independent Submission and the subscriber portability format being round-trip-verified; Phase 6 is an in-person event, a 30-day public comment period, and the 1.0 release at the custodian's canonical URL.

The critical path runs through Phase 2 (first outside publisher) and Phase 3 (custodian plus test suite). Everything after that is project-management work once those two are done.

The strategic update since 0.4 was drafted is that the proprietary version of `om` already exists in the market in the form of FeedPress and Outpost. This is not a threat; it is the strongest evidence the design is correct. It also means the publisher pitch is no longer hypothetical — the easiest first publisher is a Ghost site already paying FeedPress for paid RSS, who can switch to the open version at no functional cost and gain reader-app portability they did not have before.

A realistic minimum to hit the 18-month plan is roughly €180,000–€250,000 across all sources, split across three funding tracks: the Sovereign Tech Fund infrastructure grant, an NLnet NGI Zero development grant, and a Stripe Open Source sponsorship. A bootstrapped path with unpaid maintainers can reach month 6 but probably not month 18.

## What this is not

Not a business plan. Not a startup. Not a product. The work product is an open protocol under a perpetual permissive grant, held by a neutral custodian. The funding pays for maintenance and reference implementations, not equity. The reference implementations are open source. The goal is that the protocol outlives every individual maintainer and funder, the way RSS has now outlived its creators.

`om` does not court Substack, Patreon, Spotify, or Apple. They will adopt, fork, or ignore; none of those outcomes is a precondition for 1.0. The audience is the indie ecosystem of publishers and reader-app authors who want paid content to work the way RSS itself works — open, federated, portable, and unowned.

## Repository layout

The canonical spec is `SPEC.md` at the root. The roadmap and the roadshow (the technical-spec sequencing and the principles-plus-risks narrative, respectively) sit beside it as `ROADMAP.md` and `ROADSHOW.md`. Everything else groups by purpose: `spec/` for the non-normative appendices (errata, syndication mappings, adapter profile, ActivityPub co-existence, subscriber portability, sharing policy); `docs/` for the design and project documents (featureset reference, funding plan, governance and custodian shortlist, competitive landscape, reader architecture); `reference/` for the working code; `references/` (with a trailing s) for the verbatim upstream specifications; `plans/` for the phase-by-phase execution detail; `ietf/` for the Internet-Draft.

## Licensing

The specification prose and design documents are CC-BY-4.0 (`LICENSE-SPEC`). All code, including everything under `reference/`, is MIT (`LICENSE`). The `om` namespace itself is not subject to copyright.
