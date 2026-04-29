# Open Membership RSS

**An open standard for paid, tiered, time-gated, group-shared, value-for-value, and privacy-preserving subscription content — over the same RSS feeds the web has been running on for twenty years.**

`om` is to subscription content what RSS itself was to syndication: a small, namespaced contract that any publisher can emit and any reader can consume, with no platform in the middle and no permission required to participate.

---

## What it looks like

A publisher who adopts `om` adds a handful of elements to their existing RSS feed. That is the whole protocol surface a reader has to recognise to unlock paid content:

```xml
<rss version="2.0" xmlns:om="http://purl.org/rss/modules/membership/">
  <channel>
    <title>Field Notes</title>
    <om:provider>https://fieldnotes.example</om:provider>
    <om:discovery>https://fieldnotes.example/.well-known/open-membership</om:discovery>

    <om:psp id="stripe" account="acct_..." />
    <om:tier id="paid" price="USD 8.00" period="monthly">Supporter</om:tier>

    <om:offer id="supporter-monthly" tier="paid">
      <om:price amount="8.00" currency="USD" period="P1M" />
      <om:checkout psp="stripe" price_id="price_supporter_..." />
    </om:offer>

    <item>
      <title>Members-only investigation: the warehouse fire</title>
      <om:access>locked</om:access>
      <om:preview>The fire investigators&apos; report was filed two weeks before…</om:preview>
      <om:unlock>https://fieldnotes.example/unlock/2026-04-fire</om:unlock>
    </item>
  </channel>
</rss>
```

A discovery document at `/.well-known/open-membership` ties the rest together — where to check out, how to authenticate, where the entitlement-token endpoint lives. None of this requires the reader to know anything about the publisher's platform, billing system, or subscriber database. The contract is in the feed.

---

## The problem

Paid subscriptions on the open web are stuck. Publishers who want to charge their readers — newsletters, podcasts, investigative outlets, indie authors — have two real options today, and both involve renting a relationship with their audience from a closed platform.

Substack and Patreon work, but they own the subscriber list, the payment rails, the reader UX, and ultimately the leverage. When a writer or podcaster wants to leave, they discover how much of "their business" was actually the platform's.

Even the "open" tier of this market — Ghost, WordPress with Memberful, WooCommerce, Memberstack, Memberspace, Podia — solves the publisher's data-ownership problem but does nothing for the *subscriber*: every paid feed is a snowflake, every reader app has to special-case every CMS, and there is no portable shape for "I am a paying member" that travels between apps the way RSS itself does.

**The proprietary version of `om` already exists and already sells.** FeedPress and Outpost run paid RSS for Ghost publishers — 404 Media, Aftermath, and others are live paying customers — and the underlying mechanics work fine. What the market lacks is interoperability: a feed shape, a discovery document, a token contract, and a payment-binding model that any publisher can implement and any reader can read without negotiating with a vendor.

That gap is the gap an open standard fills. It also changes the pitch to publishers from "help us prove this can work" to "here is the open version of what you are already paying for."

---

## How it works

Three moving parts. Each one is small enough to implement in isolation, and each composes cleanly with the next:

1. **The feed.** A publisher's existing RSS feed gains a few namespaced elements: who the provider is, which payment processors are accepted, what tiers exist at what prices, and per-item access state (`open`, `preview`, `locked`, `members-only`). Nothing about the rest of the feed has to change. A reader that does not understand `om` keeps working unchanged; a reader that does, presents previews and unlock prompts.
2. **The discovery document.** A JSON document at `.well-known/open-membership` (composing with RFC 9728) is the single place a reader looks up everything the feed did not inline: token endpoints, accepted authentication methods, supported credential profiles, revocation policy, privacy posture. One fetch, no negotiation.
3. **The credential.** When a subscriber pays, the publisher issues a credential — a URL token, an OAuth bearer, or a Verifiable Credential, depending on the publisher's conformance level. The reader stores it, presents it on the next fetch, and the locked items unlock. The credential is portable across reader apps; the spec defines an export shape so a subscriber moving from Miniflux to NetNewsWire does not have to re-subscribe everywhere.

The technically distinctive bet is **identity unlinkability**. Without it, every publisher in the ecosystem accumulates a profile of every cross-publisher subscriber, which both recreates the surveillance problem an open standard is meant to avoid and makes the spec a non-starter for the publishers who would benefit from it most: investigative journalism, medical and mental-health publications, legal-research services. `om` solves this through a Verifiable Credential profile (OM-VC and OM-VC-SD, the latter using BBS+ selective disclosure) that lets a subscriber prove "I am a paid member of this tier" without revealing a stable identifier any publisher can correlate against any other publisher's data.

---

## Conformance levels

Implementers commit to a level, the test suite verifies the level, and the level is what they advertise. Levels are cumulative — Level *N* implies Levels 1 through *N*-1.

| Level | What it covers | Implementer effort |
|---|---|---|
| **1** | Parsing the namespace; previews; signup-URL display | one afternoon |
| **2** | URL token auth; unlock endpoints; publisher-managed groups | one to two weeks |
| **3** | OAuth bearer + DPoP; time-windowed access; SCIM groups | two to four weeks |
| **4** | OM-VC (Verifiable Credentials) presentation auth | three to six weeks |
| **5** | Commerce: PSP declarations, offers, checkout, entitlements, gifts, portability round-trip | two to four weeks (commerce) + one week (portability) |
| **6** | Value-for-value: time-split recipients, Lightning composition | two to four weeks |
| **7** | OM-VC-SD pseudonymous mode (BBS+ selective disclosure) | four to eight weeks |
| **8** | Bundle aggregation across publishers | two to four weeks |

Most publishers and reader apps will live at Level 1, 2, or 5. Levels 6–8 are for the implementers who need them.

---

## Who it's for

Three publisher personas drive every design decision. They are not market segments; they are the test of whether a feature is actually pulling its weight.

**The Substack writer who has migrated to Ghost.** They escaped one walled garden and landed in a less walled one, but they still have no portable subscription mechanism. With `om`, the same Ghost instance that hosts their writing emits a paid feed any RSS reader can consume, and their subscribers can read in whatever app they prefer. The pitch is concrete: drop in a plugin, your existing Stripe account keeps working, your subscribers stop being trapped in the Ghost web reader.

**The Patreon podcaster who wants to expand mediums.** Patreon gives them per-tier URL-token feeds and a payment relationship; it does not give them text or video on the same terms, and it does not let them participate in the Podcasting 2.0 value-for-value model in a clean way. `om` keeps the per-tier URL-token mechanism they already use, adds the multi-medium support Patreon does not offer, and composes cleanly with Lightning value-splits when the podcaster wants to support them.

**The investigative or specialist publication that needs the privacy layer.** Smaller population, but the one for whom no current platform works at all. A subscriber list that could be subpoenaed is a subscriber list the publication cannot ethically maintain; `om`'s pseudonymous mode (OM-VC-SD with per-publisher unlinkable pseudonyms) is built for them. If `om` reaches 1.0 with even five such publications in production, it has accomplished something none of the incumbents can.

These three names should appear in every implementation conversation. They are the test of whether a feature, an erratum, or a process change is actually serving the spec's purpose.

---

## Status

- **Spec:** feature-frozen at 0.4 (draft). The next two revisions (0.5, 1.0) are scheduled to focus on conformance, interop, and governance, **not** new features.
- **Reference publishers:** Ghost plugin and WordPress plugin, both targeting Level 5 (Commerce). Feature-complete; production-validated work in progress.
- **Reference reader:** Miniflux fork scaffolded with a Go `om/` module, fixture feeds, and an integration runbook.
- **Test suite:** scaffolded with Level 1 tests live; Levels 2 and 5 stubbed.
- **Subscriber portability:** spec drafted, round-trip harness implements the 26-test matrix (six credential shapes × two encryption envelopes + edge cases).
- **IETF draft:** [`ietf/draft-om-rss-00.md`](ietf/draft-om-rss-00.md), 1,926 lines in kramdown-rfc2629 format, ready for the Independent Submission stream once the custodian is in place.
- **Custodian:** four candidates in priority order (Internet Archive, Sovereign Tech Fund, NLnet Foundation, Software Freedom Conservancy). Outreach scheduled for Phase 3.

The path to 1.0 is not new features. It is shipping working implementations, getting them independently adopted, establishing neutral governance, and securing an RFC number. Eighteen months from spec draft to ratified open standard with multiple production deployments — see [`ROADMAP.md`](ROADMAP.md) for the technical phasing and [`ROADSHOW.md`](ROADSHOW.md) for the principles, risk register, and 1.0 vision.

---

## Get involved

**You publish content** and want to take it off a closed platform without losing the paid-RSS mechanism: read [`SPEC.md`](SPEC.md), look at [`reference/om-ghost/`](reference/om-ghost/) or [`reference/om-wordpress/`](reference/om-wordpress/) for a working starting point, and open an issue describing your setup if you want help onboarding. The first ten production publishers across the three personas are the most important users `om` will ever have.

**You write a reader app** (RSS reader, podcast app, indie web client) and want to support paid feeds without negotiating one-off deals with each publisher: start with the Level 1 parsing tests in [`reference/om-test-suite/`](reference/om-test-suite/) and the Miniflux patch plan in [`reference/om-miniflux/`](reference/om-miniflux/). Level 1 is one afternoon; the conformance harness will tell you exactly what passes.

**You fund or shepherd open infrastructure** (foundation, sovereign-tech body, philanthropy): the governance and custodian plan is in [`docs/GOVERNANCE.md`](docs/GOVERNANCE.md); the funding plan, with sendable applications per funder, is in [`funding/`](funding/). The 18-month plan needs ~€205,000 in direct spend, of which ~€130,000 is targeted from grants (NLnet NGI Zero Commons, SIDN Fonds, Sovereign Tech Fund) and ~€75,000 from publisher contributions and individual donations.

**You write specs** and want to review the technical bets — the BBS+ selective-disclosure profile, the discovery document composing with RFC 9728, the bundle-aggregation trust model: [`SPEC.md`](SPEC.md) is the canonical document, the appendices in [`spec/`](spec/) cover ActivityPub co-existence, the Platform Adapter Profile, syndication-format mappings (Atom + JSON Feed), the subscriber portability format, and the 0.4.1 errata.

Issues, pull requests, and reviews are welcome on all of the above.

---

## Repository layout

```
README.md         this document — the landing page
SPEC.md           the canonical specification (0.4 draft)
ROADMAP.md        eighteen-month technical phasing to 1.0
ROADSHOW.md       guiding principles, risk register, 1.0 vision
LICENSE           MIT — covers all code under reference/
LICENSE-SPEC      CC-BY-4.0 — covers spec prose and design documents

spec/             non-normative companion specs and errata
                    SPEC-ERRATA-0.4.1.md           tax inclusivity, enclosure auth
                    SPEC-SYNDICATION-MAPPINGS.md   Atom + JSON Feed mappings
                    SPEC-ADAPTER-PROFILE.md        Platform Adapter Profile
                    SPEC-ACTIVITYPUB.md            federation co-existence
                    SPEC-PORTABILITY.md            subscriber portability format
                    SPEC-SHARING-POLICY.md         anti-sharing primitive (provisional)

docs/             design and project documents
                    FEATURESET.md                  authoritative feature inventory
                    GOVERNANCE.md                  custodian + working-group charter
                    COMPETITIVE-LANDSCAPE.md       what exists, what doesn't
                    reader-ARCHITECTURE.md         reference reader design

funding/          funding plan and sendable applications
                    README.md                      strategy + sequence
                    BUDGET.md                      phase-by-phase spend
                    nlnet-ngi-zero-commons.md      primary application (NLnet)
                    sidn-fonds.md                  Dutch backup (SIDN Fonds)
                    sovereign-tech-fund.md         stretch (STF Contract Work)
                    stripe-open-source.md          informal email to Stripe DevRel

reference/        working code
                    om-ghost/                      Ghost plugin + Node sidecar (Level 5)
                    om-wordpress/                  WordPress plugin (Level 5)
                    om-eleventy/                   static-site reference (scaffolded)
                    om-miniflux/                   Miniflux reader fork (scaffolded)
                    om-test-suite/                 conformance harness (Level 1 live)
                    om-portability-roundtrip/      26-test cross-reader matrix

references/       verbatim copies of upstream specs (RSS, Atom, ActivityPub, VC, BBS, …)
plans/            phase-by-phase execution detail
ietf/             Internet-Draft in kramdown-rfc2629 format
site/             open-membership.org static site (deploys to Cloudflare Pages)
```

---

## Licensing

The specification prose and design documents are CC-BY-4.0 (`LICENSE-SPEC`). All code, including everything under `reference/`, is MIT (`LICENSE`). The `om` namespace itself is not subject to copyright.

---

## What this is not

Not a business plan. Not a startup. Not a product. The work product is an open protocol under a perpetual permissive grant, held by a neutral custodian. The funding pays for maintenance and reference implementations, not equity. The reference implementations are open source. The goal is that the protocol outlives every individual maintainer and funder, the way RSS has now outlived its creators.

`om` does not court Substack, Patreon, Spotify, or Apple. They will adopt, fork, or ignore; none of those outcomes is a precondition for 1.0. The audience is the indie ecosystem of publishers and reader-app authors who want paid content to work the way RSS itself works — open, federated, portable, and unowned.
