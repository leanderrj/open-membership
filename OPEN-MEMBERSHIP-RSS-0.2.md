# Open Membership RSS 0.2

**An open module for paid, tiered, time-gated, and group-shared syndication content.**

- **Latest version:** `http://purl.org/rss/modules/membership/`
- **This version:** 0.2 (draft, 2026-04-23)
- **Previous version:** 0.1 (2026-04-23)
- **Namespace URI:** `http://purl.org/rss/modules/membership/`
- **Suggested prefix:** `om`
- **Status:** Draft for public comment. Not yet frozen.

## Copyright

Copyright © 2026 by the Authors.

Permission to use, copy, modify and distribute the Open Membership RSS Specification and its accompanying documentation for any purpose and without fee is hereby granted in perpetuity, provided that the above copyright notice and this paragraph appear in all copies.

The copyright holders make no representation about the suitability of the specification for any purpose. It is provided "as is" without expressed or implied warranty. This copyright applies to the Open Membership RSS Specification and accompanying documentation and does not extend to the format itself.

## Changes from 0.1

1. **Discovery.** `.well-known/open-membership` is defined as the canonical discovery document, composed with `.well-known/oauth-protected-resource` (RFC 9728).
2. **Time-gating.** New `<om:window>` element distinguishes early-access and expiry-based gating from tier-gating.
3. **Group subscriptions.** New channel-level `<om:group>` element and item-level `<om:access>` `scope` attribute model company, family, and institutional memberships. Directory sync semantics match the WorkOS Organizations + SCIM pattern.
4. **Verifiable-credential profile.** New normative profile ("OM-VC Profile 1.0") defines a minimum viable W3C VC 2.0 shape that any `om`-compliant reader MUST accept as proof of entitlement, regardless of issuer.
5. **WorkOS reference binding.** Non-normative Appendix A shows how Organizations and Directory Sync map to `om:group` primitives, so an umbrella auth provider can issue entitlements on behalf of many publishers.

---

## 1. Abstract

Open Membership RSS (`om`) is a namespace-based extension to RSS 2.0 and RSS 1.0/RDF that lets a publisher describe membership tiers, time-based content windows, group-shared entitlements, and preview/full content relationships in a portable, reader-agnostic way. Version 0.2 adds the primitives needed for the three hardest cases a real paid-feed ecosystem has to handle: content that's free today and paid tomorrow (or vice versa), a subscription that covers a whole household or company, and portable proof of entitlement that doesn't tie a reader to a single platform.

The spec is deliberately small. It defines *what* a feed needs to say; it does not define a new payment protocol, identity system, or DRM scheme.

## 2. Design Principles

1. **Layer, don't replace.** `om` is an XML namespace module. A feed remains valid RSS with `om` elements stripped.
2. **Preview-first.** Every `<item>` is renderable by a dumb reader. Gated content is additive.
3. **Compose with existing standards.** OAuth 2.0 Protected Resource Metadata (RFC 9728) for discovery. W3C Verifiable Credentials 2.0 for portable entitlement. SCIM 2.0 for group membership. These are the working pieces; this spec glues them together for RSS.
4. **Easy to implement.** Level 1 conformance requires parsing a few new tags. Level 2 adds URL-token auth. Higher levels add bearer tokens and VC verification only for readers and publishers that want them.
5. **No new identity system.** Identity is delegated to the publisher or a third party (e.g., a WorkOS-style umbrella provider).

## 3. Namespace Declaration

```xml
<rss version="2.0"
     xmlns:om="http://purl.org/rss/modules/membership/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    ...
  </channel>
</rss>
```

RDF-form declaration is unchanged from 0.1.

## 4. Channel-Level Elements

### 4.1 `<om:provider>` (required if any `om:` elements are present)

A URI identifying the entity that issues and validates entitlements for this feed. This URI MUST resolve to a protected-resource metadata document (see §7). The provider MAY be the publisher's own origin or a third-party umbrella provider.

```xml
<om:provider>https://fieldnotes.example</om:provider>
```

Or, delegated to an umbrella:

```xml
<om:provider>https://auth.example-umbrella.com/publishers/fieldnotes</om:provider>
```

### 4.2 `<om:authMethod>` (required, repeatable)

Unchanged from 0.1. Values: `url-token`, `http-basic`, `bearer`, `dpop`, plus new in 0.2: `vc-presentation` (see §8).

### 4.3 `<om:tier>` (optional, repeatable)

Unchanged from 0.1. Attributes: `id` (required), `price`, `period`.

### 4.4 `<om:group>` (optional, repeatable) — **new in 0.2**

Declares a named group subscription shape that the publisher supports. A group subscription is one where a single entitlement grants access to multiple human subscribers under an administrative boundary: a company, a household, a classroom, a library system.

Attributes:

- `id` (required) — opaque identifier, unique within the channel
- `kind` (required) — one of `company`, `family`, `institution`, `custom`
- `seats` (optional) — integer, maximum simultaneous members; omit for unlimited
- `admin` (optional) — `self-managed` (the group manages its own roster, e.g. via SCIM) or `publisher-managed` (roster changes flow through the publisher)

Element text content is a human-readable label.

```xml
<om:group id="team" kind="company" seats="25" admin="self-managed">Team plan (up to 25 seats)</om:group>
<om:group id="household" kind="family" seats="6" admin="publisher-managed">Household plan (up to 6 people)</om:group>
<om:group id="campus" kind="institution" admin="self-managed">Campus site license</om:group>
```

Groups and tiers are orthogonal: a `company` group plan might grant `paid` tier access to everyone on the roster.

### 4.5 `<om:signup>` (optional)

Unchanged from 0.1.

### 4.6 `<om:tokenEndpoint>` (optional)

Unchanged from 0.1. In 0.2, publishers SHOULD prefer advertising the token endpoint via the protected-resource metadata document rather than inline.

### 4.7 `<om:discovery>` (optional) — **new in 0.2**

A URL to the canonical discovery document for this feed (see §7). If omitted, readers SHOULD construct the URL per §7.1.

```xml
<om:discovery>https://fieldnotes.example/.well-known/open-membership</om:discovery>
```

## 5. Item-Level Elements

### 5.1 `<om:access>` (required on any gated item)

Declares the access policy for this item.

Attributes:

- `tier` (optional) — references an `id` from a channel-level `<om:tier>`
- `group` (optional) — references an `id` from a channel-level `<om:group>`; if set, members of that group have access
- `scope` (optional) — `individual` (default), `group`, or `either`; controls how entitlements are evaluated

Text content values (unchanged from 0.1):

- `open` — freely available
- `preview` — shortened version is in the feed
- `locked` — listed but no content without entitlement
- `members-only` — existence is the only public information

```xml
<om:access tier="paid" scope="either">preview</om:access>
<om:access group="campus" scope="group">locked</om:access>
```

### 5.2 `<om:window>` (optional, repeatable) — **new in 0.2**

Time-gating. Declares a time interval during which a different access policy applies. A reader evaluates `<om:window>` elements in document order; the first window whose interval contains "now" wins. If no window matches, the default `<om:access>` applies.

Attributes:

- `from` (optional) — ISO 8601 datetime; omit for "open-ended start"
- `until` (optional) — ISO 8601 datetime; omit for "open-ended end"
- `tier` (optional) — different tier for this window
- `group` (optional) — different group for this window

Text content values: same as `<om:access>`.

This supports the four canonical time-gating cases:

**Early access (paid-first, then free):**

```xml
<om:access tier="free">open</om:access>
<om:window until="2026-04-30T00:00:00Z" tier="paid">preview</om:window>
```

**Ephemeral free (free-first, then paid):**

```xml
<om:access tier="paid">locked</om:access>
<om:window until="2026-05-07T00:00:00Z" tier="free">open</om:window>
```

**Scheduled drop:**

```xml
<om:access>members-only</om:access>
<om:window from="2026-05-01T08:00:00Z" tier="paid">preview</om:window>
<om:window from="2026-06-01T08:00:00Z" tier="free">open</om:window>
```

**Event-window access (e.g. a conference talk free during the event):**

```xml
<om:access tier="paid">preview</om:access>
<om:window from="2026-05-15T00:00:00Z" until="2026-05-18T23:59:59Z" tier="free">open</om:window>
```

Publishers MUST NOT rely on `<om:window>` for anti-piracy: a reader that caches content during an `open` window retains it. `<om:window>` is a publication-policy tool, not a DRM tool.

### 5.3 `<om:unlock>` (optional)

Unchanged from 0.1.

### 5.4 `<om:preview>` (optional)

Unchanged from 0.1.

### 5.5 `<om:receipt>` (optional)

Extended in 0.2. Attributes:

- `accepts` — space-separated list of acceptable proof formats. New in 0.2: `vc-presentation` (see §8).

```xml
<om:receipt accepts="lightning-preimage jwt vc-presentation" />
```

## 6. Reference Example

A newsletter with a free tier, a paid tier, a household plan, and a company plan, featuring a time-gated early-access post and a household-shared post:

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
    <om:discovery>https://fieldnotes.example/.well-known/open-membership</om:discovery>
    <om:authMethod>url-token</om:authMethod>
    <om:authMethod>bearer</om:authMethod>
    <om:authMethod>vc-presentation</om:authMethod>
    <om:signup>https://fieldnotes.example/subscribe</om:signup>

    <om:tier id="free">Free</om:tier>
    <om:tier id="paid" price="USD 8.00" period="monthly">Paid</om:tier>
    <om:tier id="founding" price="USD 150.00" period="yearly">Founding</om:tier>

    <om:group id="household" kind="family" seats="6" admin="publisher-managed">Household plan</om:group>
    <om:group id="team" kind="company" seats="25" admin="self-managed">Team plan</om:group>

    <item>
      <title>The paid-feed stack, part two</title>
      <link>https://fieldnotes.example/paid-feed-stack-2</link>
      <guid isPermaLink="false">fieldnotes-0044</guid>
      <pubDate>Thu, 23 Apr 2026 08:00:00 GMT</pubDate>
      <om:access tier="free" scope="either">open</om:access>
      <om:window until="2026-04-30T08:00:00Z" tier="paid">preview</om:window>
      <om:preview><![CDATA[<p>Paid subscribers get this week early. Free on April 30.</p>]]></om:preview>
      <om:unlock>https://fieldnotes.example/api/items/0044/full</om:unlock>
    </item>

    <item>
      <title>Team debrief: Q1 retrospective</title>
      <link>https://fieldnotes.example/q1-retro</link>
      <guid isPermaLink="false">fieldnotes-0045</guid>
      <pubDate>Thu, 23 Apr 2026 08:00:00 GMT</pubDate>
      <om:access group="team" scope="group">locked</om:access>
      <om:unlock>https://fieldnotes.example/api/items/0045/full</om:unlock>
    </item>
  </channel>
</rss>
```

## 7. Discovery (`.well-known/open-membership`) — **new in 0.2**

### 7.1 Location

A conformant publisher MUST publish a discovery document at:

```
https://{provider-host}/.well-known/open-membership
```

For path-scoped providers (a shared-host umbrella serving many publishers), the RFC 8615 path-append rule applies, matching RFC 9728 §3.1:

```
https://auth.example-umbrella.com/.well-known/open-membership/publishers/fieldnotes
```

The document is served as `application/open-membership+json` (fallback: `application/json`).

### 7.2 Document Schema

The document is a JSON object. It composes with — and MAY be merged into — an RFC 9728 `oauth-protected-resource` document served at the sibling `.well-known` path.

```json
{
  "spec_version": "0.2",
  "provider": "https://fieldnotes.example",
  "publisher_name": "Field Notes",
  "feed_urls": [
    "https://fieldnotes.example/feed.xml"
  ],
  "auth_methods": ["url-token", "bearer", "vc-presentation"],
  "authorization_servers": [
    "https://auth.example-umbrella.com"
  ],
  "token_endpoint": "https://auth.example-umbrella.com/oauth/token",
  "signup_url": "https://fieldnotes.example/subscribe",
  "bearer_methods_supported": ["header"],
  "dpop_signing_alg_values_supported": ["ES256", "EdDSA"],
  "tiers": [
    {"id": "free", "label": "Free"},
    {"id": "paid", "label": "Paid", "price": "USD 8.00", "period": "monthly"},
    {"id": "founding", "label": "Founding", "price": "USD 150.00", "period": "yearly"}
  ],
  "groups": [
    {"id": "household", "kind": "family", "seats": 6, "admin": "publisher-managed", "label": "Household"},
    {"id": "team", "kind": "company", "admin": "self-managed", "seats": 25, "label": "Team",
     "scim_endpoint": "https://fieldnotes.example/scim/v2",
     "scim_version": "2.0"}
  ],
  "verifiable_credentials": {
    "profile": "https://purl.org/rss/modules/membership/vc-profile/1.0",
    "accepted_issuers": [
      "did:web:auth.example-umbrella.com",
      "did:web:fieldnotes.example"
    ],
    "presentation_endpoint": "https://fieldnotes.example/api/vc/verify"
  }
}
```

### 7.3 Required Fields

- `spec_version` — MUST be present.
- `provider` — MUST match the `<om:provider>` URI used in the RSS feed.
- `feed_urls` — at least one URL.
- `auth_methods` — at least one.

### 7.4 Composition with RFC 9728

A publisher MAY serve both `.well-known/open-membership` and `.well-known/oauth-protected-resource`. The `om` document is the source of truth for `om`-specific fields (tiers, groups, VC profile). The RFC 9728 document is the source of truth for OAuth-specific fields (authorization servers, supported bearer methods, DPoP algorithms). Fields MAY be duplicated across both for client convenience; if they conflict, the RFC 9728 document wins for OAuth fields.

A reader that already supports RFC 9728 can reach Level 2 conformance without any `om`-specific discovery, by treating the feed URL as the protected resource.

### 7.5 Discovery Flow

A reader encountering an `om`-tagged feed SHOULD:

1. Read the `<om:provider>` and (if present) `<om:discovery>` elements from the feed.
2. If `<om:discovery>` is present, fetch that URL.
3. Otherwise, construct `{provider}/.well-known/open-membership` (applying RFC 8615 path-append rules if provider has a path component).
4. Validate that the returned document's `provider` field matches `<om:provider>`.
5. Use the returned metadata to select an auth method and drive the subsequent flow.

## 8. Group Subscriptions — **new in 0.2**

Groups solve the case where one entitlement covers many humans: a company buys a team plan, a family shares one subscription, a university site-licenses a publication for all its students. 0.2 defines two operational shapes.

### 8.1 Publisher-Managed Groups (families, small teams)

The publisher holds the roster. The group admin invites or removes members through the publisher's own UI. Each roster member gets a normal individual credential (URL token, bearer token, or VC) that happens to carry a `group_id` claim.

**When to use:** under ~25 seats, B2C context, no existing IT infrastructure on the group's side. This is the shape Netflix-household and Spotify-family use.

**Roster representation:** internal to the publisher. Not specified here.

### 8.2 Self-Managed Groups (companies, institutions)

The group admin manages the roster in their own identity system — typically Okta, Microsoft Entra ID, Google Workspace, or an umbrella like WorkOS — and pushes roster changes to the publisher via SCIM 2.0 (RFC 7643 + RFC 7644). When an employee joins the company, they appear in the feed's entitled-users list within minutes; when they leave, access is revoked without the publisher doing anything manually.

**When to use:** company plans, institutional site licenses, any group whose membership is already managed in an enterprise directory.

**Roster representation:** the publisher exposes a SCIM endpoint declared in `.well-known/open-membership` under `groups[].scim_endpoint`. The group's IT admin configures their directory provider to push to that endpoint.

### 8.3 Entitlement Evaluation

For an item with `<om:access scope="group" group="team">`, a reader MUST present credentials sufficient for the reader's platform to prove:

1. The human is currently a member of a group with `id="team"` on this publisher, AND
2. The group's subscription is active.

For `scope="either"`, access is granted if **either** the individual holds a matching tier **or** the human is in a matching group.

For `scope="individual"` (the default), group membership is not considered.

### 8.4 Transferability and Seat Reassignment

Seats are NOT transferable between humans within a billing cycle without explicit publisher policy. A seat freed by a removed user MAY be reassigned immediately. A reader MUST NOT cache group entitlements beyond the shorter of:

- The access token's stated expiry, or
- 24 hours.

This is the mechanism that makes "my coworker left the company" work correctly: the next token refresh fails, and the reader falls back to preview.

## 9. Minimum Viable Verifiable-Credential Profile ("OM-VC 1.0") — **new in 0.2**

The VC profile defines the smallest shape of a W3C Verifiable Credential 2.0 that any `om`-compliant reader at Level 4 MUST accept as proof of entitlement. The purpose is portability: a subscription bought on Umbrella A should be presentable to Publisher B served through Umbrella C, without bilateral integration.

This section is NORMATIVE.

### 9.1 Credential Type

An Open Membership Credential is a W3C Verifiable Credential 2.0 with:

- `@context` including `https://www.w3.org/ns/credentials/v2` and `https://purl.org/rss/modules/membership/vc/v1`
- `type` including `VerifiableCredential` and `OpenMembershipCredential`

### 9.2 Required Claims

The `credentialSubject` object MUST contain:

| Claim | Type | Meaning |
|---|---|---|
| `id` | URI | Subject DID or stable identifier for the human |
| `publisher` | URI | The `<om:provider>` this credential is valid for |
| `tier` | string | Matches a published `tier.id` |
| `validFrom` | ISO 8601 datetime | Start of entitlement |
| `validUntil` | ISO 8601 datetime | End of entitlement |

The top-level credential MUST include a standard VC 2.0 `issuer` field (a DID or HTTPS URI the verifier can resolve) and a `proof` or enveloping signature per VC-Data-Integrity or VC-JOSE-COSE.

### 9.3 Optional Claims

| Claim | Type | Meaning |
|---|---|---|
| `group` | object | If this credential is group-derived, see §9.4 |
| `seatId` | string | Stable identifier within the group; survives removal+re-add |
| `transferable` | boolean | Default false |
| `audience` | array of URIs | List of publishers this credential is valid for (for umbrella-issued cross-publisher creds) |

### 9.4 Group Subject Shape

```json
"credentialSubject": {
  "id": "did:web:alice.example",
  "publisher": "https://fieldnotes.example",
  "tier": "paid",
  "validFrom": "2026-04-01T00:00:00Z",
  "validUntil": "2026-05-01T00:00:00Z",
  "group": {
    "id": "team",
    "kind": "company",
    "orgId": "org_01HZX9...",
    "orgName": "Acme Corp"
  },
  "seatId": "seat_abc123"
}
```

### 9.5 Revocation

A Level 4 reader MUST check credential status via the Bitstring Status List v1.0 mechanism referenced in the credential's `credentialStatus` field. A credential without a `credentialStatus` field MUST be treated as short-lived; readers MUST NOT cache such credentials beyond 24 hours.

### 9.6 Presentation

A reader proves entitlement by constructing a Verifiable Presentation containing the credential and POSTing it to the publisher's `verifiable_credentials.presentation_endpoint`. The endpoint responds with a short-lived bearer token scoped to the feed, which the reader then uses normally.

### 9.7 Signing

Level 4 readers MUST support at least one of:

- Ed25519 via VC Data Integrity EdDSA Cryptosuites, or
- ES256 via VC-JOSE-COSE.

These are the two W3C Recommendations from the May 2025 VC 2.0 family; supporting both is RECOMMENDED.

### 9.8 Example Credential

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.org/rss/modules/membership/vc/v1"
  ],
  "type": ["VerifiableCredential", "OpenMembershipCredential"],
  "issuer": "did:web:auth.example-umbrella.com",
  "validFrom": "2026-04-01T00:00:00Z",
  "validUntil": "2026-05-01T00:00:00Z",
  "credentialSubject": {
    "id": "did:web:alice.example",
    "publisher": "https://fieldnotes.example",
    "tier": "paid",
    "validFrom": "2026-04-01T00:00:00Z",
    "validUntil": "2026-05-01T00:00:00Z"
  },
  "credentialStatus": {
    "id": "https://auth.example-umbrella.com/status/3#94567",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "94567",
    "statusListCredential": "https://auth.example-umbrella.com/status/3"
  },
  "proof": { "...": "..." }
}
```

## 10. Reader Conformance

- **Level 1** — parses `om` tags, shows previews and signup prompts.
- **Level 2** — Level 1 + `url-token` auth + follows `<om:unlock>`.
- **Level 3** — Level 2 + `bearer` auth with RFC 9728 discovery + evaluates `<om:window>` against current time.
- **Level 4** — Level 3 + OM-VC 1.0 presentation + Bitstring Status List revocation checks.

Group scope (`scope="group"`, `scope="either"`) MUST be respected at Level 2 and above. At Level 2, support may be limited to bearer tokens that carry group claims server-side; at Level 4, group claims arrive in the VC.

## 11. Publisher Conformance

- Feed MUST declare the `om` namespace.
- Every item with non-`open` default access MUST have `<om:access>`.
- `<om:provider>` and at least one `<om:authMethod>` MUST appear at channel level.
- A discovery document MUST be published at the canonical `.well-known` URL.
- If `<om:group>` with `admin="self-managed"` is declared, the publisher MUST operate a SCIM 2.0 endpoint and declare it in the discovery document.
- If `vc-presentation` is among declared auth methods, the publisher MUST operate a presentation endpoint and declare the accepted OM-VC profile version and trusted issuer DIDs in the discovery document.

## 12. Governance

Unchanged from 0.1. A neutral custodian is strongly desirable before 1.0.

---

## Appendix A — Non-Normative: WorkOS as an Umbrella Binding

This appendix shows how the `om` primitives bind to a WorkOS-style B2B identity platform so that a single auth provider can serve entitlements across many publishers. This is not the only possible binding; it is a worked example of the most realistic one available today.

### A.1 The Umbrella Shape

In this deployment:

- **Publishers** (Field Notes, Substack-equivalents, podcast networks, etc.) delegate authentication to the umbrella.
- **The umbrella** runs WorkOS AuthKit, Organizations, Directory Sync, and an issuer for OM-VC credentials.
- **Subscribers** sign in once with the umbrella and receive credentials presentable to any participating publisher.

```
                  ┌─────────────────────────────┐
                  │  WorkOS-powered Umbrella    │
                  │                             │
  User ─(login)─▶ │  AuthKit / Organizations    │
                  │  Directory Sync (SCIM)      │◀──── Customer IdP (Okta, Entra, Google)
                  │  OM-VC Issuer (DID, BSL)    │
                  └──────────────┬──────────────┘
                                 │ OM-VC credentials, bearer tokens
                 ┌───────────────┼────────────────┐
                 ▼               ▼                ▼
         ┌────────────┐  ┌─────────────┐  ┌─────────────┐
         │ Field Notes│  │ Podcast Co  │  │ Newsletter X│
         │  publisher │  │  publisher  │  │  publisher  │
         └────────────┘  └─────────────┘  └─────────────┘
```

### A.2 Mapping

| `om` primitive | WorkOS primitive |
|---|---|
| `<om:group kind="company" admin="self-managed">` | WorkOS Organization with Directory Sync enabled |
| `<om:group kind="family" admin="publisher-managed">` | WorkOS Organization without Directory Sync (publisher-managed) |
| `scim_endpoint` in discovery doc | WorkOS Directory endpoint + bearer token |
| OM-VC `credentialSubject.group.orgId` | WorkOS `organization_id` |
| OM-VC `credentialSubject.seatId` | WorkOS `organization_membership_id` |
| Seat reassignment on `directory_user.deleted` | WorkOS Directory Sync webhook triggers credential revocation (BSL bit flip) |
| Domain-policy auto-join | WorkOS verified-domain policy applied on sign-in |

### A.3 Issuance Flow (Company Subscription)

1. A company admin (Acme Corp, Okta-based IdP) signs up for Field Notes Team Plan through the umbrella.
2. Umbrella creates a WorkOS Organization for Acme Corp and enables Directory Sync. Acme's IT admin connects Okta via the Admin Portal.
3. Acme adds `fieldnotes-users` group in Okta. Umbrella's SCIM consumer receives provisioning events and writes a subscription-roster row per user.
4. For each roster user, umbrella issues an OM-VC with `credentialSubject.group.orgId` set to the WorkOS Organization ID and `audience` scoped to Field Notes' provider URI.
5. User opens their RSS reader, authenticates to umbrella, obtains the credential.
6. Reader presents credential to `https://fieldnotes.example/api/vc/verify`, receives a short-lived bearer token, fetches gated items.

### A.4 Revocation Flow

1. Acme's IT admin removes an employee from `fieldnotes-users` in Okta.
2. WorkOS fires a `dsync.group.user_removed` webhook to umbrella.
3. Umbrella flips the relevant bit in its Bitstring Status List credential.
4. Reader's next VC-presentation attempt fails the status check at Field Notes' verify endpoint; access reverts to preview.
5. Typical end-to-end revocation time: under five minutes.

### A.5 Why WorkOS-Shaped Providers Are a Good Fit, Not the Only Fit

The `om` spec does not require WorkOS specifically, nor any umbrella at all. A single indie publisher can run all of this themselves with a Ghost install, a small OAuth server, and a JSON status list. What an umbrella adds is two things that are hard for an indie to provide:

1. **Enterprise IdP integration** — most company customers require SSO and SCIM. Implementing SAML, OIDC, and SCIM directly against Okta, Entra, and Google is a multi-quarter project. WorkOS-class providers commoditize this.
2. **Portable credentials** — an umbrella issuing OM-VC credentials creates a subscriber's cross-publisher identity. This is the move that makes the ecosystem interoperable in the way the Swartz-era RSS ecosystem was.

The risk is the standard one: any umbrella large enough to be useful becomes a potential gatekeeper. The spec mitigates this by (a) making umbrellas optional, (b) defining a credential format any issuer can produce, and (c) requiring publishers to advertise their accepted issuers, so a new issuer can join the ecosystem without publisher-by-publisher negotiation.

---

## Appendix B — Open Questions for 0.3

- **Cross-publisher bundles.** How should a "X+Y+Z bundle" subscription be represented when the publishers are unrelated? A single VC with multiple `audience` values works, but discovery is awkward.
- **Gift subscriptions and sublicensing.** Needed for family plans where the admin isn't the payer.
- **Offline access.** A VC with a future `validUntil` is usable offline; but how does revocation propagate to an offline reader?
- **Privacy.** The SCIM-to-publisher pipeline reveals workplace subscription lists to the publisher. A zero-knowledge variant of group membership proof (BBS+ selective disclosure) is the right long-term direction.
- **Micropayment composition.** How does `om` interact with Podcasting 2.0 `<podcast:value>` when an item is *both* subscription-gated AND value-for-value?

## Acknowledgements

In addition to the 0.1 acknowledgements (RSS-DEV WG, Winer, Berkman Klein, Podcast Index), 0.2 builds on the W3C Verifiable Credentials 2.0 Working Group (Sporny, Longley, Cohen, Prorock, Steele, Zundel, et al.), RFC 9728 (Jones et al.), RFC 7643/7644 (SCIM), and the WorkOS team's public documentation on Organizations and Directory Sync.
