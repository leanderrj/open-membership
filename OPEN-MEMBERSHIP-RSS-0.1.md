# Open Membership RSS 0.1

**An open module for paid, tiered, and gated syndication content.**

- **Latest version:** `http://purl.org/rss/modules/membership/`
- **This version:** 0.1 (draft, 2026-04-23)
- **Namespace URI:** `http://purl.org/rss/modules/membership/`
- **Suggested prefix:** `om`
- **Status:** Draft for public comment. Not yet frozen.

## Copyright

Copyright © 2026 by the Authors.

Permission to use, copy, modify and distribute the Open Membership RSS Specification and its accompanying documentation for any purpose and without fee is hereby granted in perpetuity, provided that the above copyright notice and this paragraph appear in all copies.

The copyright holders make no representation about the suitability of the specification for any purpose. It is provided "as is" without expressed or implied warranty. This copyright applies to the Open Membership RSS Specification and accompanying documentation and does not extend to the format itself.

*(Copyright language adapted verbatim from the RSS 1.0 modules, on the theory that what worked for Swartz and the RSS-DEV Working Group will work here.)*

## 1. Abstract

Open Membership RSS (`om`) is a namespace-based extension to RSS 2.0 and RSS 1.0/RDF that lets a publisher describe membership tiers, entitlement requirements, and preview/full content relationships in a portable, reader-agnostic way. It is designed so that a Ghost blog, a Substack newsletter, a Patreon podcast, and a self-hosted WordPress site can all expose the same shape of data to any compliant reader, without any of those platforms needing to agree on a business model, payment processor, or identity provider.

The spec is deliberately small. It defines *what* a feed needs to say about its gated content; it does not define a new payment protocol, identity system, or DRM scheme. Payment and identity are referenced by URI and handled out of band.

## 2. Design Principles

1. **Layer, don't replace.** `om` is an XML namespace module. A feed remains a valid RSS 2.0 or RSS 1.0 feed whether or not a reader understands `om`. Readers that don't understand it see a public preview; readers that do see the gated machinery.
2. **Preview-first.** Every `<item>` must be renderable by a dumb reader. Gated content is additive, never a precondition for parsing.
3. **Transport-agnostic auth.** The spec names the authentication *method* but does not bundle one. A feed can declare URL-token, HTTP Basic, OAuth 2.0 Bearer, or a future method, and readers advertise which they support.
4. **Easy to implement.** A publisher should be able to ship a minimal conformant feed by adding three or four tags to an existing template. A reader should be able to add minimal support in a few hours.
5. **No new identity system.** Identity is delegated to the publisher or a third party via standard URIs. The spec does not specify how subscriptions are purchased or sessions established.
6. **Decentralization over coordination.** The spec must be useful for a single indie publisher on day one, without requiring buy-in from any platform.

## 3. Namespace Declaration

### In RSS 2.0

```xml
<rss version="2.0"
     xmlns:om="http://purl.org/rss/modules/membership/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    ...
  </channel>
</rss>
```

### In RSS 1.0 / RDF

```xml
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:om="http://purl.org/rss/modules/membership/"
         xmlns="http://purl.org/rss/1.0/">
  <channel rdf:about="https://example.com/rss">
    ...
  </channel>
</rdf:RDF>
```

## 4. Channel-Level Elements

These elements appear once inside `<channel>`. They describe the membership model of the feed as a whole.

### 4.1 `<om:provider>` (required if any `om:` elements are present)

A URI identifying the entity that issues and validates entitlements for this feed. This is typically the publisher's own origin, but may be a third-party identity or payment provider.

```xml
<om:provider>https://mysite.example</om:provider>
```

### 4.2 `<om:authMethod>` (required if any `om:` elements are present)

Declares the authentication method a reader should use to present proof of entitlement. Value is one of:

- `url-token` — A per-subscriber secret is embedded in the feed URL as a query parameter. Zero reader changes required. **Default for interoperability.**
- `http-basic` — RFC 7617 HTTP Basic Authentication over HTTPS.
- `bearer` — RFC 6750 OAuth 2.0 Bearer Token in the `Authorization` header.
- `dpop` — RFC 9449 Demonstration of Proof of Possession, for readers that can bind tokens to keys.

Multiple methods MAY be declared; readers pick the strongest they support.

```xml
<om:authMethod>url-token</om:authMethod>
<om:authMethod>bearer</om:authMethod>
```

### 4.3 `<om:tier>` (optional, repeatable)

Declares a named membership tier available on this publication. The `id` attribute is an opaque string used to reference this tier from `<item>` elements. The element's text content is a human-readable label.

Attributes:

- `id` (required) — opaque identifier, unique within the channel
- `price` (optional) — ISO 4217 currency code followed by amount, e.g. `USD 8.00`
- `period` (optional) — `monthly`, `yearly`, `lifetime`, or an ISO 8601 duration

```xml
<om:tier id="free">Free</om:tier>
<om:tier id="paid" price="USD 8.00" period="monthly">Paid subscriber</om:tier>
<om:tier id="founding" price="USD 150.00" period="yearly">Founding member</om:tier>
```

### 4.4 `<om:signup>` (optional)

A URL where a non-subscriber can become a member. This is the `podcast:funding`-equivalent and is the primary upsell surface for readers.

```xml
<om:signup>https://mysite.example/subscribe</om:signup>
```

### 4.5 `<om:tokenEndpoint>` (optional; required for `bearer` and `dpop`)

For `authMethod` values that need token exchange, this is the URL the reader POSTs to in order to exchange credentials for a feed-access token. Response is a JSON object following RFC 6749 §5.1.

```xml
<om:tokenEndpoint>https://mysite.example/oauth/token</om:tokenEndpoint>
```

## 5. Item-Level Elements

These elements appear inside an `<item>` and describe how that specific item is gated.

### 5.1 `<om:access>` (required on any gated item)

Declares the access policy for this item. The element has a single required attribute, `tier`, matching an `id` declared in a channel-level `<om:tier>`. The text content is one of:

- `open` — freely available; `tier` MAY be omitted
- `preview` — a shortened version is in the feed; full version requires entitlement
- `locked` — the item is listed but no content is delivered without entitlement
- `members-only` — the item is listed but its existence is the only public information

```xml
<om:access tier="paid">preview</om:access>
```

### 5.2 `<om:unlock>` (optional)

A URL the reader can fetch — with the declared `authMethod` credential — to retrieve the full content of this item. This decouples the *listing* from the *content*, which is the key difference from a simple locked-feed approach.

```xml
<om:unlock>https://mysite.example/api/items/abc123/full</om:unlock>
```

If present, the response from this URL, when the reader provides valid credentials, MUST be either:

- A full RSS `<item>` element (fragment), or
- The HTML/text body of the content as `content:encoded`.

### 5.3 `<om:preview>` (optional)

Wraps publisher-curated preview content. This is distinct from `<description>` (which may be auto-generated) and signals "this is what a non-subscriber is allowed to see."

```xml
<om:preview><![CDATA[
  <p>This week's essay opens with a question I've been sitting with...</p>
  <p><em>The rest of this post is for paid subscribers.</em></p>
]]></om:preview>
```

### 5.4 `<om:receipt>` (optional)

A namespace-prefixed extension point for publishers who want to allow the reader to attach a cryptographic proof (e.g. a Lightning payment preimage, a signed JWT, a verifiable credential) as an alternative to a stored subscription. This is how value-for-value flows interoperate with subscription flows in the same feed.

The element is empty in the published feed and is filled in by the reader on request.

```xml
<om:receipt accepts="lightning-preimage jwt" />
```

## 6. Reference Example

A Ghost blog with a free tier and a paid tier, serving one public post and one gated post:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:om="http://purl.org/rss/modules/membership/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Field Notes</title>
    <link>https://fieldnotes.example</link>
    <description>Weekly dispatches on open-source economics.</description>

    <om:provider>https://fieldnotes.example</om:provider>
    <om:authMethod>url-token</om:authMethod>
    <om:authMethod>bearer</om:authMethod>
    <om:tokenEndpoint>https://fieldnotes.example/oauth/token</om:tokenEndpoint>
    <om:signup>https://fieldnotes.example/subscribe</om:signup>
    <om:tier id="free">Free</om:tier>
    <om:tier id="paid" price="USD 8.00" period="monthly">Paid</om:tier>

    <item>
      <title>What RSS taught us about institutions</title>
      <link>https://fieldnotes.example/rss-institutions</link>
      <guid isPermaLink="false">fieldnotes-0042</guid>
      <pubDate>Thu, 23 Apr 2026 08:00:00 GMT</pubDate>
      <om:access>open</om:access>
      <content:encoded><![CDATA[<p>Full public post body here...</p>]]></content:encoded>
    </item>

    <item>
      <title>The paid-feed stack: a walkthrough</title>
      <link>https://fieldnotes.example/paid-feed-stack</link>
      <guid isPermaLink="false">fieldnotes-0043</guid>
      <pubDate>Thu, 23 Apr 2026 08:00:00 GMT</pubDate>
      <om:access tier="paid">preview</om:access>
      <om:preview><![CDATA[
        <p>Last week we sketched the spec. This week, a concrete stack...</p>
      ]]></om:preview>
      <om:unlock>https://fieldnotes.example/api/items/0043/full</om:unlock>
    </item>
  </channel>
</rss>
```

## 7. Reader Conformance

A reader is **Level 1 conformant** if it:

1. Parses the `om` namespace without breaking on unknown elements.
2. Displays `<om:preview>` (or `<description>` as fallback) for items with `<om:access>` other than `open`.
3. Shows the `<om:signup>` URL to users when they attempt to read gated content they don't have access to.

A reader is **Level 2 conformant** if it additionally:

4. Supports at least one `<om:authMethod>` value end-to-end.
5. Fetches `<om:unlock>` URLs with the declared credential and substitutes the returned content for the preview when available.

A reader is **Level 3 conformant** if it additionally:

6. Supports `bearer` auth with the token endpoint flow.
7. Handles token refresh and revocation gracefully.

Most readers today can reach Level 1 with no code changes. Level 2 via `url-token` is the pragmatic adoption target.

## 8. Publisher Conformance

A feed is conformant if:

1. It declares the `om` namespace on its root element.
2. Every `<item>` with non-`open` access has an `<om:access>` element.
3. `<om:provider>` and at least one `<om:authMethod>` appear at the channel level.
4. The feed remains a valid RSS 2.0 or RSS 1.0 document with `om` elements stripped.

## 9. Relationship to Other Specs

- **RSS 2.0 (Harvard).** `om` is a namespace extension in the style sanctioned by the RSS 2.0 spec. It adds no required changes to the core.
- **RSS 1.0 / RDF (Swartz et al.).** `om` follows the RSS 1.0 modules convention: a namespace URI under `purl.org`, perpetual-license copyright, element-by-element definitions. It is usable in RDF feeds with identical semantics.
- **Podcasting 2.0 (`podcast:` namespace).** `om` is complementary. `podcast:funding` points to a donation page; `om:signup` points to a subscription flow. `podcast:value` streams micropayments; `om:receipt` lets a reader *attach* a receipt to prove entitlement. A feed can use both namespaces at once. Where they overlap (e.g. `podcast:locked`), `om:access` is finer-grained and item-level, whereas `podcast:locked` is channel-level.
- **ActivityPub.** Orthogonal. `om` describes pull-based syndication; ActivityPub describes push-based federation. A future module could bridge them.
- **Really Simple Licensing (RSL).** Orthogonal. RSL describes what a consumer may *do* with content they've received. `om` describes how a consumer *gets* it.

## 10. Governance

This spec is published under a perpetual permissive grant (see Copyright). It is maintained in a public Git repository. Changes follow the "Rules for Standards-Makers" conventions adopted by Podcasting 2.0: backward compatibility is prioritized, elements are locked once canonized, and new elements are proposed as drafts before promotion.

A neutral custodian (modeled on the Berkman Klein Center's stewardship of RSS 2.0) is strongly desirable before 1.0.

## 11. Open Questions for 0.2

- Should `<om:access>` distinguish "early access" (time-gated) from "tier-gated"?
- Should the spec define a canonical `.well-known` discovery document for `om:provider`, to bootstrap readers that encounter a new publisher?
- How should group subscriptions (e.g. a household or a team) be represented?
- Is there a minimum viable verifiable-credential profile that would let a subscription purchased on one platform be presented as proof on another?

## 12. Reference Implementations (planned)

- A Ghost theme + custom route that emits an `om`-compliant feed from Ghost's existing Members data.
- A minimal Node.js middleware that wraps any RSS 2.0 feed and adds token-validation on `om:unlock` endpoints.
- A fork of an open-source reader (NetNewsWire or Miniflux) with Level 2 `url-token` support.

## Acknowledgements

This spec stands on the shoulders of the RSS-DEV Working Group (Beged-Dov, Brickley, Dornfest, Davis, Dodds, Eisenzopf, Galbraith, Guha, MacLeod, Miller, Swartz, van der Vlist), Dave Winer, the Berkman Klein Center, and the Podcast Index team (Curry, Jones, and contributors). The modularity pattern, the copyright grant, and the philosophy of "a clean, well-lighted place for specs" are theirs; the mistakes are ours.
