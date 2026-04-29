# Open Membership RSS, Competitive Landscape

The problem is solved technically inside proprietary walled gardens or bespoke paid integrations. `om`'s contribution is interoperability, not invention.

## Existing platforms

### Substack (newsletter + podcast)

Cookie-gated RSS for paid newsletters. Per-subscriber URL-tokenized RSS for paid podcasts. No public API. Full export of posts and subscribers. Newsletters can't be read in standard RSS readers without manual cookie copying, the largest single source of indie-publisher friction `om` addresses.

### Patreon (audio/video)

Per-member URL-tokenized RSS for audio and video. No RSS for text. Explicit anti-sharing detection (multi-device usage analytics, automatic link reset). Patreon's public rejection of HTTP Basic Auth ("many podcast apps don't support it") validates `url-token` as the default auth method.

### Apple Podcasts Subscriptions, Spotify Podcast Subscriptions

Closed ecosystems. Apple uses its own payment infrastructure, Spotify uses Stripe (announced 2022). Subscriptions accessible only inside their own apps. Out of scope for `om` adoption; the spec's job is to make sure indie publishers don't need them.

### FeedPress + Outpost (Ghost)

Private feeds with URL-key auth and device fingerprinting. Outpost syncs Ghost members with FeedPress feeds. Provides exactly what `om` 0.4 describes: per-subscriber tokenized paid RSS, automatic unsubscribe detection, device-based anti-sharing. Used by 404 Media (since March 2024) and Aftermath (since November 2025). Roughly €20-€50/month per publisher. Proof that the market exists and the technical approach works; not a competitor.

### Passport (passport.online, Ben Thompson + Automattic)

Launched 2024 by Ben Thompson with Automattic. Closed SaaS, currently waitlist. Built on the same insight as `om`: organize subscriptions around entitlements, not content tiers. Differences:

- Passport is closed SaaS; `om` is an open spec. Entitlements live in Passport's database; `om` entitlements are W3C VCs the subscriber holds.
- Passport requires WordPress; `om` works on any RSS-emitting CMS.
- No cross-publisher bundle; `om` 0.4 §3 defines an aggregator pattern.
- No pseudonymous mode; `om` Level 7 (OM-VC-SD with BBS+) provides one.
- No subscriber portability; `om` defines a credential export format (`spec/SPEC-PORTABILITY.md`).
- Closed reader surface; an `om` feed is readable by any reader implementing the namespace.

### Memberful, Supercast, Supporting Cast, Castos, Glow.fm

Variants of "sell paid RSS through our service, Stripe backend, private feed URLs." Group most likely to benefit from adopting `om`: their moat is publisher-facing UX, not the tokenized-feed mechanism.

### Podcasting 2.0 (`podcast:` namespace)

Direct open-spec precedent. Value-for-value via Lightning. Complementary, not competitive: `om` 0.4 §8 defines coexistence rules so a feed can carry both namespaces without information loss.

### ActivityPub (Ghost Fediverse, WordPress ActivityPub, Threads)

Federated discovery, no monetization at the protocol level. Individual publishers bolt on Patreon, PayPal, or Stripe externally. `om` complements ActivityPub the way it complements Podcasting 2.0.

### Video platforms (PeerTube, Nebula, Floatplane, Corridor Digital)

PeerTube has no native paid-subscription model. Nebula, Floatplane, Corridor Digital each built proprietary stacks rather than federate. `om` is text-and-audio first; a paid-video extension is plausible 2.x work, not 1.0.

## What doesn't exist (and what `om` 1.0 provides)

| Capability | Current state | With `om` 1.0 |
|---|---|---|
| Tokenized paid text RSS | Substack (cookie-gated); FeedPress (paid SaaS) | Self-hostable; works in any reader |
| Cross-publisher bundle | Apple Podcasts Subscriptions only | Any party can operate as aggregator |
| Group subscriptions | Apple Family Sharing only | Any publisher; SCIM for corporate |
| Pseudonymous paid access | Nowhere | OM-VC-SD with per-publisher pseudonyms |
| Portable subscriber identity | Partial export paths | W3C VC 2.0 credentials |
| Time-gated content | Platform-specific | `<om:window>` element |
| Open API for third-party readers | None for paid content | Standard checkout endpoint, discovery document |
| PSP choice per publisher | Platform dictates | Publisher declares; multiple simultaneous |

## Two axes of openness

`opensubscriptionplatforms.com` (a Ghost-led campaign reflecting John O'Nolan's framing) splits the market on **publisher-side data ownership**: can the publisher own their Stripe customer list, content, email addresses?

`om` measures a different axis: **subscriber-side interoperability**. Can any reader read any publisher's paid content? Can a subscriber port memberships between readers? Can a credential survive a publisher switch?

The framings are aligned, not competitive. Ghost, Podia, Memberful, WooCommerce, Memberstack, Memberspace all score open on the publisher axis and still fail the subscriber axis. The pitch: "you solved publisher portability with Stripe Connect plus exports; now solve subscriber portability with `om`."

## The strategic narrative

- **Publishers**: what FeedPress + Outpost charges €20-€50/month for, `om` provides as a self-hostable open standard.
- **Readers**: support a growing list of publishers with one codebase, no per-publication API integrations.
- **PSPs (Stripe, Mollie)**: an open spec that bakes you in as the default makes you the reference for an entire ecosystem.
- **Journalism funders (Knight Foundation, Sovereign Tech Fund, Open Technology Fund)**: investigative journalism cannot depend on Substack's Trust & Safety team or Apple's content policies.

## Success metrics

- **1,000 publishers using `om`**: rounding error by platform standards; success by IndieWeb standards; likely 2028-2029 if the 1.0 plan executes.
- **10,000 publishers**: comparable to Podcasting 2.0 penetration today.
- **A Substack or Patreon competitor builds on `om`**: nice to have, not a prerequisite.
- **Substack or Patreon adopt `om` directly**: unlikely in five years and not a goal.

The right ambition is 1,000 publishers. Success is "an indie publisher can run their entire paid-content business on this without depending on any platform that could change the rules."
