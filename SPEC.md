# Open Membership RSS 0.4

**An RSS module for paid subscription content.**

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

## Featureset

The capabilities this spec defines, by element family. See `docs/FEATURESET.md` for a per-version breakdown.

- **Namespace and access**: RSS 2.0 and RSS 1.0/RDF declarations; `<om:provider>`; `<om:authMethod>` (`url-token`, `http-basic`, `bearer`, `dpop`); per-item `<om:access>` (`open`, `preview`, `locked`, `members-only`); `<om:preview>`; `<om:unlock>`; `<om:receipt>`.
- **Discovery and identity**: `.well-known/open-membership` (composes with RFC 9728); `<om:window>` for time-gated content; `<om:group>` (publisher-managed and self-managed) with SCIM 2.0 binding; OM-VC 1.0 (W3C VC 2.0); Bitstring Status List revocation.
- **Payments and value**: `<om:psp>` declarations (Stripe, Mollie, PayPal, Adyen, Paddle, Lightning, custom); `<om:feature>`; `<om:offer>` with multiple PSPs and currencies; in-reader checkout; `<om:value>` / `<om:recipient>` / `<om:split>`; Podcasting 2.0 coexistence.
- **Privacy and lifecycle**: `<om:revocation>` policy; `<om:bundle>` cross-publisher aggregation; OM-VC-SD 1.0 (BBS+ selective disclosure); pseudonymous tier; `<om:gift>`; proration declaration; per-publisher pseudonyms.

---

## 2. Refunds, Chargebacks, and Revocation

### 2.1 `<om:revocation>` (channel-level, optional)

Declares the publisher's policy for revoking access after a refund, chargeback, or subscription cancellation. Discoverable in `.well-known/open-membership` so a reader can show the user what they're agreeing to before paying.

Attributes:

- `policy` (required), one of:
  - `prospective-only`, once content is delivered, the subscriber keeps it; only future content is gated. Default; matches Substack and most newsletter business models.
  - `chargeback-revocation`, refunds keep delivered content, but a chargeback (an externally-initiated dispute) revokes future tokens *and* invalidates the subject's existing access tokens for redelivery purposes.
  - `full-revocation`, refund or chargeback revokes everything; the subscriber's tokens are invalidated. Appropriate for subscription bundles where retroactive billing is the norm.
- `grace_hours` (optional), number of hours after subscription end during which the reader can still fetch already-listed content (useful for cached feeds and offline readers). Default: `0`.

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

- `id` (required), opaque identifier
- `audience`, space-separated list of provider URIs included in the bundle

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

- `standard` (default), full credential claims expected
- `pseudonymous`, readers SHOULD present OM-VC-SD credentials with selective disclosure; publishers MUST NOT log or correlate disclosed pseudonyms with external identifiers
- `pseudonymous-required`, non-pseudonymous credentials are rejected

```xml
<om:privacy>pseudonymous</om:privacy>
```

A publisher declaring `pseudonymous` or `pseudonymous-required` makes a binding commitment that affects what data they may collect. Auditing this commitment is out of scope for the protocol, but the protocol gives readers a way to choose privacy-respecting publishers.

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

- `offer` (required), references an `<om:offer>` id
- `redeemable_via` (required), URL where the recipient redeems the token
- `transferable` (optional), `true` (default) or `false`; if `false`, the gift can only be redeemed by the email/identity specified at purchase

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

- `none`, no proration; the new tier starts at the next billing cycle
- `daily`, pro-rated to the day
- `immediate`, full charge at the moment of upgrade; old plan canceled
- `psp-default`, defer to the PSP's default behavior

```xml
<om:offer id="paid-monthly" tier="paid">
  <om:proration>daily</om:proration>
  <om:checkout psp="stripe" price_id="price_..." />
</om:offer>
```

Stripe defaults to `daily`; Mollie has no native proration and `none` is the only honest declaration unless the publisher implements proration manually. A reader showing an upgrade prompt SHOULD compute the prorated amount client-side using the declared policy and current subscription start date, so the user knows what they're agreeing to.

---

## 7. Reader Conformance Levels

Eight cumulative levels. Full level definitions and effort estimates are in `docs/FEATURESET.md`.

- **Level 7 (Privacy)** supports OM-VC-SD 1.0 presentations including pseudonymous mode.
- **Level 8 (Bundles)** accepts bundle credentials and the aggregator-trust verification flow.

### 7.1 Recommended Profiles

- **Indie Reader**: Levels 1, 2, 5. URL-token feeds, in-app checkout, prospective-only revocation.
- **Enterprise Reader**: Levels 1, 2, 3, 4, 5. Adds bearer auth, OM-VC verification, full PSP support.
- **Privacy Reader**: Levels 1, 2, 3, 4, 5, 7. Adds pseudonymous OM-VC-SD support.

A reader publishing its conformance statement SHOULD use one of these profile names plus any extensions.

---

## 8. Publisher Conformance

- A publisher using `<om:revocation policy="...">` MUST honor the declared policy in their PSP webhook handlers.
- A publisher operating as a bundle aggregator MUST satisfy §3.5 conformance requirements.
- A publisher declaring `<om:bundled-from>` MUST verify presented bundle credentials per §3.4.
- A publisher declaring `<om:privacy>pseudonymous-required</om:privacy>` MUST refuse non-pseudonymous credentials and MUST NOT correlate disclosed pseudonyms with external identifiers in any persistent log.
- A publisher offering `<om:gift>` MUST hold gift entitlements in escrow until redemption, and MUST honor `transferable="false"` if declared.

---

## 9. Discovery Document

`.well-known/open-membership` shape:

```json
{
  "spec_version": "0.4",
  "...": "see SPEC-DISCOVERY.md for full schema",

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

## Appendix A, Worked Example: Investigative Journalism Publisher

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

## Appendix B, Worked Example: Indie Bundle

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

Estimated effort: 4-6 weeks for one experienced developer. Ghost is the right first target because its Members feature is the closest existing primitive to what `om` describes, the codebase is open and approachable, and the Ghost community is already philosophically aligned (independent publishers, subscription models, no algorithmic feed).

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

A working group of 5-8 people, of whom at least one is funded part-time. Composition:

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

Submission goes to the Independent Stream Editor (currently Eliot Lear); review timeline is typically 6-12 months.

## D. The Order

If 0.5 had to be sequenced strictly:

- **Months 1-2:** `om-ghost` plugin development. Nothing else matters until a real publisher can ship.
- **Months 2-3:** Miniflux fork in parallel with `om-ghost` finishing. First end-to-end interop test by month 3.
- **Months 3-4:** Test suite v1, covering at minimum the Indie Reader profile.
- **Months 4-5:** First non-affiliated publisher onboarded. This is the qualitative milestone, when someone the spec authors don't know publishes a real `om` feed and gets paid through it, the protocol exists in the world in a way it didn't before.
- **Months 5-6:** Custodian conversation, working group formation, NLnet application.
- **Months 6-9:** WordPress port, NetNewsWire fork, second non-affiliated publisher, RFC submission package preparation.

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

## G. What We Can Learn From Other Open Specs

A spec doesn't get to 1.0 in a vacuum. Several recent open protocols have walked the same road we're on, and their successes and failures map directly onto choices `om` faces in 0.5. The point of this section isn't to pick a winner; it's to be honest about which patterns worked, which didn't, and what that means for how we operate.

### G.1 Podcasting 2.0, the most direct precedent

The closest analog. The Podcast Index team (Adam Curry, Dave Jones, and a small group of contributors) added a namespace to RSS, hosted it themselves, kept it open, and let the indie ecosystem adopt it before the incumbents. As of late 2025, millions of podcast episodes carry `podcast:transcript`, half a million carry `podcast:chapters`, and the `podcast:value` tag has driven real (if small) Lightning revenue to thousands of shows.

What worked:

- **Hosting the index themselves.** Podcast Index is both the spec custodian and the operator of an actual public service (the index of feeds). This dual role, protocol stewardship plus a working artifact, gave the spec gravitational pull that pure standards bodies struggle to generate.
- **"Rules for Standards-Makers" discipline.** Once an element is canonized, backward compatibility is prioritized; new elements go through a draft phase. This is the rule `om` already adopts.
- **Compatibility-first.** Every Podcasting 2.0 tag is invisible to a reader that doesn't understand it. A regular podcast app sees a regular RSS feed. This is the same call `om` makes and it's been validated at scale.
- **Opinionated about what to refuse.** The team has been explicit about not courting Apple or Spotify. Indie ecosystem first, incumbents later or never. This is exactly the discipline 0.5 §F.2 codifies for `om`.

What didn't work as well:

- **`podcast:value` adoption is narrow.** Lightning-only by design, which means the universe of compatible apps is small (Fountain, Podverse, CurioCaster, a handful of others) and the universe of compatible listeners is even smaller. The spec's commercial primitive is technically elegant but commercially marginal, most podcast revenue still flows through Patreon, Apple Subscriptions, and Spotify Subscriptions, none of which use `podcast:value`. **This is the explicit motivation for `om`'s multi-PSP design.** Lightning is a recipient, not the only recipient.
- **No bundle or aggregator pattern.** A listener can't pay one fee and get gated access to ten Podcasting 2.0 podcasts. The "podroll" tag is a discovery primitive, not an entitlement primitive. `om` 0.4 §3 is the explicit response.

The implication for `om`'s 0.5 plan: the Podcast Index governance shape is the model to copy. A small team, a real working artifact (in our case, the test suite from §B), and the explicit indie-first stance.

### G.2 ActivityPub, the cautionary tale on monetization

ActivityPub is now the dominant federated social protocol, Mastodon, Threads, WordPress, Ghost, Flipboard, and Pixelfed all speak it. By any structural measure it is a wildly successful open spec. But on monetization specifically, the protocol has effectively punted: there is no standard for paid follows, paid posts, or subscription-gated content. ActivityPub's co-author Evan Prodromou famously runs a paid-access Mastodon account by manually wrapping a PayPal subscription around server-side ACL, entirely outside the protocol layer.

What we learn:

- **Monetization is not solved by leaving it implicit.** ActivityPub's silence on paid content has produced a Cambrian explosion of bespoke per-server hacks: Patreon-bridged Mastodon accounts, Bandcamp embeds, Stripe links in profile fields. This is exactly the fragmentation `om` is meant to prevent.
- **Successful federated protocols generate "find their Gmail" pressure.** ActivityPub now has Threads on it; in five years it will probably have Meta or another large operator hosting half the active accounts. `om` will face the same pressure if it succeeds. The 0.5 plan's discipline about premature platform engagement (§F.2) is the inoculation.
- **Test infrastructure is funded work, not volunteer work.** In 2023, Germany's Sovereign Tech Fund granted €152,000 to socialweb.coop specifically to build an ActivityPub interoperability test suite. The lesson: serious test infrastructure for an open protocol needs serious funding. The NLnet conversation in §C.2 is in this tradition; the Sovereign Tech Fund itself should be added to the funding-target list.
- **Account portability is *the* hardest unsolved problem in federated identity.** ActivityPub has been at this for nearly a decade and still doesn't have clean account-migration. This validates `om`'s decision to delegate identity to a publisher or umbrella rather than try to define a portable subscriber identity from first principles. We use W3C VC + DIDs because they exist and work; we don't try to invent better.

The implication for `om`'s 0.5 plan: the Sovereign Tech Fund is a funding target alongside NLnet. The pitch writes itself, "fund the open-spec test suite for paid content the way you funded the one for federated social."

### G.3 OpenID Connect, the patience model

OIDC took roughly four years from initial work (2010) to final spec (2014), and another five to become the default in production-grade B2B. It is now the most-deployed identity protocol on the open web after SAML, and it dominates new deployments.

What we learn:

- **The reference implementations matter more than the spec.** Auth0, Okta, AWS Cognito, and (later) WorkOS shipped OIDC implementations that "just worked." Companies adopted OIDC because they could buy a turnkey implementation, not because they read the spec. `om-ghost` and the Miniflux fork in §A play the same role: the protocol exists when there's a turnkey implementation available.
- **A certification program is what makes "compliant" mean something.** OIDF's self-certification process (publishers run a test suite, post results) is what every enterprise procurement department now demands. The `om-test-suite` in §B is the seed of this. By 1.0, "self-certify your `om` conformance level" should be a standard step in any implementer's release process.
- **Standards bodies aren't required for serious adoption.** OIDC is governed by the OpenID Foundation, not IETF or W3C. It works because the foundation is small, focused, and run by people who actually ship code. This is the "lightweight foundation" option from §C.1, and OIDF is the right model to study if `om` ends up needing one.

### G.4 Signal Protocol, the don't-do-this lesson

Signal Protocol is technically excellent, philosophically aligned with the open-internet ethos `om` shares, and effectively a closed ecosystem. Despite being open-source and well-documented, every meaningful deployment of Signal Protocol runs through Signal Messenger or WhatsApp; independent implementations are rare and usually broken. The spec exists; the adoption is captured.

Why? Two reasons relevant to `om`:

- **No registry, no discovery.** Signal Protocol has no notion of a public directory of implementations or a way for two implementations to find each other. The `.well-known/open-membership` document and the discovery flow in 0.2 §7 exist specifically to avoid this failure mode.
- **The reference implementation is also a service.** Signal the messenger is operated by Signal Foundation, who also stewards the protocol. Adoption equals using their service. `om` deliberately separates these, the test suite is the artifact, not a hosted service. We are not in the business of operating a "default `om` provider."

The implication: any tendency in 0.5 toward "we should host a default umbrella provider for indie publishers" should be resisted. The protocol's value is that it is not a service.

### G.5 IndieWeb (Webmention, Micropub, IndieAuth), the long-tail success

The IndieWeb suite, Webmention (W3C Recommendation), Micropub (W3C Recommendation), IndieAuth (in widespread independent use), represents what realistic open-web success at small scale looks like. None of these have hundreds of millions of users; all of them have stable, multi-implementation deployments that have lasted a decade.

What we learn:

- **Small can be successful.** IndieWeb has maybe 5,000 active practitioners. By any "platform" standard, that's a rounding error. By the standard `om` should aim for, "indie publishers can run their entire stack on this", it's a complete success. The right ambition for `om` 1.0 is "a few hundred publishers in production," not "every newsletter on Substack." IndieWeb is proof that the smaller goal is sustainable.
- **The IndieWebCamp model.** Twice-yearly small in-person events where implementers gather, demo what they're building, and propose spec changes face-to-face. Cheap to run, builds the social fabric a small protocol needs, surfaces interop problems faster than mailing lists ever do. **An `om` working group should plan to host two events in the 0.5-1.0 cycle.** Even ten people in a room for two days will move the spec faster than three months of GitHub issues.
- **Don't fight the platforms; route around them.** IndieWeb explicitly does not try to convert Twitter or Facebook users; it builds for people who already want to leave. The same posture is right for `om`.

### G.6 RSS itself, the spec that won by accident

The deepest lesson, and the one easiest to get wrong because it looks like luck. RSS won because:

- It was simple enough that a competent developer could implement it in an afternoon.
- It survived its creator's company collapsing because Winer transferred ownership to Harvard *before* it mattered.
- It had two genuinely different forks (1.0/RDF and 2.0/Winer) competing on the merits, which forced both to be robust.
- The orange icon became the de facto identifier and gave non-technical users a thing to click.

Three of these four things are within `om`'s control:

- **Simplicity.** The full spec is now ~600 lines of Markdown. A competent developer can implement Level 5 in a week. This is acceptable but worth defending against, every 0.5 errata that adds complexity is a tax on adoption.
- **Custodian transfer before it matters.** This is §C.1 and it must happen in 0.5, not after. Waiting until the spec is "popular enough to need governance" is exactly the failure mode that killed many specs Winer's transfer rescued RSS from.
- **A social fabric.** §G.5's IndieWebCamp model. The "two genuinely different forks competing on merits" can be approximated by encouraging *intentional* implementation diversity early, not one canonical Ghost plugin and one canonical reader, but several of each, deliberately taking different design choices within the spec's bounds.

The fourth thing, the orange icon, is the visual-identity question. It probably doesn't matter much, but if `om` ends up needing a recognizable mark by 1.0, it should be commissioned cheaply (a freelance designer, a few hundred dollars) and released CC0. Don't overthink it.

## Appendix C, Companion specs

The main spec keeps its scope narrow: what a publisher puts in a feed and what a reader does with it. Two companion documents extend the model to the parts of a deployment that happen off-feed:

- **[Subscriber Portability Format 1.0](spec/SPEC-PORTABILITY.md)** (`http://purl.org/rss/modules/membership/portability/1.0`), cross-reader export/import shape for a user's stored tokens, credentials, receipts, bundle memberships, and pending gifts. JSON-LD body, age or JWE encryption, passphrase-based. Answers "how does a subscriber switch from Miniflux to NetNewsWire without re-subscribing everywhere?" without introducing a portable cross-publisher identity. Required reading-round-trip for Level 5+ reader conformance at 1.0.

Companion specs follow the same versioning as the parent: a 1.0 reader consuming a 1.0 companion artifact is guaranteed to interoperate with any other 1.0-conformant reader that produces one.

---

## Acknowledgements (0.4)

In addition to all 0.1-0.3 acknowledgements, 0.4 builds on the W3C BBS+ cryptosuite working group (Bernstein, Sporny, Lodder, et al., `bbs-2023` is the technical foundation of the privacy work), the Podcast Index team (whose discipline around saying "no" to feature requests is the model for §E), and the WorkOS Stripe Entitlements team (whose JWT-claims pattern is the implementation backbone of §3 bundles).

The §G open-spec analysis draws on public histories and current operational patterns of the Podcast Index, the W3C SocialCG (ActivityPub), the OpenID Foundation (OIDC), the Signal Foundation, and the IndieWeb community. The §H platform analysis is built from publicly observable behavior and published documentation of Substack, Patreon, Apple Podcasts Subscriptions, and Spotify Podcasts Subscriptions; particular thanks to the third-party developers whose work on RSS-Bridge, the Substack Chrome extension, and `nicholas.cloud`'s Patreon-RSS bridge made the actual mechanisms legible without requiring guesswork. None of these projects endorse `om`; the spec's reading of how their target platforms work is its own.
