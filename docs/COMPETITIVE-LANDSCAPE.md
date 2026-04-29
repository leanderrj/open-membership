# Open Membership RSS, Competitive Landscape

The single most important thing to know about this market: **the problem is already solved technically, but only inside proprietary walled gardens or bespoke paid integrations.** `om`'s contribution is interoperability, not invention.

## What already exists

### 1. Substack (newsletter + podcast)

Cookie-gated RSS for paid newsletter content. Per-subscriber URL-tokenized RSS for paid podcasts. No public API. Full export supported (posts + subscriber list). Pitches "you own your content" as a competitive feature, which is true operationally, but the paid-subscription infrastructure doesn't travel with the content when you leave.

**Who uses it:** newsletters at every scale, from single-writer indies to high-profile publications (Matt Taibbi, Heather Cox Richardson, Bari Weiss at The Free Press).

**Strategic position:** the largest single population of paid-RSS-adjacent publishers. Also the largest group of frustrated publishers, cookie-gated RSS means their paid subscribers cannot use standard RSS readers without manual cookie copying.

### 2. Patreon (audio/video)

Per-member URL-tokenized RSS for audio and video content. No RSS for text posts. Explicit anti-sharing detection (multi-device usage analytics, link reset, comment/DM suspension). OAuth API for creators but not for subscriber-side aggregation.

**Who uses it:** podcast networks, video creators, some writers (who typically treat Patreon as a paywall for their separate blog/newsletter rather than a content platform).

**Strategic position:** validated the per-member URL-token model at scale with millions of users. Their explicit rejection of HTTP Basic Auth ("many podcast apps don't support it") is the single best piece of public evidence that URL tokens are the correct default auth method.

### 3. Apple Podcasts Subscriptions

Closed ecosystem. Uses Apple's payment infrastructure. Subscriptions deliverable only inside Apple's podcast apps. Creators keep 70% first year, 85% after. No private RSS.

**Strategic position:** out of scope for `om` adoption. Apple will not adopt an open standard that bypasses their App Store payment rails. The spec's job is to make sure indie publishers don't have to depend on them.

### 4. Spotify Podcast Subscriptions

Closed ecosystem with Stripe backend (publicly announced 2022). Spotify Open Access lets Substack podcast subscribers authenticate to Spotify, which is exactly the cross-identity pattern `om` 0.4 §3 generalizes, except that Open Access requires bilateral integration deals rather than a standard.

**Strategic position:** out of scope for adoption. Open Access is interesting as precedent for what `om` cross-publisher bundles could enable at a protocol level.

### 5. FeedPress + Outpost (Ghost)

**This is the most important existing implementation for `om`'s strategy.**

FeedPress sells private feeds with URL-key auth and device fingerprinting. Outpost syncs Ghost's members API with FeedPress's feed generation. Together they provide exactly what `om` 0.4 describes: per-subscriber tokenized paid RSS, automatic unsubscribe detection, device-based anti-sharing.

**Who uses it:** 404 Media (since March 2024), Aftermath (since November 2025), and a growing number of Ghost-based publications.

**Pricing:** FeedPress is paid, Outpost is paid, together they add roughly €20-€50/month per publisher depending on subscriber count.

**Strategic position for `om`:**
- These are not competitors. They're proof that the market exists and the technical approach works.
- An open-spec alternative lets a publisher avoid the monthly fee by self-hosting
- An open-spec alternative lets a reader interoperate with any `om`-compliant feed without per-service integration
- The FeedPress/Outpost team may eventually adopt `om` themselves if it reaches adoption, the pitch to them would be "your product works the same; it just becomes one of several compliant implementations rather than a proprietary one"

### 6. Passport (passport.online, Ben Thompson + Automattic)

Launched 2024 by Ben Thompson (Stratechery) in collaboration with Automattic. Currently waitlist; commercial SaaS. The most architecturally adjacent product to `om`: built on the same insight that **subscription platforms should organise around entitlements, not content tiers**.

Their own framing: *"A user has a set of entitlements, think of the analogy of a Passport with a set of visas, which dictates what content they can or cannot access."* That is the same shift `om` 0.4 §3 (Cross-Publisher Bundles) and §4 (Verifiable Credentials) describe, *users → entitlements → content* instead of the legacy *content → tiers → users*. A publisher of Thompson's stature, working with Automattic (WordPress.com), reaching the same architectural conclusion is the strongest external validation of the model the spec rests on.

What's the same in both: per-publisher Stripe ownership (creator keeps payments and customer relationship), OAuth/OpenID for sign-in, multi-channel delivery (web + email + RSS/podcast) on a single entitlement, customisable per-subscriber paywall.

What's different:

- **Passport is closed SaaS, `om` is an open spec.** Entitlements live in Passport's database, queryable only via Passport's API. `om` entitlements are W3C Verifiable Credentials the subscriber holds, verifiable offline, portable across reader apps.
- **Passport requires WordPress** (or Passport's hosted setup). `om` works on any RSS-emitting CMS via the namespace + `.well-known/open-membership`.
- **No cross-publisher bundle.** Passport's entitlements are per-publisher; a subscriber paying ten Passport publishers gets ten separate entitlement sets. `om` 0.4 §3 defines an aggregator pattern any third party can operate.
- **No pseudonymous mode.** Passport uses a stable subscriber identity. `om` Level 7 (OM-VC-SD with BBS+ selective disclosure) lets the subscriber prove entitlement without revealing a correlatable identifier.
- **No subscriber portability.** A Passport member moving to a non-Passport publisher loses their entitlement. `om` defines a credential export format (`spec/SPEC-PORTABILITY.md`) for exactly that case.
- **Closed reader surface.** A reader app cannot consume Passport content without a per-publisher integration. An `om` feed is readable by any reader implementing the namespace, today.

**Strategic position for `om`:**

- **Validates the architectural bet.** Two of the most credible voices in indie publishing reaching the same conclusion as the spec, within months of `om` 0.4, is significant. The entitlement model is right; the question is whether it lives in one company's database or in an open standard.
- **Implements roughly half of what `om` does, behind a paywall.** Passport handles multi-channel single-entitlement delivery and per-subscriber customisation. It does not solve the cross-publisher bundle problem, the pseudonymous problem, the portability problem, or the reader-interop problem. `om` solves all four.
- **A plausible eventual adopter.** Passport's entitlement schema maps almost directly to `<om:tier>` + `<om:offer>` + the OM-VC profile. A Passport publisher emitting an `om`-conformant feed alongside Passport's native channels extends reach into any RSS reader without losing Passport's UX. The pitch parallels the FeedPress/Outpost one: "your product works the same; it just becomes one of several `om`-compliant implementations rather than the only path."
- **The Automattic angle is double-edged.** Passport runs on WordPress; `om-wordpress` targets the same CMS; the Automattic ActivityPub plugin is one of `spec/SPEC-ACTIVITYPUB.md`'s integration points. A WordPress publisher in 2026 may face a choice: Passport (closed, polished, takes commission), an `om`-conformant self-hosted stack (open, requires self-hosting), or both alongside each other (Passport for the polished UX, `om` for cross-reader interop). The honest read is that Passport raises the bar for `om-wordpress` to clear on day-one publisher experience.

### 7. Memberful, Supercast, Supporting Cast, Castos, Glow.fm

All offer variants of "sell paid RSS through our service, typically with Stripe backend, private feed URLs to subscribers." Differ in pricing (flat monthly fee vs. per-subscriber fee), scope (Supercast and Castos are podcast-focused, Memberful is more general), and integration points.

**Strategic position:** the group of SaaS companies that would most directly benefit from adopting `om`. Their business moat isn't the tokenized-feed mechanism (which is commoditizable); it's the publisher-facing UX and the Stripe integration. Making their feeds `om`-compliant costs them little and gives them the "works with any RSS reader" marketing advantage.

### 8. Podcasting 2.0 (`podcast:` namespace)

The most direct open-spec precedent. Value-for-value via Lightning, published namespace, community-maintained by the Podcast Index.

**Strategic position:** complementary, not competitive. `om` 0.4 §8 defines explicit co-existence rules. A feed can carry both namespaces and neither loses information. The ideal case is that Podcast Index apps adopt `om` for fiat-subscription handling while keeping their Lightning-native primitives.

### 9. ActivityPub-based platforms (Ghost Fediverse, WordPress ActivityPub, Threads)

Rapidly adopting ActivityPub for federation. Monetization is unsolved at the protocol level. Individual publishers bolt on Patreon, PayPal, or Stripe externally.

**Strategic position:** `om` complements ActivityPub the way it complements Podcasting 2.0. An `om`-aware publisher running Ghost with both the `om` plugin and Ghost's ActivityPub plugin has federated discovery AND interoperable paid content, something no current platform provides.

### 10. Video-content platforms (PeerTube, Nebula, Floatplane, Corridor Digital)

Not directly competitive with `om`, `om` is a syndication-feed spec, these are video-hosting platforms, but the distribution of choices among paid-video creators is an important data point, because it's the exact scenario a video-aware `om` would eventually target.

**PeerTube.** A decentralized, ActivityPub-federated video platform developed by the French non-profit Framasoft. Open-source. Self-hostable. Uses WebTorrent-style P2P to share bandwidth between viewers. Federates with Mastodon and the broader Fediverse. **Has no native paid-subscription model.** Publishers who want to monetize bolt on external services (Liberapay, Stripe links in descriptions), which means paid content on PeerTube suffers the same "federated identity meets opaque commerce" problem ActivityPub has for text.

**Nebula.** Proprietary subscription platform founded by YouTube educational creators (CGP Grey, Real Engineering, Lindsay Ellis and others). Built on a custom in-house stack specifically to escape the technical constraints of third-party platforms like Vimeo. Closed ecosystem; not federated; not open-source.

**Floatplane.** Proprietary platform built by Linus Media Group (Linus Tech Tips). Designed for high-bitrate, early-access video for paid subscribers. Modern web stack (React frontend, PHP backend, Amazon IVS + Cloudflare CDN). Closed.

**Corridor Digital (`corridordigital.com`).** Proprietary subscription platform built by the Corridor VFX team to host 4K extended cuts and their podcast. Custom site, internal hosting. The team has been vocal about the three problems they built it to solve: compression (they wanted higher bitrates than YouTube allows), safety harbor (from demonetization and age restriction), and focused community (no algorithmic distraction).

**The pattern is consistent.** The three creator-owned paid-video platforms of meaningful scale each built their own stack from scratch rather than federate on PeerTube. Their reasoning, in their own words, comes down to the same three gaps:

1. **No open subscription primitive.** PeerTube's ActivityPub federation handles discovery and comments, not paywalls. Each platform built Stripe-based billing in-house.
2. **No open quality control.** High-bitrate video + DRM-like access control needs a content layer the open spec doesn't define.
3. **No reader/client that expects this content.** Even if an open video-subscription spec existed, there's no Apple Podcasts of paid video federation, so a creator going fully-open sacrifices the audience they'd reach on a curated walled garden like Nebula.

**Strategic position for `om`.** `om` is text-and-audio-first today. Extending to video would be a 2.x concern, not 1.0. But the lesson is instructive: the same gap that pushes Nebula, Floatplane, and Corridor to build custom stacks is the gap `om` closes for text. A paid-video extension to `om` (reusing the entitlement, discovery, and token models) is a plausible 2.x direction *if* at least one open video reader emerges willing to expect the spec. Until such a reader exists, ActivityPub-federated video (PeerTube) and closed paid-video platforms will continue to coexist without a bridge.

The more immediate takeaway: when we approach Ghost-hosted journalism publishers with `om`, the fact that every serious creator-owned paid platform is proprietary is an asset, not a threat. It validates that the monetization problem is real and unsolved by open federation, and it validates that creators are willing to pay for a solution.

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

## Two axes of openness

`opensubscriptionplatforms.com`, a Ghost-led campaign reflecting John O'Nolan's framing, splits the subscription-platform market into "Open" and "Closed" on a specific axis: **publisher-side data ownership.** Can the publisher own their Stripe customer list, their content, their email addresses, their payment history? The cut is roughly Stripe Connect/Direct + full exports vs. proprietary payments + partial or missing exports.

`om` measures a different axis: **subscriber-side interoperability.** Can any reader read any publisher's paid content without bespoke integration? Can a subscriber port their memberships between readers? Can a credential survive a publisher switch? These are orthogonal.

All six "Open" platforms on O'Nolan's list, Ghost, Podia, Memberful, WooCommerce, Memberstack, Memberspace, score open on the publisher axis and **all still fail the subscriber axis today**. A Ghost member cannot read their paid newsletter in an arbitrary RSS reader without cookie-juggling. A Memberful-protected post is gated by a proprietary session. By opensubscriptionplatforms.com's lens they are open; by `om`'s lens they are all still silos. `om` is the missing second column.

The framings are aligned rather than competitive: both reject lock-in, just at different layers. The natural pitch to that community is "you solved publisher portability with Stripe Connect + data exports; now solve subscriber portability with `om`."

### The "Open" column is `om`'s adapter pipeline

| Platform | Where it fits `om`'s plan |
|---|---|
| Ghost | Already done, `reference/om-ghost` is the first reference |
| WooCommerce | Natural next WP anchor after `om-wordpress`. Stripe-based; Subscriptions add-on maps cleanly to `<om:tier>` |
| Memberful | Pure WP membership, directly overlaps `om-wordpress`; the Memberful → om-wordpress migration story writes itself |
| Podia | SaaS, creator-focused, multi-format (courses + memberships). Good fit for a "Memberstack-shape" drop-in embed |
| Memberstack / Memberspace | Drop-in embeds, ideal for the static-site reference (ROADMAP Phase 4 M11) |

These six are the cleanest stress test for the **Platform Adapter Profile** (ROADMAP Phase 4 M10). If the profile extracted from Ghost + WordPress does not accommodate WooCommerce and Memberful without rework, the profile is wrong.

### The "Closed" column is the three personas

Substack (persona 1), Patreon (persona 2), plus Beehiiv, Convertkit, Gumroad, Supercast, Medium, Wild Apricot. Every one is an existing `om` target via the "switch to an open host" migration path. Beehiiv is worth flagging: it is measurably *worse* than Substack on data ownership, Substack at least exports email addresses; Beehiiv exports no content, no customers, no payments. Migration pressure on Beehiiv publishers is sharper than on Substack publishers.

## The strategic narrative

The pitch to publishers: **"What FeedPress + Outpost costs you €20-€50/month, `om` gives you as a self-hostable open standard. And you get features neither offers: cross-reader compatibility, group subscriptions, privacy mode, and no monthly fee to a single vendor."**

The pitch to readers: **"Support a growing list of publishers with one codebase. No per-publication API integrations. Subscribe, authenticate, and access paid content from dozens of sites with the same plumbing."**

The pitch to PSPs (Stripe, Mollie): **"We already use your APIs as the payment rails. An open spec that bakes you in as the default makes you the reference implementation for an entire ecosystem. Sponsor the maintenance and you own the commerce layer of federated paid content."**

The pitch to journalism funders (Knight Foundation, Sovereign Tech Fund, Open Technology Fund): **"Investigative journalism cannot depend on Substack's Trust & Safety team or Apple's content policies. An open standard for paid content is a democratic necessity in the era of platform capture."**

Four different pitches, four different audiences, same underlying protocol.

## What success looks like at different scales

- **1,000 publishers using `om`:** rounding error by platform standards; major success by IndieWeb standards; likely around 2028-2029 if the 1.0 plan executes.
- **10,000 publishers:** comparable to Podcasting 2.0 penetration today. Would indicate the spec has reached its natural equilibrium as the indie-publisher default.
- **A Substack or Patreon competitor builds on `om`:** possible but not necessary. Would be a nice-to-have, not a prerequisite for protocol success.
- **Substack or Patreon themselves adopt `om` for export/interop:** unlikely in the next five years and should not be a goal. If it happens, it should be on the spec's terms, not theirs.

The right ambition is the "1,000 publishers" bar. Success is not "every newsletter in the world uses this." Success is "an indie publisher can run their entire paid-content business on this without depending on any platform that could change the rules."
