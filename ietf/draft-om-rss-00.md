---
title: "Open Membership Module for RSS"
abbrev: "OM RSS"
docname: draft-open-membership-rss-00
category: info
stream: independent
ipr: trust200902
area: Applications
workgroup: Independent Submission
keyword:
  - RSS
  - membership
  - subscription
  - verifiable credentials
  - syndication

author:
  -
    ins: "TBD. TBD"
    name: "TBD TBD"
    organization: "Open Membership Working Group"
    email: "TBD@example.org"

normative:
  RFC2119:
  RFC8174:
  RFC4287:
  RFC8288:
  RFC8615:
  RFC8785:
  RFC7518:
  RFC7643:
  RFC7644:
  RFC9068:
  RFC9449:
  RFC9728:
  W3C-VC-DATA-MODEL-2.0:
    title: "Verifiable Credentials Data Model v2.0"
    target: "https://www.w3.org/TR/vc-data-model-2.0/"
    author:
      - org: "W3C Verifiable Credentials Working Group"
    date: 2025
  W3C-VC-DI-BBS:
    title: "Data Integrity BBS Cryptosuites v1.0"
    target: "https://www.w3.org/TR/vc-di-bbs/"
    author:
      - org: "W3C Verifiable Credentials Working Group"
    date: 2024
  W3C-VC-BITSTRING-STATUS-LIST:
    title: "Bitstring Status List v1.0"
    target: "https://www.w3.org/TR/vc-bitstring-status-list/"
    author:
      - org: "W3C Verifiable Credentials Working Group"
    date: 2024

informative:
  RFC4846:
  RFC6973:
  RFC7942:
  RSS-2.0:
    title: "RSS 2.0 Specification"
    target: "https://www.rssboard.org/rss-specification"
    author:
      - ins: "D. Winer"
        name: "Dave Winer"
    date: 2003
  RSS-1.0:
    title: "RDF Site Summary (RSS) 1.0"
    target: "https://web.resource.org/rss/1.0/spec"
    date: 2000
  JSON-FEED-1.1:
    title: "JSON Feed Version 1.1"
    target: "https://www.jsonfeed.org/version/1.1/"
    author:
      - ins: "B. Simmons"
        name: "Brent Simmons"
      - ins: "M. Pilgrim"
        name: "Manton Reece"
    date: 2020
  PODCAST-NAMESPACE:
    title: "The Podcast Namespace"
    target: "https://podcastindex.org/namespace/1.0"
    author:
      - org: "Podcast Index"
    date: 2024
  ACTIVITYPUB:
    title: "ActivityPub"
    target: "https://www.w3.org/TR/activitypub/"
    author:
      - org: "W3C Social Web Working Group"
    date: 2018
  OPML-2.0:
    title: "OPML 2.0 Specification"
    target: "http://opml.org/spec2.opml"
    author:
      - ins: "D. Winer"
        name: "Dave Winer"
    date: 2006
  DID-CORE:
    title: "Decentralized Identifiers (DIDs) v1.0"
    target: "https://www.w3.org/TR/did-core/"
    author:
      - org: "W3C DID Working Group"
    date: 2022
  OM-PORTABILITY:
    title: "Open Membership Subscriber Portability Format 1.0"
    target: "https://purl.org/rss/modules/membership/portability/1.0"
    date: 2026
  OM-SYNDICATION:
    title: "Open Membership Syndication Mappings (Atom, JSON Feed)"
    target: "https://purl.org/rss/modules/membership/syndication-mappings/1.0"
    date: 2026
  OM-ACTIVITYPUB:
    title: "Open Membership ActivityPub Co-existence Profile"
    target: "https://purl.org/rss/modules/membership/activitypub/1.0"
    date: 2026
  OM-GHOST:
    title: "om-ghost: Open Membership reference implementation for Ghost CMS"
    target: "https://github.com/open-membership/om-ghost"
    date: 2026
  OM-WORDPRESS:
    title: "om-wordpress: Open Membership reference implementation for WordPress"
    target: "https://github.com/open-membership/om-wordpress"
    date: 2026

--- abstract

This document defines the Open Membership Module for RSS (the "om"
namespace), an extension to RSS 2.0 and to the RDF Site Summary (RSS 1.0)
that enables publishers to describe paid, tiered, time-gated, group-shared,
value-for-value, and privacy-preserving subscription content within a feed
document in an interoperable, vendor-neutral way.

Existing syndication formats describe feeds and entries but do not describe
commercial or access-controlled relationships between a publisher and a
subscriber. As a result, publishers who monetize through subscriptions
depend on proprietary platforms, and subscribers cannot move their paid
memberships between readers without re-subscribing. The Open Membership
Module addresses this gap by defining a vocabulary for authentication
method declaration, tier description, per-item access policy, payment
service provider identification, verifiable credential presentation,
selective-disclosure pseudonymity, cross-publisher bundle trust,
subscription gifting, and refund and revocation policy.

The Module composes with other RSS extensions (including the Podcast
Namespace) and is transparent to readers that do not implement it:
unrecognized elements are ignored, and a feed using the Module remains
a valid RSS 2.0 or RSS 1.0 feed.

This document is an Independent Submission to the RFC series and does
not represent a consensus of the IETF community.

--- middle

# Introduction
{: #introduction}

## Problem Statement
{: #problem-statement}

RSS 2.0 {{RSS-2.0}}, RSS 1.0 {{RSS-1.0}}, and Atom {{RFC4287}} describe
how to publish feed content. They do not describe commercial or
access-controlled relationships between a publisher and a subscriber.
When a publisher sells subscriptions, the resulting artifacts - per-
subscriber feed URLs, bearer tokens, session cookies, verifiable
credentials - live outside any standard, and the interaction between a
reader and a paid feed is therefore vendor-specific.

Two concrete failure modes follow from this gap.

Publisher lock-in: a publisher who wishes to offer paid RSS content
typically has three options: build a custom implementation, adopt a
proprietary platform that exposes a non-portable feed format, or use
browser cookies (which are not supported by most RSS readers). Each
option increases dependence on a single vendor or on a one-off
implementation that cannot be audited, migrated, or interoperated with.

Subscriber lock-in: a subscriber whose paid feeds live inside one
reader application cannot move them to another reader without re-
authenticating with each publisher individually. There is no
portable representation of an active membership.

The Open Membership Module ("the Module") defines a namespace, a
set of RSS elements, a canonical discovery document, and profiles
for verifiable credentials that together provide an interoperable
substrate for paid syndication.

## Relationship to Existing Standards
{: #relation-to-standards}

The Module is an RSS 2.0 {{RSS-2.0}} extension in the sense of that
specification: a namespaced vocabulary whose elements MAY appear inside
the `channel` and `item` elements of an RSS 2.0 document. Readers that
do not recognize the namespace MUST ignore elements bearing it, as
required by {{RSS-2.0}}.

The Module is also representable in RSS 1.0 {{RSS-1.0}} using RDF
semantics; see {{namespace}}. Non-normative mappings to Atom
{{RFC4287}} and JSON Feed {{JSON-FEED-1.1}} are defined in a
companion document {{OM-SYNDICATION}}.

Where the Module describes monetary recipients and splits, it
composes with the Podcast Namespace {{PODCAST-NAMESPACE}} value
primitives; see {{coexistence}}.

The Module delegates identity to Decentralized Identifiers
{{DID-CORE}} and W3C Verifiable Credentials 2.0
{{W3C-VC-DATA-MODEL-2.0}} rather than defining a new identity
format. It delegates authenticated token transport to OAuth 2.0
profiles, including Demonstrating Proof-of-Possession (DPoP,
{{RFC9449}}) and OAuth 2.0 Protected Resource Metadata
{{RFC9728}}.

# Terminology
{: #terminology}

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and
"OPTIONAL" in this document are to be interpreted as described in
BCP 14 {{RFC2119}} {{RFC8174}} when, and only when, they appear in all
capitals, as shown here.

The following terms are used throughout this document:

Publisher:
: An entity operating a syndication feed that exposes some or all
  content under access control using the Module.

Subscriber:
: An entity that has obtained entitlement to access a Publisher's
  access-controlled content.

Reader:
: Software operated by or on behalf of a Subscriber that fetches,
  parses, and presents feed content.

Tier:
: A named subscription level offered by a Publisher, identified
  within the feed by an opaque string.

Feature:
: A fine-grained entitlement, decoupled from any single Tier,
  identified within the feed by an opaque string.

Offer:
: A purchasable binding of a Tier or Feature to a price and a
  Payment Service Provider.

Payment Service Provider (PSP):
: A third party that processes payment and, in some profiles,
  holds authoritative subscription state on behalf of the
  Publisher.

Discovery Document:
: A JSON document served at the Publisher's `.well-known/open-
  membership` URI describing the Publisher's Module configuration.

Entitlement:
: The authoritative assertion that a Subscriber is entitled to
  access a set of Tiers or Features at a given time. Entitlements
  are issued by the Publisher or an Issuer the Publisher trusts.

Credential:
: A Verifiable Credential, bearer token, or URL token that encodes
  or references an Entitlement.

Bundle:
: A subscription product that grants access across multiple
  Publishers, sold and issued by an Aggregator.

Aggregator:
: A Publisher that issues credentials intended for presentation
  at other Publishers as part of a Bundle.

Umbrella Issuer:
: A third party that issues credentials on a Publisher's behalf.

# Namespace and Compatibility
{: #namespace}

## Namespace URI
{: #namespace-uri}

The namespace URI for the Module is:

~~~
http://purl.org/rss/modules/membership/
~~~

The conventional prefix is `om`. Implementations MUST accept any
prefix.

## Declaration in RSS 2.0
{: #declaration-rss2}

A feed using the Module MUST declare the namespace on the `rss`
element (or on any ancestor of elements carrying the prefix):

~~~ xml
<rss version="2.0"
     xmlns:om="http://purl.org/rss/modules/membership/">
  <channel>
    ...
  </channel>
</rss>
~~~

## Declaration in RSS 1.0
{: #declaration-rss1}

In an RSS 1.0 {{RSS-1.0}} feed, the namespace is declared as any
other RDF vocabulary:

~~~ xml
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns="http://purl.org/rss/1.0/"
         xmlns:om="http://purl.org/rss/modules/membership/">
  ...
</rdf:RDF>
~~~

## Compatibility Requirement
{: #compatibility}

A reader that does not implement the Module MUST treat Module
elements as unknown extension elements and ignore them. A feed
using the Module MUST remain a valid RSS 2.0 or RSS 1.0 feed in
the absence of Module processing. In particular, required RSS
channel metadata (`title`, `link`, `description`) MUST NOT be
replaced by Module elements; Module elements MAY supplement but
MUST NOT supplant the base RSS vocabulary.

# Provider and Authentication
{: #provider-auth}

## `om:provider`
{: #om-provider}

The `om:provider` element is a channel-level element identifying the
Publisher. It contains an absolute HTTPS URI serving as the
Publisher's stable identifier in the Module. Exactly one
`om:provider` element MUST appear in a channel that uses any other
element of the Module.

~~~ xml
<om:provider>https://fieldnotes.example</om:provider>
~~~

The URI in `om:provider` is the Publisher's trust anchor. It MUST
resolve over HTTPS. A Discovery Document ({{discovery}}) served at
`{om:provider}/.well-known/open-membership` MUST be reachable if
the Publisher advertises any authentication method other than
`url-token` without inline Discovery Document data.

## `om:authMethod`
{: #om-authmethod}

The `om:authMethod` element is a channel-level element declaring
the authentication method the Publisher accepts for access-
controlled content. The element value MUST be one of the following
tokens:

`url-token`:
: The per-subscriber feed URL contains a high-entropy token that
  constitutes the entire authentication state. Recommended as the
  entry-level method for Readers that do not yet implement bearer
  or credential flows. No separate token endpoint is required.

`http-basic`:
: HTTP Basic authentication per {{RFC4287}} transport conventions.
  Permitted only where TLS is in use. Support is OPTIONAL for
  Readers; support is DISCOURAGED for new Publisher deployments
  due to the interaction with many legacy Readers that cannot
  manage credentials securely.

`bearer`:
: OAuth 2.0 Bearer tokens per {{RFC9068}}, with Protected Resource
  Metadata discovery per {{RFC9728}}. Tokens are issued at the
  Publisher's token endpoint ({{token-endpoint}}) and presented in
  the `Authorization` header of feed fetches.

`dpop`:
: Demonstrating Proof-of-Possession (DPoP) bound access tokens per
  {{RFC9449}}. Functionally equivalent to `bearer` with the
  addition of per-request proof of key possession, which defeats
  token replay by a party that obtains a token without the
  holder's key.

`vc-presentation`:
: Presentation of a W3C Verifiable Credential 2.0
  {{W3C-VC-DATA-MODEL-2.0}} conforming to the OM-VC 1.0 profile
  ({{om-vc}}) or the OM-VC-SD 1.0 profile ({{om-vc-sd}}). The
  credential is presented to a publisher-hosted verification
  endpoint which, on success, issues a short-lived bearer token
  scoped to the Publisher.

A Publisher MAY advertise multiple `om:authMethod` elements; when
it does, Readers SHOULD prefer the method associated with the
highest conformance level they implement. A Publisher advertising
`vc-presentation` MUST also serve a Discovery Document listing the
verification endpoint.

~~~ xml
<om:authMethod>bearer</om:authMethod>
<om:authMethod>url-token</om:authMethod>
~~~

## `om:tokenEndpoint`
{: #token-endpoint}

For `bearer` and `dpop` methods, the channel MAY include an
`om:tokenEndpoint` element whose value is the absolute HTTPS URI
of the Publisher's token endpoint. When present, Readers SHOULD
use this value in preference to discovering it via {{RFC9728}}.

~~~ xml
<om:tokenEndpoint>https://fieldnotes.example/api/token</om:tokenEndpoint>
~~~

# Tier and Access Control
{: #tier-access}

## `om:tier`
{: #om-tier}

The `om:tier` element is a channel-level element declaring a named
subscription level. Required attributes: `id` (an opaque token
unique within the channel). Optional attributes: `price` (a string
of the form "`CURRENCY AMOUNT`" where CURRENCY is an ISO 4217 code)
and `period` (one of `monthly`, `yearly`, `weekly`). The element
content is a human-readable label.

~~~ xml
<om:tier id="paid" price="USD 12.00" period="monthly">Supporter</om:tier>
~~~

Zero or more `om:tier` elements MAY appear. A Publisher with no
tier declarations is describing a non-commercial or single-tier
feed; the access control mechanism in {{om-access}} still
applies.

## `om:access`
{: #om-access}

The `om:access` element appears inside an `item` and declares the
item's access policy. Required attribute: none (but see below).
Element content is one of:

`open`:
: Available to all Readers without authentication.

`preview`:
: Item is gated; what is included inline is a publisher-curated
  preview. The Reader SHOULD display the preview and indicate
  that full content requires a membership.

`locked`:
: Item is gated; no inline preview is provided. The Reader SHOULD
  indicate that the item is members-only.

`members-only`:
: Item is gated. Equivalent to `locked` for access purposes; the
  token exists for human-readability in feed audits.

The `om:access` element MAY carry a `tier` attribute naming one or
more Tier `id` values (space-separated) required for access, and/or
a `feature` attribute naming one or more Feature `id` values
(space-separated). An `om:access` element with neither attribute
and content `locked` or `members-only` grants access to any
Subscriber with a valid Entitlement against the Publisher.

The `om:access` element MAY carry a `scope` attribute with value
`group`, indicating that group-scoped entitlements ({{groups}})
are sufficient.

~~~ xml
<item>
  <title>Long-form investigation</title>
  <om:access tier="paid">locked</om:access>
</item>
~~~

## `om:preview`
{: #om-preview}

The `om:preview` element appears inside an `item` and contains
publisher-curated preview content for a gated item. When present,
it SHOULD be shown by Readers instead of, or alongside, the full
item description. `om:preview` has no effect on access policy.

~~~ xml
<om:preview>The first three paragraphs, verbatim...</om:preview>
~~~

## `om:unlock`
{: #om-unlock}

The `om:unlock` element appears inside an `item` and contains an
absolute HTTPS URI. When a Reader has stored a credential that
matches the Publisher's `om:authMethod`, it MAY fetch the
`om:unlock` URI, presenting the credential, to obtain the full
content of the item. The response MUST be a representation
equivalent to what the item would contain under `om:access`
`open`.

~~~ xml
<om:unlock>https://fieldnotes.example/unlock/abcd1234</om:unlock>
~~~

## `om:feature`
{: #om-feature}

The `om:feature` element is a channel-level element declaring a
named fine-grained entitlement. Required attribute: `id` (unique
within the channel). The element content is a human-readable
label.

~~~ xml
<om:feature id="long-form">Long-form investigations</om:feature>
<om:feature id="archive">Archive access</om:feature>
~~~

Features are orthogonal to Tiers: a Subscriber's Entitlement MAY
grant access to a Feature irrespective of Tier membership. The
`om:access` element's `feature` attribute references Feature ids.

## `om:includes`
{: #om-includes}

The `om:includes` element appears inside an `om:tier` and declares
Features implicitly granted by membership in the Tier. Required
attribute: `feature` (a Feature `id`).

~~~ xml
<om:tier id="paid" price="USD 12.00" period="monthly">
  Supporter
  <om:includes feature="long-form" />
  <om:includes feature="archive" />
</om:tier>
~~~

## `om:receipt`
{: #om-receipt}

The `om:receipt` element appears inside an `item` and contains a
cryptographic attestation that the item was fetched by an
authenticated Subscriber. The format is opaque to RSS; it is
typically a JWS or a detached VC proof. Readers MAY present
receipts to third parties to prove content access without
revealing the Subscriber's identity. Implementation of `om:receipt`
is OPTIONAL at all conformance levels below Level 5.

# Discovery
{: #discovery}

## `.well-known/open-membership`
{: #well-known}

A Publisher MUST serve a Discovery Document at the URI formed by
appending `/.well-known/open-membership` to the origin of the
`om:provider` URI. The document is served with media type
`application/json`; the media type
`application/open-membership+json` MAY be served additionally by
Publishers preferring a profile-specific type.

The Discovery Document is a JSON object with at minimum the
following members:

`spec_version`:
: String. The version of this specification the Publisher claims
  to implement.

`provider`:
: String. MUST equal the `om:provider` URI.

`auth_methods`:
: Array of strings. The set of `om:authMethod` values the
  Publisher supports. MUST match the `om:authMethod` values
  advertised in the feed.

Optional members described in later sections include `psp`,
`offers`, `checkout`, `token_endpoint`, `verification_endpoint`,
`verifiable_credentials`, `groups`, `revocation`, `privacy`,
`bundles`, `gifts`, and `windows`. See {{discovery-shape}}.

## `om:discovery`
{: #om-discovery}

The `om:discovery` element is a channel-level element whose value
is the absolute HTTPS URI of the Discovery Document, provided as
a convenience for Readers that do not wish to synthesize the
`.well-known` path. The URI MUST resolve to the same document as
the well-known form.

~~~ xml
<om:discovery>https://fieldnotes.example/.well-known/open-membership</om:discovery>
~~~

## Composition with RFC 9728
{: #rfc9728-composition}

A Publisher using `om:authMethod` value `bearer` or `dpop` SHOULD
compose its Discovery Document with OAuth 2.0 Protected Resource
Metadata {{RFC9728}} by either:

1. Including an `oauth_protected_resource_metadata` member in the
   Open Membership Discovery Document whose value is the absolute
   URI of the {{RFC9728}} metadata document; or

2. Serving the {{RFC9728}} metadata at a separate well-known URI
   and referencing it from `om:tokenEndpoint`.

Either composition is conforming.

# Time-Gated Content
{: #time-gated}

## `om:window`
{: #om-window}

The `om:window` element appears inside an `item` and declares a
time window during which the item's access policy differs from
its default `om:access` value. Required attributes: `start` and
`end`, each an ISO 8601 datetime in UTC. Required element
content: one of the `om:access` tokens described in {{om-access}}.

Common uses of `om:window`:

Early access:
: An item is `locked` outside the window and `open` inside it,
  allowing Subscribers early access that later becomes public.

Ephemeral free:
: An item is `open` inside the window and `locked` outside it,
  giving non-Subscribers a bounded preview.

Event windows:
: Conference recordings or episodes tied to a dated event.

~~~ xml
<item>
  <title>Episode 42: Early access</title>
  <om:access>locked</om:access>
  <om:window start="2026-05-01T00:00:00Z" end="2026-05-08T00:00:00Z">open</om:window>
</item>
~~~

A Reader evaluating `om:window` MUST use the current time in UTC.
Clock skew of up to 60 seconds is tolerated; larger skew SHOULD
produce a user-visible warning.

A Publisher MAY repeat `om:window` inside an item to declare
disjoint windows; overlapping windows are implementation-defined
and SHOULD be avoided by Publishers.

# Groups
{: #groups}

## `om:group`
{: #om-group}

The `om:group` element is a channel-level element declaring a
group subscription offering. Required attribute: `id` (unique
within the channel). Required attribute: `admin` with value
`publisher-managed` or `self-managed`.

`publisher-managed`:
: The Publisher maintains the group roster directly, typically
  through a publisher-side UI. Appropriate for family plans and
  small groups.

`self-managed`:
: The group administrator maintains the roster via SCIM 2.0
  {{RFC7643}} {{RFC7644}} against a Publisher-hosted SCIM
  endpoint. Appropriate for company, institutional, and
  educational plans.

~~~ xml
<om:group id="acme-corp" admin="self-managed">
  <om:scim_endpoint>https://fieldnotes.example/scim/v2/groups/acme-corp</om:scim_endpoint>
  <om:seats>100</om:seats>
</om:group>
~~~

## SCIM Binding
{: #scim-binding}

Where `admin="self-managed"` is declared, the Publisher MUST
expose a SCIM 2.0 endpoint for the group. The endpoint MUST
implement at minimum:

- `/Users` with `POST`, `GET`, `PATCH`, and `DELETE` semantics
  per {{RFC7644}};
- `/Groups/{id}` supporting `members` modification per
  {{RFC7644}};
- Bearer authentication of the group administrator's API
  credential, issued out-of-band.

Each SCIM User created under the group is a Subscriber seat.
Deleting a User revokes the seat's access within the
`grace_hours` declared by {{om-revocation}}. The Publisher MUST
NOT require the group administrator to know any individual
Subscriber's credential material.

## Group-Scoped Access
{: #group-scoped-access}

An `om:access` element with attribute `scope="group"` is
satisfied by any Entitlement that names the Publisher and a group
the Subscriber is a member of, even if the Subscriber's
individual credential does not otherwise match the Tier required.

# Payments and Commerce
{: #payments}

## `om:psp`
{: #om-psp}

The `om:psp` element is a channel-level element declaring a
Payment Service Provider the Publisher uses. Required attributes:
`id` (one of `stripe`, `mollie`, `paypal`, `adyen`, `paddle`,
`lightning`, or `custom`) and `account` (the Publisher's PSP-side
account identifier, opaque to Readers).

~~~ xml
<om:psp id="stripe" account="acct_1ABCD..." />
<om:psp id="mollie" account="ZXC1234" />
~~~

Multiple `om:psp` declarations are permitted; each `om:offer`
({{om-offer}}) names the PSP it uses.

## `om:offer`
{: #om-offer}

The `om:offer` element is a channel-level element declaring a
purchasable product. Required attribute: `id`. Optional
attributes: `tier` (a Tier `id`) and `feature` (a Feature `id`,
space-separated for multiple). An Offer binds a Tier or Feature
to a price and checkout endpoint.

~~~ xml
<om:offer id="supporter-monthly" tier="paid">
  <om:price amount="12.00" currency="USD" period="P1M" />
  <om:checkout psp="stripe" price_id="price_supporter_..." />
  <om:trial days="7" />
  <om:proration>daily</om:proration>
</om:offer>
~~~

## `om:price`
{: #om-price}

The `om:price` element appears inside `om:offer`. Required
attributes: `amount` (decimal string), `currency` (ISO 4217),
and `period` (ISO 8601 duration for recurring offers; absent for
one-time purchases).

## `om:checkout`
{: #om-checkout}

The `om:checkout` element appears inside `om:offer`. Required
attributes: `psp` (matching an `om:psp` `id`). Additional
attributes are PSP-specific; `price_id` is used by Stripe and
Mollie to reference a pre-configured catalog item.

A Reader initiates purchase by POSTing a JSON body to the
Publisher's checkout endpoint (advertised in the Discovery
Document as `checkout`). The body MUST include `offer_id`;
additional fields (`psp`, `price_id`, gift flags, etc.) are
conveyed as described by the relevant section of this document.
The Publisher returns a JSON object containing either a
`checkout_url` (for redirect-based PSPs) or PSP-specific fields
for in-app confirmation.

## `om:trial`
{: #om-trial}

The `om:trial` element appears inside `om:offer`. Required
attribute: `days` (positive integer). Indicates a trial period
of the specified duration during which the Subscriber has full
entitlement without charge.

## `om:proration`
{: #om-proration}

The `om:proration` element MAY appear inside `om:offer` or at
channel level. The element value declares how mid-cycle tier
changes are billed and MUST be one of:

`none`:
: No proration; the new tier takes effect at the next billing
  cycle.

`daily`:
: Pro-rated to the day.

`immediate`:
: Full charge at the moment of upgrade; old plan canceled.

`psp-default`:
: Defer to the PSP's default behavior.

A Reader displaying an upgrade prompt SHOULD compute the prorated
amount client-side using the declared policy and the current
subscription start date, so that the Subscriber is informed of
the charge before confirming the upgrade.

## PSP Binding Profiles
{: #psp-profiles}

This section defines non-normative expectations for each PSP
profile. A Publisher's implementation MUST honor any declaration
it makes in the feed; the specific mechanism by which it honors
the declaration is PSP-dependent.

Stripe:
: Entitlements are derived from Stripe Subscription status plus
  Stripe Entitlements features. The Publisher's webhook handler
  reconciles `customer.subscription.*`, `invoice.paid`, and
  `charge.dispute.created` events against its local Entitlement
  store within 60 seconds.

Mollie:
: Entitlements are derived from Mollie Subscription status. The
  Publisher's webhook handler reconciles `subscription` and
  `chargeback` events.

PayPal, Adyen, Paddle:
: Analogous to Stripe; vendor-specific event names apply. Each
  declared Offer MUST reference a pre-configured product in the
  PSP's catalog.

Lightning:
: Per-payment, not subscription-based. Each `om:offer` using
  `psp="lightning"` represents a one-time access grant or
  periodic renewal triggered by fresh payment. No webhook exists;
  payment and entitlement are co-emitted by the Lightning
  settlement.

Custom:
: Publisher-defined. The Discovery Document MUST name the
  mechanism sufficiently for Reader implementers to understand
  the commitment surface.

# Value-for-Value
{: #v4v}

## `om:value`
{: #om-value}

The `om:value` element MAY appear at channel level or inside an
`item`. It declares a non-subscription monetary relationship: a
Reader may direct a tip, a streaming micropayment, or a share of
a boost to the named Recipients.

Required attribute: `type`, one of `lightning`, `fiat-micropay`,
or `custom`.

~~~ xml
<om:value type="lightning">
  <om:recipient name="Host" address="lnurl1..." split="80" />
  <om:recipient name="Producer" address="lnurl2..." split="20" />
</om:value>
~~~

## `om:recipient`
{: #om-recipient}

The `om:recipient` element appears inside `om:value`. Required
attributes: `name` (display string), `address` (PSP-specific
payment address), and `split` (integer percentage). The sum of
`split` values within a single `om:value` MUST be 100.

## `om:split`
{: #om-split}

The `om:split` element declares time-segmented recipient splits
inside an `item`, for cases where a long-form episode has
different recipient splits at different timestamps (for example,
an interview where the guest receives a share during their
segment). Required attributes: `start` and `end` (integer
seconds from item start), plus nested `om:recipient` elements
whose `split` values MUST sum to 100.

~~~ xml
<om:split start="0" end="1200">
  <om:recipient name="Host" address="lnurl1..." split="100" />
</om:split>
<om:split start="1200" end="3600">
  <om:recipient name="Host" address="lnurl1..." split="50" />
  <om:recipient name="Guest" address="lnurl3..." split="50" />
</om:split>
~~~

## Coexistence with `podcast:value`
{: #podcast-value}

Where a feed declares both `om:value` and `podcast:value`
{{PODCAST-NAMESPACE}} at the same scope, Readers SHOULD prefer
`om:value` unless they are in a Podcasting 2.0-specific context
(for instance, rendering a podcast episode's boostagram).
Publishers SHOULD keep the two blocks semantically equivalent;
divergence is a publisher configuration error.

# Verifiable Credentials Profiles
{: #vc-profiles}

## OM-VC 1.0
{: #om-vc}

The OM-VC 1.0 profile specifies how a W3C Verifiable Credential
2.0 {{W3C-VC-DATA-MODEL-2.0}} represents an Entitlement. The
profile URI is:

~~~
https://purl.org/rss/modules/membership/vc-profile/1.0
~~~

A credential conforming to OM-VC 1.0 MUST:

- Include `VerifiableCredential` and `OMMembershipCredential` in
  its `type` array.
- Include the OM-VC context URI in its `@context`.
- Carry a `credentialSubject` with at minimum: `publisher` (the
  Publisher's `om:provider` URI), `tier` (a Tier `id`) or
  `feature` (Feature `id` array), `validFrom`, `validUntil`.
- Carry a `credentialStatus` referencing a Bitstring Status List
  2021 entry {{W3C-VC-BITSTRING-STATUS-LIST}} for revocation.
- Use the `eddsa-rdfc-2022` or `ecdsa-rdfc-2019` signing suite.

A credential MAY include additional claims (subject email, group
membership, receipts), which Readers SHALL NOT assume are
required by the Publisher.

## OM-VC-SD 1.0
{: #om-vc-sd}

The OM-VC-SD 1.0 profile layers selective disclosure on OM-VC
1.0. The profile URI is:

~~~
https://purl.org/rss/modules/membership/vc-sd-profile/1.0
~~~

Differences from OM-VC 1.0:

- The signing suite is `bbs-2023` {{W3C-VC-DI-BBS}} rather than
  `eddsa-rdfc-2022` or `ecdsa-rdfc-2019`.
- The credential MAY include every claim an Issuer might assert,
  but the Holder generates a derived proof revealing only the
  subset the Verifier requires.
- The credential supports per-Verifier pseudonyms: when presented
  to Publisher A, the Holder reveals one stable pseudonym; when
  presented to Publisher B, a different stable pseudonym; the
  two cannot be linked even if the Publishers collude.

For an Entitlement check at a Publisher advertising
`om:authMethod` value `vc-presentation` and `om:privacy` value
`pseudonymous` ({{om-privacy}}), the Holder MUST disclose:

- `publisher` (MUST match the Verifier);
- `tier` or relevant `feature` claims;
- `validFrom`, `validUntil`;
- the per-Verifier pseudonym (`subject_pseudonym`).

The Holder MUST NOT disclose:

- the credential's Issuer-side subject identifier (the Holder's
  cross-Publisher identity);
- group membership claims, unless the Publisher specifically
  requires them ({{group-pseudonymous}});
- email, payment-method identifiers, or any other personally-
  identifying claim.

## `om:privacy`
{: #om-privacy}

The `om:privacy` element is a channel-level element declaring
the Publisher's privacy posture. The element value MUST be one
of:

`standard`:
: Default. Full credential claims are expected.

`pseudonymous`:
: Readers SHOULD present OM-VC-SD credentials with selective
  disclosure; the Publisher makes a binding commitment to not
  log or correlate disclosed pseudonyms with external
  identifiers.

`pseudonymous-required`:
: Non-pseudonymous credentials are rejected.

A Publisher declaring `pseudonymous` or `pseudonymous-required`
makes a binding commitment that affects what data it may
collect. Auditing this commitment is out of scope for the
Module; the Module provides Readers a way to select privacy-
respecting Publishers.

~~~ xml
<om:privacy>pseudonymous</om:privacy>
~~~

## Group Membership Under Selective Disclosure
{: #group-pseudonymous}

A Subscriber in a company group plan can prove "I am authorized
via an Acme Corp seat" without revealing which employee they
are. The credential carries a group identifier; the Holder
selectively discloses the group identifier without disclosing
the seat identifier; the Publisher accepts the group identifier
and the status list check as sufficient.

## Cryptosuite Pinning
{: #cryptosuite-pinning}

The `bbs-2023` cryptosuite is a W3C Candidate Recommendation at
the time of this document's publication. A Publisher
implementing OM-VC-SD 1.0 SHOULD pin to the cryptosuite version
listed in its Discovery Document under
`verifiable_credentials.cryptosuite`. Publishers lacking in-
house cryptographic-engineering capacity MAY delegate issuance
to an Umbrella Issuer.

# Bundles
{: #bundles}

## Aggregator Pattern
{: #aggregator-pattern}

A Bundle Aggregator is a Publisher that:

1. Operates its own Discovery Document, Offers, and checkout
   flow as any other Publisher.
2. Issues Entitlements (bearer tokens or Verifiable Credentials)
   that name other Publishers as their audience.
3. Maintains business agreements with those Publishers (out of
   scope for this specification) and publishes, in its Discovery
   Document, the list of participating Publishers (in scope).

A Subscriber pays the Aggregator, receives a credential, and
presents it at any participating Publisher. The participating
Publisher trusts the Aggregator's signature and grants access
without further payment.

## `om:bundle`
{: #om-bundle}

The `om:bundle` element is a channel-level element on an
Aggregator's feed. Required attribute: `id`. Attribute
`audience`: space-separated list of Publisher `om:provider`
URIs included in the Bundle. The element contains `om:tier`
and `om:offer` elements describing the Bundle's commercial
terms.

~~~ xml
<om:bundle id="indie-news-bundle"
           audience="https://fieldnotes.example https://underreported.example https://localcity.example">
  <om:tier id="bundle-paid" price="USD 15.00" period="monthly">All-access bundle</om:tier>
  <om:offer id="bundle-monthly" tier="bundle-paid">
    <om:price amount="15.00" currency="USD" period="P1M" />
    <om:checkout psp="stripe" price_id="price_bundle_..." />
  </om:offer>
</om:bundle>
~~~

## `om:bundled-from`
{: #om-bundled-from}

The `om:bundled-from` element is a channel-level element on a
participating Publisher's feed, declaring that the Publisher
accepts Entitlements from a named Aggregator. Required attribute:
`provider` (the Aggregator's `om:provider` URI).

The element contains one or more `om:trust` elements. Each
`om:trust` element declares a trust mechanism for the
Aggregator's credentials. Attributes: `did` (a Decentralized
Identifier {{DID-CORE}} resolving to the Aggregator's public
key) or `jwks_uri` (an HTTPS URI serving a JSON Web Key Set).

~~~ xml
<om:bundled-from provider="https://aggregator.example">
  <om:trust did="did:web:aggregator.example" />
  <om:trust jwks_uri="https://aggregator.example/.well-known/jwks.json" />
</om:bundled-from>
~~~

A participating Publisher MAY accept Bundle credentials and MUST
NOT charge the Bundled Subscriber additionally for the same
content. The Bundle's commercial terms (revenue share, audit
rights) are out of band.

## Credential Shape for Bundles
{: #bundle-credential}

A Bundle credential is an OM-VC with:

- `issuer` equal to the Aggregator's DID;
- `credentialSubject.audience` equal to an array of Publisher
  `om:provider` URIs;
- `credentialSubject.bundleId` equal to the Aggregator's
  `om:bundle` `id` value.

When a Reader presents a Bundle credential to a participating
Publisher's verification endpoint, the Publisher MUST verify:

1. The `issuer` appears in this Publisher's `om:bundled-from`
   list.
2. The `audience` array contains this Publisher's `om:provider`
   URI.
3. The credential's status entry indicates it is not revoked.
4. `validUntil` has not passed.

On success the Publisher issues a short-lived bearer token
scoped to itself. The Bundle credential is not sent in
subsequent feed fetches against that Publisher.

## Bundle Conformance Requirements
{: #bundle-conformance}

A Bundle Aggregator MUST:

- Operate full Level 5 conformance (Offers, checkout,
  Entitlement issuance) as a Publisher.
- Issue OM-VC credentials with valid `audience` arrays.
- Maintain a Bitstring Status List for issued Bundle
  credentials.
- Publish, in its Discovery Document, a `bundles` array listing
  every active Bundle and its participating Publishers.

A participating Publisher MUST:

- Accept presentations from Aggregators it lists in
  `om:bundled-from`.
- Issue its own scoped tokens after verification; the
  Publisher MUST NOT relay the Aggregator's credential to its
  own backend services beyond the verification endpoint.

# Lifecycle
{: #lifecycle}

## `om:revocation`
{: #om-revocation}

The `om:revocation` element is a channel-level element declaring
the Publisher's policy for revoking access after a refund,
chargeback, or subscription cancellation. Required attribute:
`policy`, one of:

`prospective-only`:
: Once content is delivered, the Subscriber keeps it; only
  future content is gated.

`chargeback-revocation`:
: Refunds keep delivered content; a chargeback (an externally-
  initiated dispute) revokes future tokens and invalidates
  existing access tokens for redelivery.

`full-revocation`:
: Refund or chargeback revokes everything; the Subscriber's
  tokens are invalidated.

Optional attribute: `grace_hours` (non-negative integer).
Specifies the period after subscription end during which the
Reader can still fetch already-listed content. Default: 0.

~~~ xml
<om:revocation policy="prospective-only" grace_hours="48" />
~~~

A Reader SHOULD display the Publisher's revocation policy on the
checkout screen when the policy is not `prospective-only`.

PSP binding of revocation is as follows:

- Stripe: the `charge.dispute.created` webhook MUST trigger the
  Publisher's revocation evaluation. If policy is
  `chargeback-revocation` or `full-revocation`, the Publisher
  updates the corresponding Bitstring Status List entry within
  1 hour.
- Mollie: the `chargeback` event on a payment SHOULD trigger
  the same evaluation.
- Lightning: not applicable; payments are final.

## `om:gift`
{: #om-gift}

The `om:gift` element is a channel-level element declaring a
giftable variant of an Offer. A gift is a transferable single-
use Entitlement: the purchaser pays, receives a redemption
token, and gives that token to the recipient, who binds it to
their own subject DID.

Required attributes: `offer` (an `om:offer` `id`) and
`redeemable_via` (an absolute HTTPS URI at which the recipient
redeems the token). Optional attribute: `transferable`
(boolean, default `true`). If `transferable` is `false`, the
gift can only be redeemed by the email or identity specified
at purchase.

~~~ xml
<om:gift offer="paid-yearly"
         redeemable_via="https://fieldnotes.example/gift/redeem"
         transferable="true" />
~~~

The gift purchase flow mirrors {{om-checkout}} with an
additional `as_gift: true` field in the checkout body,
optionally with `gift_recipient_email` and `gift_message`. The
Publisher holds the Entitlement in escrow until redemption.

The Publisher MUST hold gift Entitlements in escrow until
redemption and MUST honor `transferable="false"` when declared.

## Proration Policy Declaration
{: #proration-lifecycle}

See {{om-proration}}. Mid-cycle tier changes affect subscriber
experience in every PSP binding; declaration of the policy is
mandatory where any `om:offer` declares more than one Tier
upgrade path.

# Coexistence with Other Namespaces
{: #coexistence}

## RSS 2.0
{: #coexist-rss2}

The Module is a strict extension of RSS 2.0. An RSS 2.0 Reader
that does not understand the Module treats `om:*` elements as
unknown extension elements and ignores them. No element of the
Module displaces any element of {{RSS-2.0}}; the core channel
and item vocabulary is preserved.

## Atom
{: #coexist-atom}

An Atom {{RFC4287}} feed MAY embed Module elements as foreign
markup inside `atom:feed` and `atom:entry`. A non-normative
mapping of Module semantics to Atom-native constructs (for
instance, aligning `om:access` with an `atom:link rel`) is
given in {{OM-SYNDICATION}}.

## JSON Feed
{: #coexist-json}

A JSON Feed {{JSON-FEED-1.1}} document MAY express Module
semantics under a namespaced extension object as described in
{{OM-SYNDICATION}}. The mapping is semantic, not structural:
JSON Feed does not use XML namespaces, but each Module element
has an equivalent JSON Feed extension field.

## Podcasting 2.0
{: #coexist-podcast}

Module elements coexist with the Podcast Namespace
{{PODCAST-NAMESPACE}}. Readers processing a feed that uses both
SHOULD treat the namespaces as orthogonal: `podcast:transcript`,
`podcast:chapters`, and related elements describe podcast-
episode structure; `om:*` elements describe access policy.
Where both namespaces describe value-for-value splits (see
{{podcast-value}}), Readers SHOULD prefer `om:value` outside of
podcast-specific contexts.

## ActivityPub
{: #coexist-activitypub}

A Publisher running both an RSS feed and an ActivityPub
{{ACTIVITYPUB}} actor MAY use the Module in the RSS feed and,
at the Publisher's option, expose equivalent information
through the ActivityPub actor using the co-existence profile
described in {{OM-ACTIVITYPUB}}. The co-existence profile is
non-normative and does not alter the semantics of any Module
element.

# Security Considerations
{: #security}

## Scope
{: #security-scope}

This section addresses security risks arising from the
Module's introduction of access-controlled feed content,
tokenized feed URLs, and Verifiable Credential presentation. It
does not restate the security considerations of underlying
specifications (OAuth 2.0, DPoP {{RFC9449}}, VC Data Model 2.0
{{W3C-VC-DATA-MODEL-2.0}}, BBS+ {{W3C-VC-DI-BBS}}, SCIM
{{RFC7644}}), which apply in full.

## Token Theft and URL-Token Exposure
{: #security-url-token}

The `url-token` authentication method places the authentication
secret in the feed URL itself. A Subscriber who inadvertently
shares the URL (through a screenshot, a referrer leak, or an
analytics tag) shares the entitlement. Publishers using
`url-token` SHOULD issue per-Subscriber URLs containing at
minimum 128 bits of entropy and SHOULD detect anomalous usage
patterns (many distinct client IPs hitting the same URL) as a
signal to rotate the token.

Readers SHOULD NOT transmit URL-token feed URIs in referrer
headers, in shared logs, in error-reporting telemetry, or in
public clipboards. Readers SHOULD treat the URL as a bearer
credential and store it with at least the protections a bearer
token receives.

## Token Replay and DPoP Binding
{: #security-replay}

Bearer tokens conforming to {{RFC9068}} are replayable by any
party that obtains them. Publishers requiring non-replayable
tokens MUST advertise `om:authMethod` value `dpop` and enforce
{{RFC9449}} proof verification at the feed endpoint.

A Reader implementing `dpop` MUST generate a fresh DPoP proof
for each request and MUST NOT export the DPoP private key in
plaintext. See {{OM-PORTABILITY}} Section 12 for handling of
DPoP keys on reader-to-reader migration.

## Credential Replay
{: #security-cred-replay}

A Verifiable Credential presented to a Publisher's verification
endpoint is replayable until it is revoked or expires. Publishers
MUST issue short-lived scoped bearer tokens in response to a
valid presentation and MUST NOT treat the presented credential
as equivalent to a session secret. The short-lived token, not
the credential, is presented in subsequent feed fetches.

A Publisher's verification endpoint MUST check the credential's
status via the Bitstring Status List {{W3C-VC-BITSTRING-STATUS-LIST}}
on each presentation. Caching the status list is permitted
subject to the `cache-control` directives returned by the
Issuer.

## Revocation Race Conditions
{: #security-revocation-race}

A Publisher evaluating a chargeback or refund event and updating
a Bitstring Status List entry introduces a race window between
the Publisher's decision and the Issuer's status list update.
Within this window, a previously-issued short-lived bearer
token remains valid. Publishers that require immediate revocation
MUST issue bearer tokens with lifetimes shorter than the
acceptable exposure window (typical target: 60 minutes or less).

## Bundle Credential Misuse
{: #security-bundle-misuse}

A Bundle credential names an audience of Publishers. A
Publisher not named in the audience but presented with the
credential MUST reject it. A participating Publisher MUST NOT
re-issue or forward the Bundle credential to downstream
services; only the Publisher's locally-scoped bearer token
circulates.

An Aggregator whose signing key is compromised can issue forged
Bundle credentials until participating Publishers remove the
Aggregator from `om:bundled-from`. Aggregators MUST support
rapid key rotation through their advertised `jwks_uri`;
participating Publishers SHOULD re-fetch the `jwks_uri` on a
cadence no greater than 24 hours.

## Webhook Integrity
{: #security-webhook}

PSP webhooks deliver state transitions (subscription updates,
chargebacks, disputes) that drive revocation. Publishers MUST
verify webhook signatures per the PSP's documented mechanism
before applying any state transition. An unverified webhook
MUST NOT alter Entitlement state.

## Pseudonym Compromise
{: #security-pseudonym}

A per-Publisher pseudonym is stable for the credential's
lifetime. If a Publisher internally correlates a pseudonym with
a real identity (through side channels such as payment-method
fingerprinting or network-layer tracking), the pseudonymity
property is broken for that Publisher but is not broken for
other Publishers. A Subscriber who believes their pseudonym has
been compromised SHOULD revoke and re-issue the credential.

## Portability File Compromise
{: #security-portability}

An exported portability file containing bearer tokens, refresh
tokens, DPoP private keys, VC Holder keys, or pseudonym secrets
MUST be encrypted, as specified in {{OM-PORTABILITY}} Section 9.
A plaintext or weakly-encrypted portability file is, for the
lifetime of the contained tokens, equivalent to the Subscriber's
identity at each named Publisher. See {{OM-PORTABILITY}}
Section 12 for the full treatment.

## Transport Security
{: #security-transport}

All Module interactions - feed fetches, Discovery Document
retrieval, checkout flows, verification endpoints, SCIM
exchanges, status-list retrieval - MUST use HTTPS with TLS 1.2
or later. Publishers SHOULD prefer TLS 1.3. HTTP-only operation
of any Module endpoint is a conformance failure.

# Privacy Considerations
{: #privacy}

## Scope and Relationship to RFC 6973
{: #privacy-scope}

This section follows the structure recommended in {{RFC6973}}.
The Module is, by design, a commercial protocol: a Publisher
records that a given Subscriber has paid, at minimum for
billing and dispute-handling purposes. The privacy question is
therefore not "can a Publisher identify its Subscribers at all"
but "can a Subscriber's activity be linked across multiple
Publishers, and can a Publisher collect more than it needs?"

## Per-Publisher Pseudonymity
{: #privacy-pseudonyms}

The OM-VC-SD profile ({{om-vc-sd}}) defines per-Verifier
pseudonyms. A Subscriber holding a single OM-VC-SD credential
and presenting it to ten Publishers appears to each Publisher
as a different subject. Publishers cannot link their respective
pseudonyms by any operation at the credential layer.

## Acknowledged Limits
{: #privacy-limits}

OM-VC-SD provides per-Publisher pseudonymity at the credential
layer. It does not provide network-layer or payment-method
unlinkability. A Subscriber who always uses the same IP address
and always pays with the same card is still trackable by
parties with access to that infrastructure (the payment
network, the Subscriber's network provider). This
specification addresses the credential layer; the surrounding
infrastructure cannot be fixed by a feed vocabulary.

Concretely:

- A Subscriber to ten different Publishers under one Umbrella
  Issuer can be ten different pseudonyms to those ten
  Publishers.
- A Publisher cannot prove that any two of its Subscribers
  came from the same upstream identity.
- A Subscriber's payment is visible to the PSP but not to the
  Publisher's analytics, if the Subscriber chooses
  pseudonymous mode.

What is NOT provided:

- Network-level anonymity (the Reader still connects from a
  real IP address).
- Payment-method anonymity (the PSP sees the Subscriber's
  payment instrument).
- Protection against a malicious Publisher that correlates a
  pseudonym with article-access patterns across time and
  infers an identity from content selection.

Implementers MUST NOT represent OM-VC-SD to users as providing
anonymity; the Module provides unlinkability at the credential
layer only.

## Data Minimization on Publishers Declaring Pseudonymity
{: #privacy-minimization}

A Publisher declaring `om:privacy` value `pseudonymous` or
`pseudonymous-required` makes a binding commitment:

- The Publisher MUST NOT log, store, or correlate disclosed
  pseudonyms with any external identifier (email, payment
  method, IP address persisted beyond a session).
- The Publisher SHOULD minimize retention of pseudonym-tagged
  access logs to what is operationally necessary (abuse
  prevention, fraud response).
- The Publisher MUST NOT disclose pseudonym-tagged access logs
  to third parties except under legal compulsion, and MUST
  document its disclosure posture in public documentation.

## Cross-Reader Migration
{: #privacy-cross-reader}

A portability export file ({{OM-PORTABILITY}}) is the single
point at which per-Publisher identities are co-resident in a
single artifact. {{OM-PORTABILITY}} Section 8 defines rules
P1–P5 constraining what an export MAY contain. Implementers
MUST implement those rules: in particular, the export MUST
preserve per-Publisher pseudonyms so that migration appears as
session continuation rather than new-subscriber events at each
Publisher.

## Group Privacy
{: #privacy-group}

A Subscriber in a self-managed group plan authenticates via a
group credential. Under OM-VC-SD, the Subscriber's seat
identifier MAY be withheld from the Publisher; only the group
identity is disclosed. This is the configuration that makes
corporate or institutional subscriptions tenable for privacy-
sensitive publications.

## Third-Party Disclosure
{: #privacy-third-party}

A Publisher MUST NOT disclose a Subscriber's pseudonym, group
membership, or access logs to third parties as a routine
operational practice. Emergency disclosure (subpoena, court
order) is out of scope for this specification.

# IANA Considerations
{: #iana}

## Namespace URI Registration
{: #iana-namespace}

IANA is requested to register the Module's namespace URI in the
RDF/XML Syntax Specification Namespace registry (or its
successor), or the review body is requested to route the
registration appropriately:

- Namespace URI: `http://purl.org/rss/modules/membership/`
- Canonical profile URI: `https://purl.org/rss/modules/membership/1.0/`
- Suggested prefix: `om`
- Specification document: this RFC.

## Well-Known URI Registration
{: #iana-well-known}

IANA is requested to register the following well-known URI
suffix per {{RFC8615}}:

- URI suffix: `open-membership`
- Change controller: Independent
- Specification document: this RFC, {{well-known}}
- Related information: the suffix is used for the Open
  Membership Discovery Document, a JSON document served with
  media type `application/json`.

## Media Type Registrations
{: #iana-media-types}

IANA is requested to register the following media types
pursuant to the rules in the Portability Format companion
specification {{OM-PORTABILITY}}:

`application/vnd.om-membership-export+json`:
: Plaintext Subscriber Portability export. JSON-LD document
  conforming to the Subscriber Portability Format 1.0
  specification {{OM-PORTABILITY}}. Publisher: Open Membership
  Working Group. Change controller: Independent.

`application/vnd.om-membership-export+jwe`:
: JOSE-encrypted Subscriber Portability export using A256GCM
  content encryption and a PBES2-HS512+A256KW key wrap. See
  {{OM-PORTABILITY}} Section 9.

`application/vnd.om-membership-export+age`:
: age-encrypted Subscriber Portability export. See
  {{OM-PORTABILITY}} Section 9.

## JSON-LD Context URI
{: #iana-jsonld}

IANA is requested to acknowledge the following JSON-LD context
URI, registered under the Module's stewardship:

- `https://purl.org/rss/modules/membership/portability/v1` —
  JSON-LD context for the Portability Format.

## Registries Not Extended
{: #iana-not-extended}

OAuth 2.0 Protected Resource Metadata {{RFC9728}} is
referenced but not extended by this document; no IANA action
is requested there. The Bitstring Status List registry
{{W3C-VC-BITSTRING-STATUS-LIST}} is likewise referenced but
not extended.

# Implementation Status
{: #implementation-status}

This section records the status of known implementations of the
protocol defined by this specification at the time of posting.
As described in {{RFC7942}}, its inclusion is not a prejudgment
of the maturity of the specification; the RFC Editor is
requested to remove the section prior to publication. A fuller
and more current implementation status is maintained by the
Module's custodian at the registry URL.

## Reference Publisher Implementations
{: #impl-publishers}

om-ghost:
: A plugin for the Ghost CMS exposing the Module over Ghost's
  existing Members and Stripe integrations. Implements feed
  emission, Discovery Document serving, `/api/checkout`,
  `/api/entitlements`, `/api/portal`, JWT-issuing token
  endpoint, and optional OM-VC issuance. Conformance level: 5
  plus optional Level 4 VC issuance. See {{OM-GHOST}}.

om-wordpress:
: A plugin for WordPress providing the Module over a
  membership-plugin substrate. Implements feed emission,
  Discovery Document serving, checkout, and entitlement
  synchronization. Conformance level: 5. See
  {{OM-WORDPRESS}}.

om-static:
: An Eleventy + Cloudflare Workers reference for edge-hosted
  static sites. Implements feed emission and a minimal
  verification endpoint. Conformance level: 2 with optional
  Level 4.

## Reference Reader Implementations
{: #impl-readers}

A fork of Miniflux implementing the Indie Reader profile
(Levels 1, 2, and 5). A second reference reader is in
development covering, at minimum, the same Indie Reader
profile; the working group's Phase 4 target is NetNewsWire,
Reeder, or Feeder, whichever materializes first.

## Interoperability Test Suite
{: #impl-test-suite}

A public test suite (publisher tests and reader conformance
harness) is operated by the Module's custodian. It issues
run-specific artifacts for each invocation and accepts self-
certification submissions.

## Production Publishers
{: #impl-production}

As of the time of this document's posting, [N] Publishers are
in production across three personas (text-first newsletter,
audio/video per-tier RSS, investigative-journalism privacy-
mode). The working group target for 1.0 is ten production
Publishers across the three personas. The current list is
maintained at the registry URL.

## Conformance Profiles Reported
{: #impl-profiles}

Readers self-certify one of:

Indie Reader profile:
: Levels 1, 2, and 5. Supports URL-token feeds, in-app checkout
  flows, and the minimum portable membership set.

Enterprise Reader profile:
: Levels 1, 2, 3, 4, and 5. Adds bearer and DPoP auth,
  OM-VC 1.0 verification, and full PSP support.

Privacy Reader profile:
: Levels 1, 2, 3, 4, 5, and 7. Adds pseudonymous OM-VC-SD
  verification.

Full Conformance profile:
: All levels 1 through 8. Adds value-for-value (Level 6) and
  Bundles (Level 8).

# Acknowledgments
{: #acknowledgments}

This specification draws on the work of many communities and
prior specifications. The Podcast Index, and in particular its
discipline of declaring a stable core vocabulary with minimal
churn, is the immediate model for this Module's governance. The
W3C Verifiable Credentials Working Group provided the
credential data model and the BBS+ cryptosuite on which the
OM-VC and OM-VC-SD profiles depend. The Podcasting 2.0
community's value-for-value primitives inform the
`om:value` family of elements and coexistence profile.

The WorkOS team's work on JWT-encoded entitlements informed the
bundle-credential construction. The age encryption project
supplied the default cipher for the Subscriber Portability
companion specification. The IndieWeb community's emphasis on
small, implementation-driven protocol evolution informs the
Module's approach to conformance and community event cadence.

The Module borrows its structural approach - a small normative
core with companion non-normative mappings - from RSS 2.0
itself, whose custodianship transfer from UserLand to Harvard
established the precedent of neutral custody for syndication-
layer specifications.

The authors thank the external reviewers from the
Implementer-1, Implementer-2, Implementer-3, security, and
privacy reviewer pools for their comments on earlier drafts.
Responsibility for remaining errors is the authors' alone.

--- back

# Appendix A: Worked Examples
{: #appendix-examples}

This appendix is non-normative. It provides two end-to-end
worked examples illustrating how Module elements compose.

## A.1 Investigative Journalism Publisher
{: #example-journalism}

A small investigative news organization wishes to offer paid
subscriptions but cannot ethically maintain a subscriber list
that could be subpoenaed. The publisher's feed declares:

~~~ xml
<rss version="2.0" xmlns:om="http://purl.org/rss/modules/membership/">
  <channel>
    <title>Underreported</title>
    <link>https://underreported.example/</link>
    <description>Independent investigative journalism.</description>

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
  </channel>
</rss>
~~~

Subscriber flow:

1. The Subscriber pays via Stripe. Stripe observes the
   payment. The Publisher observes only that an Entitlement
   was issued.
2. An Umbrella Issuer signs an OM-VC-SD credential including
   the Subscriber's email, full name, and pseudonym salts. The
   credential never reaches the Publisher in full form.
3. The Subscriber's Reader generates a derived BBS proof
   disclosing only `publisher`, `tier`, `validFrom`,
   `validUntil`, and a per-Publisher pseudonym.
4. The Publisher's verification endpoint validates the proof
   and issues a 1-hour bearer token scoped to the pseudonym.
5. The Subscriber reads articles. The Publisher logs the
   pseudonym, not an identity.
6. Upon subpoena, the Publisher can produce pseudonym-to-
   article-access logs but cannot link any pseudonym to a
   real person.

## A.2 Indie Bundle
{: #example-bundle}

Three independent Publishers form a Bundle through an
Aggregator. None gives up direct subscription business; the
Bundle is additive.

The Aggregator's feed declares:

~~~ xml
<om:bundle id="indie-news"
           audience="https://fieldnotes.example https://underreported.example https://localcity.example">
  <om:offer id="bundle-monthly">
    <om:price amount="20.00" currency="USD" period="P1M" />
    <om:checkout psp="stripe" price_id="price_bundle_..." />
  </om:offer>
</om:bundle>
~~~

Each participating Publisher's feed declares:

~~~ xml
<om:bundled-from provider="https://indie-bundle.example">
  <om:trust did="did:web:indie-bundle.example" />
</om:bundled-from>
~~~

Subscriber flow:

1. The Subscriber pays the Aggregator.
2. The Aggregator issues an OM-VC with `audience` equal to the
   array of three Publisher `om:provider` URIs.
3. When the Reader fetches a participating Publisher's feed,
   it presents the Bundle credential to that Publisher's
   verification endpoint.
4. The Publisher validates: the Aggregator appears in
   `om:bundled-from`; the `audience` contains this Publisher's
   URI; status list check passes.
5. The Publisher issues a Publisher-scoped bearer token.
6. The same flow runs at each other participating Publisher.

The Aggregator never holds the Publishers' content; the
Publishers never hold the Aggregator's Subscriber data beyond
the pseudonym. Revenue share between Aggregator and Publishers
is settled out of band, governed by whatever business
agreement they signed.

# Appendix B: Discovery Document Shape
{: #discovery-shape}

This appendix is non-normative. It lists the Discovery Document
members referenced throughout this specification, aggregated
here for implementer convenience. The authoritative definition
of each member is the section of this document in which it is
introduced.

~~~ json
{
  "spec_version": "1.0",
  "provider": "https://fieldnotes.example",
  "auth_methods": ["bearer", "vc-presentation"],
  "token_endpoint": "https://fieldnotes.example/api/token",
  "verification_endpoint": "https://fieldnotes.example/api/verify",
  "checkout": "https://fieldnotes.example/api/checkout",

  "psp": [
    { "id": "stripe", "account": "acct_1ABCD..." },
    { "id": "mollie", "account": "ZXC1234" }
  ],

  "offers": [
    {
      "id": "supporter-monthly",
      "tier": "paid",
      "price": { "amount": "12.00", "currency": "USD", "period": "P1M" },
      "checkout": { "psp": "stripe", "price_id": "price_..." },
      "proration": "daily"
    }
  ],

  "verifiable_credentials": {
    "profile": "https://purl.org/rss/modules/membership/vc-profile/1.0",
    "selective_disclosure_profile":
      "https://purl.org/rss/modules/membership/vc-sd-profile/1.0",
    "cryptosuite": "bbs-2023"
  },

  "groups": { "supported": true, "scim_endpoint_pattern":
    "https://fieldnotes.example/scim/v2/groups/{id}" },

  "revocation": { "policy": "prospective-only", "grace_hours": 48 },

  "privacy": {
    "level": "standard",
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
  }
}
~~~

# Appendix C: Design Rationale Pointers
{: #appendix-rationale}

This appendix is non-normative. A narrative rationale for this
Module's design choices - including analyses of prior and
contemporaneous open specifications (RSS, RSS 1.0, Podcasting
2.0, ActivityPub, OpenID Connect, Signal Protocol, IndieWeb)
and of incumbent proprietary platforms - is maintained at the
custodian URL under `/rationale/`. That document is not part
of the normative specification and is not required reading
for implementers; it is provided for historical and
educational purposes.

The Module is designed for three target Publisher personas:

1. Text-first writers seeking tokenized paid RSS without
   cookie-based session dependencies;
2. Audio and video creators offering per-tier feeds alongside
   existing podcast distribution;
3. Investigative journalism and other sensitive publications
   requiring pseudonymous subscriber identity.

These personas should be visible in every implementation
conversation that references this specification; features
that do not serve at least one of them are out of scope.

# Appendix D: Conformance Levels Summary
{: #appendix-levels}

This appendix is non-normative. Table 1 summarizes the
conformance levels defined across the sections of this
specification. Implementers state which levels they support;
levels are cumulative.

| Level | Name | Introduces |
|-------|------|------------|
| 1 | Parsing | Namespace, `om:provider`, `om:tier`, `om:access`, `om:preview`, `om:discovery` |
| 2 | URL token | `url-token` auth, `om:unlock`, publisher-managed groups |
| 3 | Bearer and time | `bearer`/`dpop`, `om:window`, self-managed groups |
| 4 | OM-VC 1.0 | `vc-presentation`, OM-VC 1.0 profile, status-list revocation |
| 5 | Commerce | `om:psp`, `om:offer`, `om:feature`, `om:includes`, `om:receipt`, `om:revocation`, `om:gift`, `om:proration`, Portability export |
| 6 | Value-for-value | `om:value`, `om:recipient`, `om:split` |
| 7 | Privacy | OM-VC-SD 1.0 profile, `om:privacy`, per-Publisher pseudonyms |
| 8 | Bundles | `om:bundle`, `om:bundled-from`, `om:trust`, Bundle credential flow |

# Appendix E: Change Log
{: #appendix-changelog}

This appendix is non-normative and will be removed by the RFC
Editor prior to publication.

- draft-open-membership-rss-00: Initial Independent Submission
  draft, derived from Open Membership RSS 0.4 Markdown
  specification and the Subscriber Portability Format 1.0
  companion.
