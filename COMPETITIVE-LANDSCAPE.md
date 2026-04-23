# Open Membership RSS — Competitive Landscape

The single most important thing to know about this market: **the problem is already solved technically, but only inside proprietary walled gardens or bespoke paid integrations.** `om`'s contribution is interoperability, not invention.

## What already exists

### 1. Substack (newsletter + podcast)

Cookie-gated RSS for paid newsletter content. Per-subscriber URL-tokenized RSS for paid podcasts. No public API. Full export supported (posts + subscriber list). Pitches "you own your content" as a competitive feature — which is true operationally, but the paid-subscription infrastructure doesn't travel with the content when you leave.

**Who uses it:** newsletters at every scale, from single-writer indies to high-profile publications (Matt Taibbi, Heather Cox Richardson, Bari Weiss at The Free Press).

**Strategic position:** the largest single population of paid-RSS-adjacent publishers. Also the largest group of frustrated publishers — cookie-gated RSS means their paid subscribers cannot use standard RSS readers without manual cookie copying.

### 2. Patreon (audio/video)

Per-member URL-tokenized RSS for audio and video content. No RSS for text posts. Explicit anti-sharing detection (multi-device usage analytics, link reset, comment/DM suspension). OAuth API for creators but not for subscriber-side aggregation.

**Who uses it:** podcast networks, video creators, some writers (who typically treat Patreon as a paywall for their separate blog/newsletter rather than a content platform).

**Strategic position:** validated the per-member URL-token model at scale with millions of users. Their explicit rejection of HTTP Basic Auth ("many podcast apps don't support it") is the single best piece of public evidence that URL tokens are the correct default auth method.

### 3. Apple Podcasts Subscriptions

Closed ecosystem. Uses Apple's payment infrastructure. Subscriptions deliverable only inside Apple's podcast apps. Creators keep 70% first year, 85% after. No private RSS.

**Strategic position:** out of scope for `om` adoption. Apple will not adopt an open standard that bypasses their App Store payment rails. The spec's job is to make sure indie publishers don't have to depend on them.

### 4. Spotify Podcast Subscriptions

Closed ecosystem with Stripe backend (publicly announced 2022). Spotify Open Access lets Substack podcast subscribers authenticate to Spotify — which is exactly the cross-identity pattern `om` 0.4 §3 generalizes, except that Open Access requires bilateral integration deals rather than a standard.

**Strategic position:** out of scope for adoption. Open Access is interesting as precedent for what `om` cross-publisher bundles could enable at a protocol level.

### 5. FeedPress + Outpost (Ghost)

**This is the most important existing implementation for `om`'s strategy.**

FeedPress sells private feeds with URL-key auth and device fingerprinting. Outpost syncs Ghost's members API with FeedPress's feed generation. Together they provide exactly what `om` 0.4 describes: per-subscriber tokenized paid RSS, automatic unsubscribe detection, device-based anti-sharing.

**Who uses it:** 404 Media (since March 2024), Aftermath (since November 2025), and a growing number of Ghost-based publications.

**Pricing:** FeedPress is paid, Outpost is paid, together they add roughly €20–€50/month per publisher depending on subscriber count.

**Strategic position for `om`:**
- These are not competitors. They're proof that the market exists and the technical approach works.
- An open-spec alternative lets a publisher avoid the monthly fee by self-hosting
- An open-spec alternative lets a reader interoperate with any `om`-compliant feed without per-service integration
- The FeedPress/Outpost team may eventually adopt `om` themselves if it reaches adoption — the pitch to them would be "your product works the same; it just becomes one of several compliant implementations rather than a proprietary one"

### 6. Memberful, Supercast, Supporting Cast, Castos, Glow.fm

All offer variants of "sell paid RSS through our service, typically with Stripe backend, private feed URLs to subscribers." Differ in pricing (flat monthly fee vs. per-subscriber fee), scope (Supercast and Castos are podcast-focused, Memberful is more general), and integration points.

**Strategic position:** the group of SaaS companies that would most directly benefit from adopting `om`. Their business moat isn't the tokenized-feed mechanism (which is commoditizable); it's the publisher-facing UX and the Stripe integration. Making their feeds `om`-compliant costs them little and gives them the "works with any RSS reader" marketing advantage.

### 7. Podcasting 2.0 (`podcast:` namespace)

The most direct open-spec precedent. Value-for-value via Lightning, published namespace, community-maintained by the Podcast Index.

**Strategic position:** complementary, not competitive. `om` 0.4 §8 defines explicit co-existence rules. A feed can carry both namespaces and neither loses information. The ideal case is that Podcast Index apps adopt `om` for fiat-subscription handling while keeping their Lightning-native primitives.

### 8. ActivityPub-based platforms (Ghost Fediverse, WordPress ActivityPub, Threads)

Rapidly adopting ActivityPub for federation. Monetization is unsolved at the protocol level. Individual publishers bolt on Patreon, PayPal, or Stripe externally.

**Strategic position:** `om` complements ActivityPub the way it complements Podcasting 2.0. An `om`-aware publisher running Ghost with both the `om` plugin and Ghost's ActivityPub plugin has federated discovery AND interoperable paid content, something no current platform provides.

## What doesn't exist

This is the gap matrix from OPEN-MEMBERSHIP-RSS-0.4.md §H.4, restated as what `om` 1.0 provides:

| Capability | Current state | With `om` 1.0 |
|---|---|---|
| Tokenized paid text RSS | Substack has it behind cookies; FeedPress has it as a paid service | Any publisher can self-host; works in any RSS reader |
| Cross-publisher bundle | Apple Podcasts Subscriptions only (closed) | Any party can operate as aggregator (open) |
| Group subscriptions (family, team) | Apple Family Sharing only | Any publisher, with SCIM-synced corporate plans |
| Pseudonymous paid access | Nowhere | OM-VC-SD with per-publisher pseudonyms |
| Portable subscriber identity | Partial export paths (Substack) | W3C VC 2.0 credentials across publishers |
| Time-gated content (early access, ephemeral free) | Platform-specific features | Protocol-level `<om:window>` element |
| Open API for third-party readers | None for paid content | Standard checkout endpoint, discovery document |
| PSP choice per publisher | Platform dictates (Stripe via Substack/Ghost, Apple via AppleSubs) | Publisher declares, multiple simultaneous |

Every row in the right-hand column is a specific publisher pain point documented in public forums, Ghost forum threads, Substack complaints, and Hacker News discussions.

## The strategic narrative

The pitch to publishers: **"What FeedPress + Outpost costs you €20–€50/month, `om` gives you as a self-hostable open standard. And you get features neither offers: cross-reader compatibility, group subscriptions, privacy mode, and no monthly fee to a single vendor."**

The pitch to readers: **"Support a growing list of publishers with one codebase. No per-publication API integrations. Subscribe, authenticate, and access paid content from dozens of sites with the same plumbing."**

The pitch to PSPs (Stripe, Mollie): **"We already use your APIs as the payment rails. An open spec that bakes you in as the default makes you the reference implementation for an entire ecosystem. Sponsor the maintenance and you own the commerce layer of federated paid content."**

The pitch to journalism funders (Knight Foundation, Sovereign Tech Fund, Open Technology Fund): **"Investigative journalism cannot depend on Substack's Trust & Safety team or Apple's content policies. An open standard for paid content is a democratic necessity in the era of platform capture."**

Four different pitches, four different audiences, same underlying protocol.

## What success looks like at different scales

- **1,000 publishers using `om`:** rounding error by platform standards; major success by IndieWeb standards; likely around 2028–2029 if the 1.0 plan executes.
- **10,000 publishers:** comparable to Podcasting 2.0 penetration today. Would indicate the spec has reached its natural equilibrium as the indie-publisher default.
- **A Substack or Patreon competitor builds on `om`:** possible but not necessary. Would be a nice-to-have, not a prerequisite for protocol success.
- **Substack or Patreon themselves adopt `om` for export/interop:** unlikely in the next five years and should not be a goal. If it happens, it should be on the spec's terms, not theirs.

The right ambition is the "1,000 publishers" bar. Success is not "every newsletter in the world uses this." Success is "an indie publisher can run their entire paid-content business on this without depending on any platform that could change the rules."
