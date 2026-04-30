# Related Work

Open Membership RSS sits next to a number of existing systems that address overlapping problems with different mechanisms. This document surveys them and identifies the gap that motivates this specification.

## 1. Existing subscription platforms

### 1.1 Substack

Substack serves paid newsletter content as RSS gated by a session cookie (`substack.sid`); a logged-in subscriber's reader receives the full body of paid posts, others receive previews. Paid podcast feeds use a per-subscriber tokenized URL instead. There is no public API; full export of posts and the subscriber list is supported. Newsletters cannot be read in standard RSS readers without manual cookie copying.

### 1.2 Patreon

Patreon serves audio and video to paid members through per-subscriber tokenized URLs and detects shared use by monitoring per-link device counts. Text posts are not exposed via RSS. Patreon's documentation explicitly rejects HTTP Basic Auth as a second factor on the grounds that "many podcast apps do not support this feature," which directly supports the choice of `url-token` as the default authentication method in this specification.

### 1.3 Apple Podcasts Subscriptions and Spotify Podcast Subscriptions

Both are closed ecosystems. Apple uses its own payment infrastructure; Spotify uses Stripe (publicly disclosed in 2022). Subscriptions are accessible only inside the originating client. Neither exposes private RSS or supports subscriber portability.

### 1.4 FeedPress and Outpost (Ghost)

FeedPress provides private feeds with URL-key authentication and device fingerprinting; the Outpost plugin synchronizes Ghost's members API with FeedPress's feed generation. Together they implement a substantial subset of the mechanism this specification describes: per-subscriber tokenized paid RSS, automatic unsubscribe propagation, device-based anti-sharing. Existing deployments include 404 Media (since March 2024) and Aftermath (since November 2025). The combination demonstrates that the technical approach is operable at production scale.

### 1.5 Passport (Ben Thompson, Automattic)

Passport (`passport.online`), launched in 2024, is a closed-source SaaS built on the same architectural premise as this specification: organize subscriptions around entitlements rather than content tiers. It differs in distribution and surface:

- Entitlements live in Passport's database; this specification places entitlements in W3C Verifiable Credentials held by the subscriber.
- Passport requires WordPress; this specification works over any RSS-emitting CMS.
- Passport has no cross-publisher aggregation; this specification defines an aggregator pattern in §3.
- Passport uses a stable subscriber identity; this specification's Level 7 (pseudonymous mode, OM-VC-SD with BBS+) supports per-publisher pseudonyms.
- Passport defines no subscriber portability format; this specification provides one in [SPEC-PORTABILITY.md](../spec/SPEC-PORTABILITY.md).
- A Passport feed is not readable by an arbitrary RSS reader without per-publisher integration.

### 1.6 Memberful, Supercast, Supporting Cast, Castos, Glow.fm

These services share a common pattern: hosted Stripe-backed paid feeds delivered as private feed URLs, varying in pricing model and platform scope. None defines an open interface a third-party reader can target without per-service integration.

## 2. Adjacent open protocols

### 2.1 Podcasting 2.0 (`podcast:` namespace)

The closest open-spec precedent. The Podcast Index team added a namespace to RSS, hosted it independently, and published an explicit "Rules for Standards-Makers" governance document. Adoption of `podcast:transcript` and `podcast:chapters` is broad; `podcast:value` (Lightning) is narrower. This specification defines explicit coexistence rules in §8 so that a feed can carry both namespaces without information loss.

### 2.2 ActivityPub

ActivityPub is the dominant federated social protocol but is silent on monetization. Individual publishers attach external billing services (Patreon, PayPal, Stripe) at the application layer. The companion document [SPEC-ACTIVITYPUB.md](../spec/SPEC-ACTIVITYPUB.md) defines coexistence rules between an Open Membership publisher and an ActivityPub actor on the same domain.

### 2.3 Unlock Protocol

Unlock Protocol [[unlock-protocol/unlock]](https://github.com/unlock-protocol/unlock) is an MIT-licensed open membership protocol implemented as Solidity smart contracts. Membership is represented by an on-chain "key" (an NFT) that any application can verify against the public ledger. It addresses the same portability and platform-independence concerns as this specification but at a different layer of the stack: Unlock is blockchain-resident and requires a Web3 client; this specification is RSS-resident and requires only an HTTP client.

### 2.4 IndieWeb (Webmention, Micropub, IndieAuth)

A suite of W3C Recommendations and de-facto specifications for personal-publishing interoperability. Notable for showing that small-scale open-web protocols can sustain multi-implementation deployments over a decade. None of the IndieWeb specs address paid content; this specification fills that gap while staying compatible with the broader IndieWeb ethos.

### 2.5 Verifiable Credentials and Decentralized Identifiers (W3C)

This specification's credential profile (OM-VC, OM-VC-SD) is a constrained profile of [VC Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/). Selective disclosure uses the [BBS Cryptosuite](https://www.w3.org/TR/vc-di-bbs/). Subscriber-side identifiers use [DID Core](https://www.w3.org/TR/did-core/). The selection is informed by the practical observation that VC + DID are the only specifications that ship with both a normative data model and multiple production implementations.

## 3. The Open Subscription Platforms framing

The Ghost-led campaign at `opensubscriptionplatforms.com` partitions the subscription-platform field on **publisher-side data ownership**: whether a publisher can export their Stripe customer list, content, and subscriber addresses. This specification measures a complementary property, **subscriber-side interoperability**: whether any reader can consume any publisher's paid content, whether a subscriber can move memberships between readers, and whether a credential survives a publisher switch.

Of the platforms classified as "Open" by `opensubscriptionplatforms.com` (Ghost, Podia, Memberful, WooCommerce, Memberstack, Memberspace), all satisfy the publisher-side criterion and none satisfies the subscriber-side criterion. The two framings are orthogonal.

## 4. Capabilities not addressed by prior work

The following capabilities are absent from the systems surveyed above and are defined by this specification:

| Capability | Status in prior work | Defined here in |
|---|---|---|
| Tokenized paid text RSS as an open standard | Substack (cookie-gated); FeedPress (paid SaaS) | SPEC.md §0.1, §0.2 |
| Cross-publisher aggregation | Apple Podcasts Subscriptions (closed) | SPEC.md §3 |
| Group subscriptions (family, team) | Apple Family Sharing only | SPEC.md §0.2 |
| Pseudonymous paid access | None | SPEC.md §4 |
| Portable subscriber identity | Partial export paths | [SPEC-PORTABILITY.md](../spec/SPEC-PORTABILITY.md) |
| Time-gated content | Platform-specific features | SPEC.md §0.2 |
| Open API for third-party readers | None for paid content | SPEC.md §9 |
| Multi-PSP per publisher | Platform-dictated | SPEC.md §0.3 |

## References

- Ghost Foundation. "Open Subscription Platforms." `https://opensubscriptionplatforms.com/`.
- Podcast Index. "Podcasting 2.0 Namespace." `https://podcastindex.org/namespace/1.0`.
- Unlock Labs. "Unlock Protocol." `https://github.com/unlock-protocol/unlock`. MIT.
- W3C. "Verifiable Credentials Data Model v2.0." `https://www.w3.org/TR/vc-data-model-2.0/`.
- W3C. "Decentralized Identifiers (DIDs) v1.0." `https://www.w3.org/TR/did-core/`.
- W3C. "Data Integrity BBS Cryptosuites v1.0." `https://www.w3.org/TR/vc-di-bbs/`.
- W3C. "Webmention." `https://www.w3.org/TR/webmention/`.
- W3C. "Micropub." `https://www.w3.org/TR/micropub/`.
- IETF. "Well-Known Uniform Resource Identifiers." RFC 8615. `https://www.rfc-editor.org/rfc/rfc8615`.
- IETF. "OAuth 2.0 Protected Resource Metadata." RFC 9728. `https://www.rfc-editor.org/rfc/rfc9728`.
