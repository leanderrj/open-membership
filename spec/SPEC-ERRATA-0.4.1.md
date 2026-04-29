# Open Membership RSS, 0.4.1 Errata

- **Spec:** Open Membership RSS 0.4
- **Errata version:** 0.4.1
- **Status:** Draft
- **Release date:** 2026-04-24
- **Canonical URI:** `http://purl.org/rss/modules/membership/errata/0.4.1`
- **Parent spec:** [SPEC.md](SPEC.md)
- **Feature matrix:** [../docs/FEATURESET.md](../docs/FEATURESET.md)

## Summary

This errata clarifies two points in the 0.4 specification that were found to be underspecified during `om-ghost` and `om-wordpress` production deployments: (1) how a publisher declares whether a `<om:price>` `amount` is inclusive or exclusive of sales tax and to which jurisdiction that declaration applies, and (2) how the authentication method declared by `<om:authMethod>` for a feed propagates to the URLs inside `<enclosure>` elements on gated items. Both clarifications are strictly additive: existing 0.4 feeds and existing 0.4 readers continue to interoperate without change. No new elements are introduced. Publishers and readers that already honor the behavior described here are already compliant; this document codifies that behavior so new implementers do not need to re-derive it.

---

## Erratum 1: `tax_inclusive` and `tax_jurisdiction` on `<om:price>`

### 1.1 Problem statement

SPEC.md §Commercial (introduced in 0.3) defines `<om:price>` with `amount`, `currency`, and `period` attributes. It does not define whether `amount` is inclusive or exclusive of VAT, GST, sales tax, or any other consumption tax, nor to which jurisdiction the declaration applies. The two dominant PSPs supported by 0.4 reference implementations treat the question inversely:

- **Mollie** treats amounts entered by the merchant as **tax-inclusive by default** (VAT is computed by reverse from the gross amount at reporting time). EU publishers using Mollie cannot honestly declare the displayed price without saying "this includes VAT."
- **Stripe** treats amounts entered by the merchant as **tax-exclusive by default**. If the merchant has enabled Stripe Tax for a given jurisdiction, tax is added at checkout. Otherwise, no tax is computed and the displayed amount is what the customer pays.

Without a declared stance, a reader rendering an offer from a Stripe publisher and an offer from a Mollie publisher cannot tell whether the displayed amounts are comparable. Worse, EU consumer-protection rules (e.g. the EU Consumer Rights Directive) require that prices shown to consumers be tax-inclusive; an EU publisher literally cannot honestly populate `<om:price>` under 0.4 without an attribute that says so.

### 1.2 Clarification

Two OPTIONAL attributes are clarified on `<om:price>`:

- `tax_inclusive`, boolean, one of `true` or `false`. When present, indicates whether `amount` already includes the applicable consumption tax for `tax_jurisdiction`. When absent, the interpretation is implementation-specific and readers MUST NOT assume a default. Publishers SHOULD declare this attribute explicitly on every `<om:price>` they emit.
- `tax_jurisdiction`, either an ISO 3166-1 alpha-2 country code (e.g. `NL`, `DE`, `US`, `GB`, `JP`), or the literal string `multi` when the same `amount` is offered across multiple jurisdictions under the same tax stance. When absent, the jurisdiction is the publisher's declared operating jurisdiction (out of band to the spec; readers that do not know it MUST surface the tax stance without a jurisdiction qualifier).

These attributes are declarations about an `amount`, not instructions to the PSP. The PSP still computes the final charge from its own configuration. The attributes exist so a reader can render the displayed price honestly and so a subscriber can make an informed decision before clicking through to checkout.

### 1.3 Interaction with PSP behavior

The typical mapping between declared attributes and PSP configuration:

| PSP stance | Expected `<om:price>` declaration |
|---|---|
| Mollie, EU publisher | `tax_inclusive="true"`, `tax_jurisdiction="NL"` (or whichever country) |
| Mollie, multiple EU countries under OSS | `tax_inclusive="true"`, `tax_jurisdiction="multi"` |
| Stripe, no Stripe Tax enabled | `tax_inclusive="false"` (jurisdiction optional) |
| Stripe with Stripe Tax enabled for one jurisdiction | `tax_inclusive="false"`, `tax_jurisdiction="<that country>"` |
| Lightning, fiat-denominated | publisher's choice; same rules apply |

These are conventions, not requirements. A publisher who has manually reconciled tax with a Stripe-native tax-inclusive price MAY declare `tax_inclusive="true"` on a Stripe offer; the spec does not inspect PSP configuration.

### 1.4 Reader behavior

A Level 5 reader SHOULD, when rendering an `<om:offer>`:

- Display the `amount` and `currency` as before.
- When `tax_inclusive="true"` is present, append a localized marker equivalent to "(incl. VAT)" or "(incl. tax)" to the price.
- When `tax_inclusive="false"` is present, append a localized marker equivalent to "(excl. VAT)" or "(excl. tax)".
- When `tax_jurisdiction` is present and the reader knows the subscriber's jurisdiction, indicate whether the two match; if they do not, surface a non-blocking advisory (the actual price at checkout may differ).
- When neither attribute is present, render the price as in 0.4 with no marker. Readers MUST NOT fabricate a default stance.

Readers at Level 4 or below are not required to surface these attributes but MUST NOT reject a feed that contains them.

### 1.5 XML example

Before (0.4):

```xml
<om:offer id="supporter-monthly" tier="paid">
  <om:price amount="12.00" currency="EUR" period="P1M" />
  <om:checkout psp="mollie" price_id="..." />
</om:offer>
```

After (0.4.1, same publisher, Mollie, NL):

```xml
<om:offer id="supporter-monthly" tier="paid">
  <om:price amount="12.00" currency="EUR" period="P1M"
            tax_inclusive="true" tax_jurisdiction="NL" />
  <om:checkout psp="mollie" price_id="..." />
</om:offer>
```

After (0.4.1, Stripe publisher in the US without Stripe Tax):

```xml
<om:offer id="supporter-monthly" tier="paid">
  <om:price amount="12.00" currency="USD" period="P1M"
            tax_inclusive="false" tax_jurisdiction="US" />
  <om:checkout psp="stripe" price_id="..." />
</om:offer>
```

### 1.6 Discovery document

The same two attributes are echoed in the `offers[].price` block of `.well-known/open-membership` so the same declaration is visible without parsing the feed:

```json
{
  "spec_version": "0.4",
  "errata": ["0.4.1"],
  "offers": [
    {
      "id": "supporter-monthly",
      "tier": "paid",
      "price": {
        "amount": "12.00",
        "currency": "EUR",
        "period": "P1M",
        "tax_inclusive": true,
        "tax_jurisdiction": "NL"
      },
      "checkout": {
        "psp": "mollie",
        "price_id": "..."
      }
    }
  ]
}
```

The `errata` array lists the errata levels the publisher honors. Readers MAY use this to decide whether to surface the tax markers.

### 1.7 Backward compatibility

- A 0.4 reader that does not parse the new attributes sees `amount`, `currency`, `period` as before; the extra attributes are simply ignored per standard XML attribute-unknown behavior.
- A 0.4 publisher that omits the new attributes remains conformant. Their feed continues to validate and render.
- A 0.4.1-aware reader consuming a 0.4 feed without the attributes MUST behave as if neither attribute were present (no default assumption).

There is no conformance-level change. No reader needs to move to a higher level to be errata-compliant; readers already at Level 5 gain the rendering behavior in §1.4 at their own pace.

---

## Erratum 2: Enclosure auth passthrough

### 2.1 Problem statement

SPEC.md 0.1 §Foundational defines four values of `<om:authMethod>` (`url-token`, `http-basic`, `bearer`, `dpop`) and 0.2 adds `vc-presentation`. The spec text describes how a reader authenticates the **feed fetch**. It is silent on how the same authentication propagates to the URL inside an `<enclosure>` element (or Atom `<link rel="enclosure">`) on a gated item. In practice, both `om-ghost` and `om-wordpress` already do a specific thing when emitting paid podcasts or paid video feeds, and Miniflux's forked reader already does the matching thing when fetching those enclosures. New implementers have asked how this is meant to work. This erratum codifies the existing behavior.

The question is not theoretical. A Level 5 podcaster publishing a tokenized feed returns audio-enclosure URLs that must also be authenticated, otherwise the content is public even though the feed is gated. The same problem applies to video enclosures, to chunked streaming manifests, and to any other binary referenced by an enclosure URL.

### 2.2 Clarification per auth method

#### 2.2.1 `url-token`

The enclosure URL SHOULD carry the same token as the feed URL, in a shape that matches the feed path. Publishers have two equivalent options:

- **Path-segment token**, if the feed URL is `https://publisher.example/feed/om/{token}/`, the enclosure URL SHOULD be `https://publisher.example/media/om/{token}/episode-N.mp3`. The same token segment appears in the same position.
- **Query-parameter token**, if the publisher cannot produce per-token path segments for media (common with CDN-signed URLs), the enclosure URL SHOULD be `https://cdn.publisher.example/media/episode-N.mp3?token=<token>`, where `<token>` is the same opaque value the feed URL carried.

Readers MUST NOT attempt to strip or mutate the token in either form when following an enclosure URL.

#### 2.2.2 `bearer`

The reader MUST fetch the enclosure URL with the same `Authorization: Bearer <jwt>` header it used to fetch the feed, where `<jwt>` is the current short-lived bearer token exchanged via the publisher's `/api/om/token` endpoint.

- Readers MUST NOT strip the `Authorization` header when following an enclosure URL that lives on the same origin as the feed.
- Readers MUST NOT forward the `Authorization` header to a cross-origin URL unless the enclosure URL is explicitly signed by the publisher for that origin (see §2.3 on CDN-signed manifests).
- On a 401 response the reader SHOULD follow the same token-refresh path it uses for the feed (exchange at `/api/om/token`, retry once).

#### 2.2.3 `dpop`

The reader MUST generate a DPoP proof for the enclosure fetch with the proof's `htu` claim set to the enclosure URL (not the feed URL), `htm` set to `GET`, and the reused DPoP key bound to the bearer token. This mirrors RFC 9449 §4.2. A proof whose `htu` matches the feed URL is not valid for an enclosure request and the publisher's signer MUST reject it.

#### 2.2.4 `vc-presentation`

The enclosure is fetched with the same short-lived bearer token the publisher issued after verifying a presented OM-VC (SPEC §4.2) or OM-VC-SD (SPEC §4.1) credential. The credential itself is not re-presented on the enclosure fetch. The short-lived bearer token behaves per §2.2.2 above.

#### 2.2.5 `http-basic`

The reader uses the same `Authorization: Basic <base64>` header for the enclosure as for the feed. This is explicitly discouraged for new deployments per SPEC §H.2 (Patreon rejected it for podcast apps) but is codified here for completeness.

### 2.3 HLS and DASH: chunked delivery

For enclosure URLs that point to HLS playlists (`.m3u8`, RFC 8216) or DASH manifests (`.mpd`):

- The **authenticated request is for the manifest**. The reader applies the auth method above to the `.m3u8` or `.mpd` request.
- The publisher's CDN or signer SHOULD respond with a manifest whose **per-chunk URLs are individually signed** (e.g. CloudFront signed URLs, Akamai token auth, a publisher-proprietary HMAC signature) and do NOT require the reader to re-present the feed-level auth material on each chunk.
- The validity window of signed chunk URLs SHOULD align with the TTL of the bearer token (for `bearer`, `dpop`, and `vc-presentation`) or the token-rotation window (for `url-token`). If the bearer TTL is one hour, chunk-signed URLs SHOULD be valid for approximately one hour.
- Readers MUST NOT attempt to forward the feed-level auth material to per-chunk URLs. CDN edges typically strip inbound `Authorization` headers anyway; this clarification makes the required behavior explicit.

The effect is that the reader authenticates once per manifest, the CDN handles per-chunk access during playback, and no re-authentication is required mid-playback unless the manifest's validity window elapses.

### 2.4 Worked example: bearer-auth podcast feed

A publisher at `https://pod.example` declares `<om:authMethod>bearer</om:authMethod>` and emits a feed containing an enclosure:

```xml
<item>
  <title>Episode 42</title>
  <om:access>members-only</om:access>
  <enclosure url="https://pod.example/media/42.mp3"
             length="28450000"
             type="audio/mpeg" />
</item>
```

Reader fetch sequence:

1. **Feed fetch.** Reader exchanges its stored feed token at `POST https://pod.example/api/om/token` and receives a JWT with 1-hour TTL. Reader fetches `GET https://pod.example/feed/om/{token}/` with `Authorization: Bearer <jwt>` and receives the XML above.
2. **Enclosure fetch.** When the subscriber plays Episode 42, the reader fetches `GET https://pod.example/media/42.mp3` with the same `Authorization: Bearer <jwt>` header. The publisher verifies the JWT (same key, same claims) and streams the MP3.
3. **Token expiry mid-episode.** If the JWT expires mid-download, the publisher returns 401 on any range request that arrives after expiry. The reader re-exchanges at `/api/om/token` and resumes the range request with the new JWT.

For an HLS variant at `https://pod.example/media/42.m3u8`:

1. Reader fetches the manifest with `Authorization: Bearer <jwt>`.
2. The manifest returned contains per-segment URLs at `https://cdn.pod.example/42/seg-NNN.ts?sig=...&exp=...` signed by the publisher's CDN signer with a ~1-hour validity.
3. Reader fetches segments **without** the bearer header; the CDN checks the signature and serves them.
4. If playback outlasts the manifest validity window, the reader refetches the manifest with a refreshed bearer token.

### 2.5 Backward compatibility

- This erratum describes existing behavior of both 0.4 reference implementations (`om-ghost`, `om-wordpress`) and the reader-side behavior of the `miniflux-om` Phase 1 fork. No code changes are required for any of them to be 0.4.1-compliant.
- A 0.4 publisher that already passes tokens through to enclosures per §2.2 is already compliant.
- A 0.4 publisher that does NOT currently authenticate enclosures (i.e. whose enclosure URLs are public despite the feed being gated) SHOULD update to the behavior in §2.2. This is a correctness fix, not a conformance-level change; the publisher was already leaking content.
- A 0.4 reader that strips `Authorization` headers on same-origin enclosure requests SHOULD update to preserve them. Again, this was a bug in the reader, not a spec change.

No new element is introduced. No attribute is introduced. This erratum is pure clarification of existing element semantics.

---

## Errata process note

Errata are shipped as minor-dot versions of the parent spec (0.4.1, 0.4.2, …) and are strictly additive: every errata release preserves the conformance surface of its parent. A 0.4 implementation that does not adopt 0.4.1 remains 0.4-conformant. A 0.4.1-aware implementation advertises its errata support by listing the level in the `errata` array of its discovery document (§1.6). No conformance level from ../docs/FEATURESET.md is changed by an errata release; levels are reserved for spec-minor revisions (0.5, 0.6, …) and spec-major revisions (1.0). Errata do not add new elements; they clarify existing ones. This rule is the load-bearing discipline: if a clarification requires a new element, it is not an erratum, it is 0.5 work.

---

## What this errata does NOT include

Considered and explicitly deferred:

- **Sales-tax line-item display.** Showing a breakdown like "subtotal / tax / total" at reader-side is out of scope. The tax-inclusive/exclusive declaration in §1 is the minimum honest surface; richer breakdowns belong in 0.5 if they belong anywhere.
- **DRM primitives for enclosure content.** Widevine, FairPlay, PlayReady, or any content-encryption key exchange is out of scope for `om`. The enclosure-auth clarification in §2 covers authentication of the fetch, not encryption of the payload. Publishers requiring DRM compose `om` with their DRM stack out of band.
- **Per-country price variants under one `<om:offer>`.** Expressing "12 EUR in the EU, 14 USD in the US, 10 GBP in the UK" on a single offer is out of scope; publishers SHOULD use multiple `<om:offer>` elements, one per jurisdiction, and rely on reader-side jurisdiction matching (future work).
- **Proration for tax-rate changes mid-period.** If the applicable tax rate changes during a subscription period (uncommon but real), reconciliation is the PSP's job. The spec has no opinion.
- **Cross-currency tax reporting.** If `currency` differs from the jurisdiction's native currency, the relationship between declared amount, applicable tax, and the publisher's reported revenue is out of scope.
- **`<om:sharing-policy>`.** A separate provisional primitive under discussion for 0.4.1-or-later per SPEC §H.2. Tracked in [plans/PHASE-1-2.md §3.1 Track F](plans/PHASE-1-2.md); not included here because it is net-new surface and therefore fails the errata "pure clarification" rule. If it ships, it ships as a marked-Provisional addition with its own errata document.

---

## Updates to ../docs/FEATURESET.md

The feature matrix in ../docs/FEATURESET.md would gain two rows on adoption of this errata. No existing row changes. No conformance level changes. These rows are informational, they describe clarifications, not new features, and are noted here so implementers can spot them at a glance:

| Proposed feature-matrix row | Category | Introduced | Conformance level | Element(s) |
|---|---|---|---|---|
| Tax-inclusive price declaration | Commercial | 0.4.1 | 5 | `<om:price tax_inclusive>` |
| Enclosure auth passthrough | Foundational | 0.4.1 | 2 (url-token), 3 (bearer/dpop), 4 (vc-presentation) | (clarification of `<om:authMethod>`) |

The tax-inclusive row introduces two attributes (`tax_inclusive`, `tax_jurisdiction`) on an existing element. The enclosure-auth row introduces no markup at all; it is a clarification of `<om:authMethod>` behavior that applies wherever an item contains an `<enclosure>`.

---

## Acknowledgements

This errata was produced during Phase 2 of the ROADMAP execution plan, driven by:

- EU VAT reporting requirements surfaced during Mollie PSP-profile integration in `om-ghost` and `om-wordpress`.
- Podcast-publisher persona work (SPEC §H.5 persona 2) surfacing the enclosure-auth question during the first outside-publisher onboarding.
- `miniflux-om` Phase 1 interop testing, which exercised the enclosure-fetch path against both `om-ghost` and `om-wordpress` and validated the behavior codified in §2.

No changes to SPEC.md or ../docs/FEATURESET.md accompany this errata; the parent spec remains at 0.4 until 0.5, per the discipline named in SPEC §E ("no new tags"). This errata exists so implementers building against 0.4 today can do so without ambiguity.
