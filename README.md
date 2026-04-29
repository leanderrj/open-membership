# Open Membership RSS

**An open standard for paid, tiered, time-gated, group-shared, value-for-value, and privacy-preserving subscription content over RSS.**

`om` adds a small, namespaced contract to a regular RSS feed. Any publisher can emit it. Any reader can consume it. No platform in the middle, no permission required to participate.

---

## What it looks like

A publisher who adopts `om` adds a handful of namespaced elements to their existing RSS feed. That is the whole protocol surface a reader has to recognise to unlock paid content.

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
      <om:preview>The fire investigators&apos; report was filed two weeks before...</om:preview>
      <om:unlock>https://fieldnotes.example/unlock/2026-04-fire</om:unlock>
    </item>
  </channel>
</rss>
```

A discovery document at `/.well-known/open-membership` ties the rest together: where to check out, how to authenticate, where the entitlement-token endpoint lives. The contract is in the feed.

---

## How it works

Three moving parts. Each is small enough to implement on its own, and each composes with the next.

1. **The feed.** A publisher's existing RSS feed gains a few namespaced elements: provider URI, accepted payment processors, tiers and prices, per-item access state (`open`, `preview`, `locked`, `members-only`). Nothing else changes. A reader that does not understand `om` keeps working unchanged. A reader that does, presents previews and unlock prompts.

2. **The discovery document.** A JSON document at `.well-known/open-membership`, composing with RFC 9728. One place a reader looks up everything the feed did not inline: token endpoints, accepted authentication methods, supported credential profiles, revocation policy, privacy posture. One fetch, no negotiation.

3. **The credential.** When a subscriber pays, the publisher issues a credential: a URL token, an OAuth bearer, or a W3C Verifiable Credential, depending on the publisher's conformance level. The reader stores it, presents it on the next fetch, and the locked items unlock. The credential is portable across reader apps; the spec defines an export shape so a subscriber moving between apps does not have to re-subscribe everywhere.

The technically distinctive design choice is **identity unlinkability**. Without it, every publisher in the ecosystem accumulates a profile of every cross-publisher subscriber. `om` solves this through a Verifiable Credential profile (OM-VC, and OM-VC-SD using BBS+ selective disclosure) that lets a subscriber prove "I am a paid member of this tier" without revealing a stable identifier any publisher can correlate against any other publisher's data.

---

## Conformance levels

Implementers commit to a level, the test suite verifies the level, and the level is what they advertise. Levels are cumulative.

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

Most publishers and reader apps will implement Level 1, 2, or 5.

---

## Get involved

**Publishers.** Read [`SPEC.md`](SPEC.md), look at [`reference/om-ghost/`](reference/om-ghost/) or [`reference/om-wordpress/`](reference/om-wordpress/) for working starting points, and open an issue describing your setup if you want help onboarding.

**Reader apps.** Start with the Level 1 parsing tests in [`reference/om-test-suite/`](reference/om-test-suite/) and the Miniflux patch plan in [`reference/om-miniflux/`](reference/om-miniflux/). Level 1 is one afternoon.

**Spec reviewers.** [`SPEC.md`](SPEC.md) is the canonical document. Companion specs in [`spec/`](spec/) cover ActivityPub co-existence, the Platform Adapter Profile, syndication-format mappings (Atom + JSON Feed), the subscriber portability format, and errata.

Issues, pull requests, and reviews welcome on all of the above.

---

## Repository layout

```
README.md         this document
SPEC.md           the canonical specification
LICENSE           MIT, covers all code under reference/
LICENSE-SPEC      CC-BY-4.0, covers spec prose and design documents

spec/             non-normative companion specs and errata
docs/             design and project documents (governance, featureset, architecture)
reference/        working code (Ghost, WordPress, Miniflux, Eleventy, test suite, portability)
references/       verbatim copies of upstream specs (RSS, Atom, ActivityPub, VC, BBS, ...)
ietf/             Internet-Draft in kramdown-rfc2629 format
site/             openmembership.org static site
internal/         project planning and funding documents (not part of the spec)
scripts/          one-shot operational scripts
```

---

## Licensing

Specification prose and design documents: CC-BY-4.0 (`LICENSE-SPEC`). All code under `reference/`: MIT (`LICENSE`). The `om` namespace itself is not subject to copyright.

---

## What this is not

Not a business plan. Not a startup. Not a product. The work product is an open protocol under a perpetual permissive grant, held by a neutral custodian. The reference implementations are open source. The goal is that the protocol outlives every individual maintainer, the way RSS has outlived its creators.
