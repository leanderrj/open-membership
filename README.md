# Open Membership RSS

**An RSS namespace for paid subscription content. Any publisher can emit it; any reader can consume it.**

`om` adds a handful of namespaced elements to an existing RSS feed. No platform in the middle.

---

## What it looks like

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

A discovery document at `/.well-known/open-membership` covers the rest: where to check out, how to authenticate, where the entitlement-token endpoint lives.

---

## How it works

Three moving parts.

1. **The feed.** Provider URI, accepted payment processors, tiers and prices, per-item access state (`open`, `preview`, `locked`, `members-only`). A reader that doesn't understand `om` keeps working as before.

2. **The discovery document.** A JSON document at `.well-known/open-membership` composing with RFC 9728. Token endpoints, auth methods, credential profiles, revocation policy.

3. **The credential.** A URL token, OAuth bearer, or W3C Verifiable Credential. Portable across reader apps; the spec defines an export shape.

The distinctive design choice is **identity unlinkability**. The Verifiable Credential profile (OM-VC, and OM-VC-SD with BBS+ selective disclosure) lets a subscriber prove "I am a paid member of this tier" without revealing a stable identifier publishers can correlate.

Conformance levels are defined in [`docs/FEATURESET.md`](docs/FEATURESET.md). Most publishers and reader apps will implement Level 1, 2, or 5.

---

## Get involved

**Publishers.** Read [`SPEC.md`](SPEC.md). See [`reference/om-ghost/`](reference/om-ghost/) and [`reference/om-wordpress/`](reference/om-wordpress/). Open an issue if you want help onboarding.

**Reader apps.** Start with the parsing tests in [`reference/om-test-suite/`](reference/om-test-suite/) and the Miniflux patch plan in [`reference/om-miniflux/`](reference/om-miniflux/). First integration target is an afternoon.

**Spec reviewers.** Companion specs in [`spec/`](spec/) cover ActivityPub coexistence, the Platform Adapter Profile, syndication mappings (Atom + JSON Feed), portability, and errata.

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

Not a business plan, not a startup, not a product. An open protocol under a perpetual permissive grant. Reference implementations are MIT.
