# Open Membership RSS 0.4

**An open module for paid, tiered, time-gated, group-shared, value-for-value, and privacy-preserving syndication content.**

- **Latest version:** `http://purl.org/rss/modules/membership/`
- **This version:** 0.4 (draft, 2026-04-23)
- **Previous version:** 0.3 (2026-04-23)
- **Namespace URI:** `http://purl.org/rss/modules/membership/`
- **Suggested prefix:** `om`
- **Status:** Feature-frozen draft. The next two revisions (0.5, 1.0) are scheduled to focus on conformance, interop, and governance, not new features.

## Copyright

Copyright © 2026 by the Authors.

Permission to use, copy, modify and distribute the Open Membership RSS Specification and its accompanying documentation for any purpose and without fee is hereby granted in perpetuity, provided that the above copyright notice and this paragraph appear in all copies.

The copyright holders make no representation about the suitability of the specification for any purpose. It is provided "as is" without expressed or implied warranty. This copyright applies to the Open Membership RSS Specification and accompanying documentation and does not extend to the format itself.

---

## Featureset Summary (0.1 → 0.4)

This is the complete set of capabilities the spec now defines. A reader or publisher can use this list to decide which conformance levels matter for their use case.

### Foundational (0.1)

- **Namespace declaration** in RSS 2.0 and RSS 1.0/RDF
- **Provider identification** (`<om:provider>`)
- **Authentication method declaration** (`<om:authMethod>`: `url-token`, `http-basic`, `bearer`, `dpop`)
- **Tier declarations** (`<om:tier>` with price and period)
- **Per-item access policy** (`<om:access>`: `open`, `preview`, `locked`, `members-only`)
- **Decoupled unlock endpoints** (`<om:unlock>`)
- **Publisher-curated previews** (`<om:preview>`)
- **Cryptographic receipts** (`<om:receipt>`)

### Discovery and Identity (0.2)

- **Canonical discovery document** at `.well-known/open-membership`, composing with RFC 9728
- **Time-gated content** (`<om:window>`): early access, ephemeral free, scheduled drops, event windows
- **Group subscriptions** (`<om:group>`): publisher-managed (families) and self-managed (companies, institutions)
- **SCIM 2.0 binding** for self-managed group rosters
- **Verifiable Credential profile** ("OM-VC 1.0") based on W3C VC 2.0
- **Bitstring Status List revocation** for portable credentials
- **WorkOS umbrella binding** (non-normative reference)

### Payments and Value (0.3)

- **Payment Service Provider declarations** (`<om:psp>`): Stripe, Mollie, PayPal, Adyen, Paddle, Lightning, custom
- **Feature-level entitlements** (`<om:feature>`) decoupled from tiers
- **Purchasable offers** (`<om:offer>`) with multiple PSPs and currencies
- **In-reader checkout flow** with publisher-side checkout endpoint
- **Value-for-value primitives** (`<om:value>`, `<om:recipient>`, `<om:split>`)
- **Podcasting 2.0 co-existence** rules for shared `podcast:value` and `om:value` blocks
- **PSP binding profiles** (Stripe-native entitlements, Mollie subscription-derived, Lightning per-payment)

### Privacy, Sharing, and Lifecycle (0.4)

- **Refund and chargeback policy declaration** (`<om:revocation>`)
- **Cross-publisher bundles** (`<om:bundle>`, `<om:bundled-from>`) with delegated trust
- **Selective disclosure profile** ("OM-VC-SD 1.0") based on W3C BBS+ cryptosuite
- **Pseudonymous tier** for journalism, legal, medical, and other sensitive contexts
- **Gift subscriptions** (`<om:gift>`) as transferable single-use entitlements
- **Proration policy declaration** for tier changes
- **Identity unlinkability** between publishers via per-publisher pseudonyms

---

## 1. What This Version Adds

0.3 covered the buy-and-read happy path. 0.4 covers everything that happens when reality intervenes: people change their minds, share their subscriptions, want privacy, and refuse to be tracked across publishers. Each feature in 0.4 corresponds to a real failure mode an early implementer would hit on day one of a real deployment.

The single most important addition is **identity unlinkability**. Without it, every publisher in the ecosystem accumulates a profile of every cross-publisher subscriber, which both (a) recreates the surveillance problem the spec is meant to avoid, and (b) makes the spec a non-starter for the publishers who would benefit from it most: investigative journalism, medical and mental-health publications, legal-research services, and any publication whose subscriber list is itself sensitive intelligence.

The second is **bundles**, because the only realistic path to "I subscribe once and read fifteen things" without recreating Spotify is open federation — and federation needs an aggregator pattern in the spec.

---

## 2. Refunds, Chargebacks, and Revocation

### 2.1 `<om:revocation>` (channel-level, optional)

Declares the publisher's policy for revoking access after a refund, chargeback, or subscription cancellation. Discoverable in `.well-known/open-membership` so a reader can show the user what they're agreeing to before paying.

Attributes:

- `policy` (required) — one of:
  - `prospective-only` — once content is delivered, the subscriber keeps it; only future content is gated. Default; matches Substack and most newsletter business models.
  - `chargeback-revocation` — refunds keep delivered content, but a chargeback (an externally-initiated dispute) revokes future tokens *and* invalidates the subject's existing access tokens for redelivery purposes.
  - `full-revocation` — refund or chargeback revokes everything; the subscriber's tokens are invalidated. Appropriate for subscription bundles where retroactive billing is the norm.
- `grace_hours` (optional) — number of hours after subscription end during which the reader can still fetch already-listed content (useful for cached feeds and offline readers). Default: `0`.

```xml
<om:revocation policy="prospective-only" grace_hours="48" />
```

### 2.2 Reader Behavior

A reader at Level 5 or above MUST display the publisher's revocation policy on the checkout screen if the policy is anything other than `prospective-only`. This is the spec's UX consent layer: surprises about refunds are bad protocol design, not a publisher problem.

### 2.3 Webhook Mapping

PSP binding profiles are extended:

- **Stripe:** the `charge.dispute.created` webhook MUST trigger the publisher's revocation evaluation. If `policy="chargeback-revocation"` or `"full-revocation"`, the publisher flips the bit on the relevant Bitstring Status List entry within 1 hour.
- **Mollie:** the `chargeback` event on a payment SHOULD trigger the same evaluation.
- **Lightning:** not applicable; payments are final.

---

## 3. Cross-Publisher Bundles

A bundle is a single subscription that grants access to content from multiple publishers. The challenge: nothing in 0.3 lets a subscriber prove to Publisher B that they paid Publisher A's bundle product. Federated trust is required.

### 3.1 The Aggregator Pattern

A **bundle aggregator** is a special kind of publisher that:

1. Operates its own discovery document, offers, and checkout flow like any other publisher.
2. Issues entitlements (bearer tokens or VCs) that name *other* publishers as their `audience`.
3. Maintains business agreements with those publishers (out of scope for the spec) and a public list of bundled publishers (in scope).

A subscriber pays the aggregator. The aggregator issues a credential. The subscriber presents it at any bundled publisher. The bundled publisher trusts the aggregator's signature and grants access.

### 3.2 `<om:bundle>` (channel-level on the aggregator's feed, optional, repeatable)

Declares a bundle the aggregator sells.

Attributes:

- `id` (required) — opaque identifier
- `audience` — space-separated list of provider URIs included in the bundle

```xml
<om:bundle id="indie-news-bundle" audience="https://fieldnotes.example https://podcastco.example https://indie-news.example">
  <om:tier id="bundle-paid" price="USD 15.00" period="monthly">All-access bundle</om:tier>
  <om:offer id="bundle-monthly" tier="bundle-paid">
    <om:price amount="15.00" currency="USD" period="P1M" />
    <om:checkout psp="stripe" price_id="price_bundle_..." />
  </om:offer>
</om:bundle>
```

### 3.3 `<om:bundled-from>` (channel-level on a participating publisher's feed, optional, repeatable)

Declares that this publisher accepts entitlements from a named aggregator. The aggregator's `<om:provider>` URI is the trust anchor; its DID or HTTPS URI is used to verify presented credentials.

```xml
<om:bundled-from provider="https://aggregator.example">
  <om:trust did="did:web:aggregator.example" />
  <om:trust jwks_uri="https://aggregator.example/.well-known/jwks.json" />
</om:bundled-from>
```

A bundled publisher MAY accept bundle credentials and MUST NOT charge the bundled subscriber additionally for the same content. The bundle's commercial terms (revenue share, audit rights) are out of band.

### 3.4 Credential Shape for Bundles

A bundle credential is an OM-VC with these characteristics:

- `issuer`: the aggregator's DID
- `credentialSubject.audience`: array of publisher provider URIs (1 or more)
- `credentialSubject.bundleId`: the aggregator's `<om:bundle id>` value

When a reader presents this credential to a bundled publisher's verification endpoint, the publisher checks:

1. The `issuer` is in this publisher's `<om:bundled-from>` list.
2. The `audience` array contains this publisher's `<om:provider>` URI.
3. The credential is not revoked (status list check).
4. `validUntil` has not passed.

If all four pass, the publisher issues its own short-lived bearer token scoped to itself. The bundle credential is never sent again in subsequent feed requests.

### 3.5 Bundle Conformance Requirements

A bundle aggregator MUST:

- Operate full Level 5 conformance (offers, checkout, entitlement) as a publisher.
- Issue OM-VC credentials with valid `audience` arrays.
- Maintain a Bitstring Status List for issued bundle credentials.
- Publish, in their `.well-known/open-membership`, a `bundles` array listing every active bundle and its participating publishers.

A bundled publisher MUST:

- Accept presentations from aggregators they list in `<om:bundled-from>`.
- Issue their own scoped tokens after verification, never relay the aggregator's credential.

### 3.6 Why This Doesn't Recreate Spotify

The aggregator pattern looks superficially like a platform, and the worry is fair. Three structural differences:

1. **The aggregator can't lock a publisher in.** A publisher can drop an aggregator at any time by removing it from `<om:bundled-from>`. The aggregator has no contractual leverage from the protocol layer.
2. **The aggregator can't lock a subscriber in.** The subscriber's identity (subject DID) is portable across aggregators, and they can hold credentials from many aggregators simultaneously without telling any of them.
3. **The aggregator competes on terms, not technology.** Because any party can be an aggregator with no privileged access, the market for aggregation is contestable. If one aggregator takes 30% and another takes 5%, publishers will quickly migrate.

This is the same shape as registrar competition under ICANN: the protocol enables the market without picking a winner.

---

## 4. Selective Disclosure and Pseudonymous Tier

### 4.1 OM-VC-SD 1.0 Profile

A new credential profile for privacy-preserving entitlement proofs, layered on top of OM-VC 1.0 (defined in 0.2 §9). The profile uses the W3C `bbs-2023` cryptosuite (Candidate Recommendation, with active interoperability testing), specifically its **pseudonyms with hidden ID** feature.

Differences from OM-VC 1.0:

- Signing suite is `bbs-2023` rather than `eddsa-rdfc-2022` or `ecdsa-rdfc-2019`.
- The credential includes ALL claims an issuer might assert, but the holder generates a derived proof revealing only what the verifier needs.
- The credential supports **per-verifier pseudonyms**: when presented to Publisher A, the holder reveals one stable pseudonym; when presented to Publisher B, a different stable pseudonym; the two cannot be linked even if the publishers collude.

### 4.2 Required Disclosures

For an entitlement check at a publisher with `<om:authMethod>vc-presentation</om:authMethod>` and `<om:privacy>pseudonymous</om:privacy>` declared (see §4.3), the holder MUST disclose:

- `publisher` (must match the verifier)
- `tier` or relevant `feature` claims
- `validFrom`, `validUntil`
- The per-verifier pseudonym (`subject_pseudonym`)

The holder MUST NOT disclose:

- The credential's issuer-side subject identifier (their cross-publisher identity)
- Group membership claims (unless the publisher specifically requires them; see §4.4)
- Email, payment-method identifiers, or any other personally-identifying claims

### 4.3 `<om:privacy>` (channel-level, optional)

Declares the publisher's privacy posture, surfaced in `.well-known/open-membership`.

Values:

- `standard` (default) — full credential claims expected
- `pseudonymous` — readers SHOULD present OM-VC-SD credentials with selective disclosure; publishers MUST NOT log or correlate disclosed pseudonyms with external identifiers
- `pseudonymous-required` — non-pseudonymous credentials are rejected

```xml
<om:privacy>pseudonymous</om:privacy>
```

A publisher declaring `pseudonymous` or `pseudonymous-required` makes a binding commitment that affects what data they may collect. Auditing this commitment is out of scope for the protocol — but the protocol gives readers a way to choose privacy-respecting publishers.

### 4.4 Group Membership in Pseudonymous Mode

A subscriber in a company group plan can prove "I am authorized via Acme Corp's subscription" without revealing *which* employee they are, and without Acme being able to track which articles they read. The BBS+ scheme supports this directly: the credential carries the group ID, the holder selectively discloses it without revealing the seat ID, and the publisher accepts the group ID + status list check as sufficient.

This is the feature that makes corporate subscriptions tenable for privacy-sensitive publications. A medical-research firm can subscribe its employees to a journal without the journal learning which researcher reads which paper.

### 4.5 Implementation Note

The `bbs-2023` cryptosuite is W3C Candidate Recommendation with two-implementation interop required for advancement. As of 0.4 publication, multiple implementations exist (Mattr, Spruce, Digital Bazaar). A publisher implementing OM-VC-SD 1.0 SHOULD pin to the `bbs-2023` suite version listed in `.well-known/open-membership` under `verifiable_credentials.cryptosuite` and update as the spec advances to Recommendation.

For publishers without crypto-engineering capacity, an umbrella issuer (WorkOS-style or specialized identity provider) issues the BBS-signed credentials on the publisher's behalf. The publisher only verifies presentations; this is the easier half.

---

## 5. Gift Subscriptions

### 5.1 `<om:gift>` (channel-level, optional, repeatable)

Declares a giftable variant of an offer. A gift subscription is a transferable single-use entitlement: the purchaser pays, receives a redemption token, and gives that token to the recipient, who binds it to their own subject DID.

Attributes:

- `offer` (required) — references an `<om:offer>` id
- `redeemable_via` (required) — URL where the recipient redeems the token
- `transferable` (optional) — `true` (default) or `false`; if `false`, the gift can only be redeemed by the email/identity specified at purchase

```xml
<om:gift offer="paid-yearly" redeemable_via="https://fieldnotes.example/gift/redeem" transferable="true" />
```

### 5.2 Purchase Flow

Identical to a normal `<om:offer>` checkout, with one extra parameter in the POST body to the publisher's checkout endpoint:

```json
{
  "offer_id": "paid-yearly",
  "psp": "stripe",
  "price_id": "price_yearly_...",
  "as_gift": true,
  "gift_recipient_email": "alice@example.com",
  "gift_message": "Happy birthday!"
}
```

Publisher returns the normal Checkout Session URL; on completion, the publisher sends the redemption token to the recipient (or to the purchaser, depending on UX policy) via email. The token is a one-time-use code.

### 5.3 Redemption

The recipient's reader fetches `redeemable_via` with the redemption token. The publisher validates and either:

- Issues an OM-VC bound to the recipient's subject DID (Level 4 publishers), or
- Creates an internal subscription record keyed by the recipient's email and the recipient receives a tokenized URL or login link (Level 2/3 publishers).

### 5.4 PSP-Specific Notes

- **Stripe:** A gift purchase creates a Stripe Customer for the *recipient*, not the purchaser. The purchaser's payment method funds the initial charge. No subscription is created until the recipient redeems; the publisher holds the entitlement in escrow.
- **Mollie:** Same pattern; the recipient becomes the Mollie Customer at redemption time.
- **Lightning:** A gift is a one-time payment; the resulting access token is the gift.

---

## 6. Proration

### 6.1 `<om:proration>` (inside `<om:offer>` or channel-level)

Declares how mid-cycle tier changes are handled. Important for readers that surface upgrade prompts ("you've hit your free article limit; upgrade now and pay $X today").

Values:

- `none` — no proration; the new tier starts at the next billing cycle
- `daily` — pro-rated to the day
- `immediate` — full charge at the moment of upgrade; old plan canceled
- `psp-default` — defer to the PSP's default behavior

```xml
<om:offer id="paid-monthly" tier="paid">
  <om:proration>daily</om:proration>
  <om:checkout psp="stripe" price_id="price_..." />
</om:offer>
```

Stripe defaults to `daily`; Mollie has no native proration and `none` is the only honest declaration unless the publisher implements proration manually. A reader showing an upgrade prompt SHOULD compute the prorated amount client-side using the declared policy and current subscription start date, so the user knows what they're agreeing to.

---

## 7. Updated Reader Conformance Levels

Levels 1–6 from 0.3 unchanged. New in 0.4:

- **Level 7 (Privacy)** — supports OM-VC-SD 1.0 presentations including pseudonymous mode.
- **Level 8 (Bundles)** — accepts bundle credentials and the aggregator-trust verification flow.

Levels are cumulative: a Level 8 reader supports everything from Levels 1 through 7.

### 7.1 Recommended Profiles

To keep adoption tractable, three named profiles are recommended:

- **"Indie Reader" Profile** — Levels 1, 2, 5. Supports url-token feeds, in-app Stripe checkout, prospective-only revocation. The minimum viable shape that works for most newsletter and indie-podcast use cases.
- **"Enterprise Reader" Profile** — Levels 1, 2, 3, 4, 5. Adds bearer auth, OM-VC verification, full PSP support. The shape an organizational reader (Inoreader, Feedly) should aim for to support B2B customers.
- **"Privacy Reader" Profile** — Levels 1, 2, 3, 4, 5, 7. Adds pseudonymous OM-VC-SD support. The shape a journalism-focused or privacy-focused reader should aim for.

A reader publishing its conformance statement SHOULD use one of these profile names plus any extensions.

---

## 8. Updated Publisher Conformance

0.3 rules apply, plus:

- A publisher using `<om:revocation policy="...">` MUST honor the declared policy in their PSP webhook handlers.
- A publisher operating as a bundle aggregator MUST satisfy §3.5 conformance requirements.
- A publisher declaring `<om:bundled-from>` MUST verify presented bundle credentials per §3.4.
- A publisher declaring `<om:privacy>pseudonymous-required</om:privacy>` MUST refuse non-pseudonymous credentials and MUST NOT correlate disclosed pseudonyms with external identifiers in any persistent log.
- A publisher offering `<om:gift>` MUST hold gift entitlements in escrow until redemption, and MUST honor `transferable="false"` if declared.

---

## 9. Updated Discovery Document

The `.well-known/open-membership` document gains:

```json
{
  "spec_version": "0.4",
  "...": "all 0.3 fields preserved",

  "revocation": {
    "policy": "prospective-only",
    "grace_hours": 48
  },

  "privacy": {
    "level": "pseudonymous",
    "supported_presentations": ["full", "selective-disclosure"]
  },

  "bundles": {
    "is_aggregator": false,
    "bundled_from": [
      {
        "provider": "https://aggregator.example",
        "trust": {
          "did": "did:web:aggregator.example",
          "jwks_uri": "https://aggregator.example/.well-known/jwks.json"
        }
      }
    ]
  },

  "gifts": {
    "supported": true,
    "redeemable_via": "https://fieldnotes.example/gift/redeem"
  },

  "verifiable_credentials": {
    "profile": "https://purl.org/rss/modules/membership/vc-profile/1.0",
    "selective_disclosure_profile": "https://purl.org/rss/modules/membership/vc-sd-profile/1.0",
    "cryptosuite": "bbs-2023",
    "...": "..."
  }
}
```

---

## 10. The Long-Term Privacy Question (Acknowledged, Not Solved)

OM-VC-SD provides per-publisher pseudonymity at the credential layer. It does not provide network-layer or payment-method unlinkability. A reader that always uses the same IP address and always pays with the same card is still trackable. The protocol can address the credential layer; the surrounding infrastructure cannot be fixed by an XML namespace.

What 0.4 does provide:

- A subscriber to ten different publishers under one umbrella aggregator can be ten different pseudonyms to those ten publishers.
- A publisher cannot prove that any two of its subscribers came from the same upstream identity.
- A subscriber's payment to Stripe is visible to Stripe but not to the publisher's analytics, if the subscriber chooses pseudonymous mode.

What 0.4 does NOT provide:

- Network-level anonymity (reader still connects from a real IP)
- Payment-method anonymity (PSPs see payment cards)
- Protection against malicious publishers who log against the disclosed pseudonym and link it to article access patterns

These are real limits and the spec names them so implementers don't oversell the privacy properties to users.

---

## Appendix A — Worked Example: Investigative Journalism Publisher

A small investigative news organization wants paid subscriptions but cannot ethically maintain a subscriber list that could be subpoenaed.

```xml
<rss version="2.0" xmlns:om="http://purl.org/rss/modules/membership/">
  <channel>
    <title>Underreported</title>
    <om:provider>https://underreported.example</om:provider>
    <om:discovery>https://underreported.example/.well-known/open-membership</om:discovery>

    <om:authMethod>vc-presentation</om:authMethod>
    <om:privacy>pseudonymous-required</om:privacy>
    <om:revocation policy="prospective-only" grace_hours="168" />

    <om:psp id="stripe" account="acct_..." />
    <om:tier id="paid" price="USD 12.00" period="monthly">Supporter</om:tier>
    <om:feature id="long-form">Long-form investigations</om:feature>

    <om:offer id="supporter-monthly" tier="paid">
      <om:price amount="12.00" currency="USD" period="P1M" />
      <om:checkout psp="stripe" price_id="price_supporter_..." />
    </om:offer>

    <!-- Optional umbrella issuer; subscribers can also self-issue via supported wallets -->
  </channel>
</rss>
```

Subscriber flow:

1. Subscriber pays via Stripe (Stripe sees the payment; Underreported sees only that an entitlement was issued).
2. Umbrella issuer signs an OM-VC-SD credential including the subscriber's email, full name, and pseudonym salts. The credential never reaches Underreported in full form.
3. Subscriber's reader generates a derived BBS proof disclosing only `publisher`, `tier`, `validFrom`, `validUntil`, and a per-publisher pseudonym.
4. Underreported's verification endpoint validates the proof, issues a 1-hour bearer token scoped to the pseudonym.
5. Subscriber reads articles; Underreported logs the pseudonym, not an identity.
6. If Underreported is subpoenaed, they can produce their pseudonym→article-access logs but cannot link any pseudonym to a real person.

This is the failure mode that motivates §4. Without it, Underreported either (a) refuses paid subscriptions, (b) accepts surveillance risk for its subscribers, or (c) builds custom infrastructure.

---

## Appendix B — Worked Example: Indie Bundle

Three independent publishers form a bundle. None gives up their direct subscription business; the bundle is additive.

The bundle aggregator's feed declares:

```xml
<om:bundle id="indie-news" audience="https://fieldnotes.example https://underreported.example https://localcity.example">
  <om:offer id="bundle-monthly">
    <om:price amount="20.00" currency="USD" period="P1M" />
    <om:checkout psp="stripe" price_id="price_bundle_..." />
  </om:offer>
</om:bundle>
```

Each participating publisher's feed declares:

```xml
<om:bundled-from provider="https://indie-bundle.example">
  <om:trust did="did:web:indie-bundle.example" />
</om:bundled-from>
```

Subscriber flow:

1. Subscriber pays $20/mo to the aggregator.
2. Aggregator issues an OM-VC with `audience: ["https://fieldnotes.example", "https://underreported.example", "https://localcity.example"]`.
3. When the subscriber's reader fetches Field Notes' feed, it presents the bundle credential to Field Notes' verification endpoint.
4. Field Notes validates: aggregator is in `<om:bundled-from>`, audience contains Field Notes' provider URI, status list check passes.
5. Field Notes issues a Field-Notes-scoped bearer token.
6. The same flow runs for the other two publishers.

The aggregator never holds Field Notes' content; Field Notes never holds aggregator subscriber data beyond the pseudonym. Revenue share between aggregator and publishers is settled out of band, governed by whatever business agreement they signed.

---

# Part II: The Plan for 0.5

This section is non-normative. It is a plan, not a specification.

The temptation after a feature-complete 0.4 is to draft 0.5 as another feature-set expansion. **0.5 should not add features.** The protocol now has more than enough conceptual surface area for any plausible paid-content use case. What it lacks is *evidence that it works*.

0.5 is the version that produces that evidence, with three concrete deliverables.

## A. Reference Implementations (Two, On Opposite Sides of the Wire)

**A.1 Publisher reference: `om-ghost`**

A Ghost CMS plugin that:

- Reads Ghost's existing Members configuration (tiers, prices)
- Emits RSS feeds with full `om` 0.4 markup
- Serves the `.well-known/open-membership` document
- Wraps Ghost's existing Stripe integration to expose the `/api/checkout`, `/api/entitlements`, and `/api/portal` endpoints
- Exposes a JWT-issuing token endpoint that includes Stripe entitlements as claims
- Optionally issues OM-VC credentials using a configurable signing key

Estimated effort: 4–6 weeks for one experienced developer. Ghost is the right first target because its Members feature is the closest existing primitive to what `om` describes, the codebase is open and approachable, and the Ghost community is already philosophically aligned (independent publishers, subscription models, no algorithmic feed).

A WordPress equivalent should follow within the same 0.5 cycle, ideally as a fork of an existing membership plugin (Paid Memberships Pro, MemberPress) rather than a green-field build. The point is breadth of CMS support, not technical novelty.

**A.2 Reader reference: forked Miniflux or NetNewsWire**

Miniflux is the better target than NetNewsWire for v0:

- Self-hosted, written in Go, code is small and approachable
- Already has multi-account and feed-per-user semantics
- The maintainer (Frédéric Guillot) has a track record of accepting well-scoped PRs
- Web UI means the checkout flow can use a real browser without per-platform native integration

The Miniflux fork should implement the "Indie Reader" profile (Levels 1, 2, 5): parse `om` markup, do url-token and bearer auth, support `<om:offer>` checkout flow against Stripe, evaluate `<om:feature>` claims. Adding pseudonymous OM-VC-SD support comes later; v0 is about proving the everyday case works.

NetNewsWire is the better long-term target (production iOS reader, large active user base, also open-source) but the Apple platform constraints make it a harder first build. Better to prove the protocol with Miniflux, then port to NetNewsWire in 0.6.

**A.3 Interoperability test: live deployment**

The criterion for "0.5 done" is not "the implementations exist" but "a real subscriber paid a real publisher through one and read content in the other." This is a qualitatively different bar. It surfaces every assumption the spec made that doesn't survive contact with reality:

- Does the discovery flow actually resolve when the publisher is on a custom domain?
- Does the Stripe webhook arrive before the user clicks back to the reader?
- Does revocation propagate correctly when the subscriber cancels in Stripe's customer portal?
- What happens when the subscriber switches readers mid-subscription?

Each of these is a 0.5 errata candidate. The spec text won't change in major ways; the conformance requirements will tighten in response to what breaks.

## B. Test Suite

**B.1 The `om-test-suite` project**

A standalone HTTP service that, given a feed URL, runs all the conformance checks in spec order and produces a pass/fail report per level. Modeled directly on the W3C VC v2.0 Interoperability Report.

Test categories:

- **Parsing:** does the feed declare the namespace correctly, do all required elements appear, do attribute types validate
- **Discovery:** does `.well-known/open-membership` resolve, does it match the `<om:provider>`, do all required fields validate
- **Auth:** does the token endpoint accept a valid credential and reject an invalid one, does the bearer token gate content
- **Checkout:** does the checkout endpoint accept a valid POST and return a Stripe Session ID (test mode), does the session URL render
- **Entitlement lifecycle:** does the published webhook handler update entitlements within 60 seconds of a Stripe test event
- **Revocation:** does a test chargeback event trigger the declared revocation policy
- **Bundle (optional):** does a presented bundle credential get accepted by a participating publisher

Each test produces an artifact (HTTP request/response transcript, validation log) so failures can be debugged without re-running the full suite.

The test suite is *the* artifact that lets `om` claim "interoperable" credibly. It also resolves the political question of who counts as conformant: the suite does, not the spec authors.

**B.2 Adversarial tests**

A separate set of tests that try to break the spec:

- Token replay across publishers (should fail at non-bundled publishers)
- Bundle credential without `audience` matching (should fail)
- Pseudonymous credential presented to non-pseudonymous publisher (should be accepted as full disclosure)
- Time-window evaluation around DST and leap-second boundaries
- Webhook order-of-arrival edge cases (refund arrives before subscription.created)

Adversarial test failures during 0.5 are 0.5 errata; failures discovered after 1.0 are governance issues.

## C. Governance Foundation

**C.1 Custodian commitment**

Before 1.0, the spec must have a neutral home. The 0.5 cycle is when this conversation happens. The shortlist:

1. **Internet Archive.** Mission-aligned, has hosted similar specs, low political overhead. Probably the easiest "yes."
2. **NLnet Foundation.** Already funds open-internet infrastructure; a custodian role is adjacent to their existing work. Likely yes if a credible work plan accompanies the ask.
3. **Software Freedom Conservancy.** Boring, durable, the safest choice. Most procedural overhead.
4. **A new lightweight foundation modeled on the Podcast Index.** Best fit philosophically, requires the most work to set up, would give the spec the most independence.

The order to ask in: Internet Archive first (lowest cost, fast answer), NLnet second (best fit), Conservancy as the safe fallback. Skip the new-foundation route unless all three of the above decline; the spec doesn't yet have enough deployments to justify standing up new institutional machinery.

The custodian's role is narrow: hold the namespace URI and the canonical spec text, host the test suite, and serve as a point of escalation if the working group dissolves. They do not need to fund or staff the working group.

**C.2 Working group formation**

A working group of 5–8 people, of whom at least one is funded part-time. Composition:

- Two from independent publisher backgrounds (Ghost or Substack-refugee newsletter operators)
- Two from reader-app backgrounds (Miniflux, NetNewsWire, Inoreader)
- One from the W3C VC working group orbit (for the OM-VC-SD work)
- One from the Podcasting 2.0 community (for the `podcast:value` co-existence story)
- One paid coordinator

Funding for the coordinator is the single most important piece. NLnet's NGI Zero programs are the right shape (small grants, multi-year, no equity, mission-aligned). Application takes ~3 weeks to write, decisions usually come within a quarter.

Failing NLnet, the next best ask is Stripe directly: they fund a lot of open-protocol work because it's strategically useful when payment infrastructure stays open. The pitch is "you already invest in keeping the web's commerce layer competitive; here's a small intervention that does that for paid content."

**C.3 RFC submission preparation**

The spec gets submitted as an IETF Independent Submission, not Standards Track. Independent Submissions get an RFC number without requiring a working-group charter, multi-year IETF process, or vendor consensus. This is what the original RSS specs effectively did (via Resource.org and W3C purl space), and it's the right shape for a spec that has multiple deployments but no incumbent industry sponsors.

The submission package needs:

- A clean spec document in IETF format (mostly mechanical conversion from the current Markdown)
- An Implementation Status section listing the reference implementations and any other deployments
- A Security Considerations section addressing token theft, credential replay, revocation race conditions, and the privacy limits acknowledged in §10
- An IANA Considerations section requesting registration of the namespace URI and `.well-known` suffix

Submission goes to the Independent Stream Editor (currently Eliot Lear); review timeline is typically 6–12 months.

## D. The Order

If 0.5 had to be sequenced strictly:

- **Months 1–2:** `om-ghost` plugin development. Nothing else matters until a real publisher can ship.
- **Months 2–3:** Miniflux fork in parallel with `om-ghost` finishing. First end-to-end interop test by month 3.
- **Months 3–4:** Test suite v1, covering at minimum the Indie Reader profile.
- **Months 4–5:** First non-affiliated publisher onboarded. This is the qualitative milestone — when someone the spec authors don't know publishes a real `om` feed and gets paid through it, the protocol exists in the world in a way it didn't before.
- **Months 5–6:** Custodian conversation, working group formation, NLnet application.
- **Months 6–9:** WordPress port, NetNewsWire fork, second non-affiliated publisher, RFC submission package preparation.

By month 9, the criteria for 1.0 are in sight: two reference implementations, a working test suite, three or more independent publishers, a neutral custodian commitment, a funded coordinator, and an RFC in the submission queue.

## E. What Does Not Belong in 0.5

Worth saying explicitly so the discipline is visible:

- **No new tags.** If a real implementer hits a missing primitive, file an issue and discuss for 1.0; don't quietly add it to 0.5.
- **No new PSP profiles.** Stripe and Mollie cover ~95% of the addressable publisher market between them. Adding Adyen, Paddle, or Chargebee profiles is 1.x work, after adoption proves the spec is alive.
- **No new credential profiles.** OM-VC 1.0 and OM-VC-SD 1.0 are enough. Anything else is 1.x.
- **No "Open Membership Foundation."** Premature institutionalization is what kills small protocols. The custodian arrangement in C.1 is enough governance for 1.0.

## F. The Failure Modes to Watch

Three specific risks during the 0.5 cycle:

1. **Spec-tinkering procrastination.** Drafting 0.6 because the implementations are taking too long. The right response to a slow implementation is to help the implementer, not to write more spec.
2. **Premature platform engagement.** A surprise email from Spotify or Substack saying "we'd like to discuss adopting your spec" is, in 0.5, more dangerous than no engagement at all. The right answer is "we'd love to talk after 1.0; here's our roadmap." Engaging too early invites design pressure that distorts the spec away from indie-publisher fit.
3. **Crypto-suite churn.** `bbs-2023` is at Candidate Recommendation. If the W3C process re-opens substantive issues and the cryptosuite changes meaningfully, OM-VC-SD 1.0 will need a corresponding update. Watch the W3C VC WG mailing list; budget for one OM-VC-SD point release in 0.5 if needed.

---

## Acknowledgements (0.4)

In addition to all 0.1–0.3 acknowledgements, 0.4 builds on the W3C BBS+ cryptosuite working group (Bernstein, Sporny, Lodder, et al. — `bbs-2023` is the technical foundation of the privacy work), the Podcast Index team (whose discipline around saying "no" to feature requests is the model for §E), and the WorkOS Stripe Entitlements team (whose JWT-claims pattern is the implementation backbone of §3 bundles).
