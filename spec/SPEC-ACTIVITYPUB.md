# Open Membership RSS — ActivityPub Co-existence 1.0

**A non-normative companion specifying how `om`-gated content behaves when the same publisher also federates via ActivityPub.**

- **Companion to:** Open Membership RSS 0.4 / 1.0 (`http://purl.org/rss/modules/membership/`)
- **Profile URI:** `http://purl.org/rss/modules/membership/activitypub-coexistence/1.0`
- **Status:** Non-normative companion, draft, 2026-04-24
- **Scope:** Describes how an `om`-gated post behaves when its publisher also emits ActivityPub. Does not modify the core `om` vocabulary. Does not define new ActivityPub object types.
- **Audience:** implementers of `om` on platforms that ship native ActivityPub — Ghost, WordPress (with the Automattic AP plugin), and any CMS following the same pattern.

## Copyright

Copyright © 2026 by the Authors. Permission to use, copy, modify and distribute this specification is granted under the same terms as the parent Open Membership RSS specification.

---

## 1. Why this exists

SPEC §G.2 names ActivityPub as the cautionary tale on monetization: a wildly successful federated protocol that has effectively punted on paid content, producing a Cambrian explosion of per-server hacks (Patreon-bridged Mastodon accounts, Stripe links in profile fields, server-level ACLs wrapped around PayPal subscriptions). Ghost ships native ActivityPub; WordPress has the Automattic ActivityPub plugin. When a publisher running either stack turns on federation and also gates a post with `<om:access>locked</om:access>`, there is no shared convention for what happens next. The publisher either (a) federates the full gated content to every follower's home server — silently breaking the paywall — or (b) disables federation for gated posts entirely — breaking the open-internet story that federation is supposed to embody. Neither is a good outcome, and neither is a decision the spec should leave to each implementer to guess at.

This appendix is the missing convention. It defines how an `om` entitlement can be carried alongside an ActivityPub authenticated-fetch request, and how a publisher's outbox should represent a gated post without leaking it. It is structurally parallel to the Podcasting 2.0 co-existence rules referenced in SPEC 0.3 §G.1: both define how `om` primitives survive inside a neighboring RSS-adjacent namespace without either protocol's authors needing to redesign theirs.

---

## 2. The two federation shapes

Every `om`-carrying publisher that also speaks ActivityPub is, at any given moment, doing one of two things per post. The spec has to cover both.

### 2.1 Public federation (non-gated content)

When a post carries `<om:access>open</om:access>` — the implicit default for a post with no `om:access` element — federation behaves exactly as it does for any other Mastodon- or Ghost-style AP-enabled site. The publisher's outbox includes a Create Activity wrapping a Note or Article object with the full content. Followers' home servers perform the standard HTTP Signature authenticated-fetch (where enabled) or an unauthenticated GET (where not) and deliver the object to their users' timelines. Nothing in `om` changes this path.

A publisher's AP integration SHOULD continue to federate open posts unchanged. There is no `om`-flavored Activity for public posts; there is no `om` header on the outbox representation; there is no `om` content negotiation step. The whole point is that open posts are invisible to `om`-aware and `om`-unaware consumers alike.

### 2.2 Gated federation (`<om:access>` is `locked`, `members-only`, or `preview`)

When a post carries any non-open access value, the full content MUST NOT appear in the publicly fetchable ActivityPub object. This is the one hard constraint this appendix imposes on an implementer, and it is derived from existing `om` normativity (SPEC §1.5, §1.6): a reader without an entitlement never receives full gated content, regardless of transport. ActivityPub is a transport like RSS is a transport; the rule is the same.

What *does* appear in the publicly fetchable representation is covered in §4 (the co-existence rule) and §6 (preview semantics). What happens when a subscriber *does* have an entitlement is covered in §5 (the HTTP Signature → entitlement mapping).

---

## 3. Terminology

- **Receiving server.** The fediverse server (Mastodon, Ghost, WordPress + AP plugin, kbin, GoToSocial, etc.) that performs an authenticated or unauthenticated fetch of an Activity or Object hosted by the publisher.
- **Publisher.** The `om`-conformant site that also speaks ActivityPub and has gated posts.
- **Authenticated fetch.** The HTTP Signature pattern Mastodon introduced in 2019 ("secure mode") and widely adopted across fediverse implementations; the fetching server signs the GET with the local actor's key so the publisher can identify which remote actor is reading.
- **Entitlement presentation.** The `om` artifact proving the remote subscriber has access, per SPEC §1 auth methods. One of: a `url-token`, a bearer token, a DPoP-bound token, or a VC presentation.
- **Gated object.** The ActivityPub Object (typically a `Note` or `Article`) whose backing post has `<om:access>` in `locked`, `members-only`, or `preview`.

---

## 4. The co-existence rule

The core normative-adjacent statement:

> An `om`-gated post published via ActivityPub SHOULD be represented in the public outbox as a preview Activity whose `object` is fetchable only with a valid entitlement presentation.

Unpacking this:

- **"Preview Activity"** means a Create whose embedded Object carries only the fields §6 allows: a `summary` (from `<om:preview>`), a URL back to the publisher's canonical page, and addressing. The full `content` field is absent from the public representation.
- **"Fetchable only with a valid entitlement presentation"** means the Object's canonical URL (the `id`) resolves, under content-negotiation for `application/ld+json; profile="https://www.w3.org/ns/activitystreams"` or `application/activity+json`, to either (a) the preview representation (when no entitlement is presented), or (b) the full representation (when a valid `om` entitlement is presented per §5).
- **"SHOULD"**, not MUST: a publisher MAY choose not to federate gated posts at all. That path is always available and always spec-conformant. The SHOULD exists for publishers who *want* to federate previews while keeping the paywall intact, because silently leaking full content is the alternative today and this appendix exists to stop that happening.

The rule is symmetric with SPEC §8's Podcasting 2.0 co-existence rules: where §8 says a shared `podcast:value` block and `om:value` block must agree on recipients for the overlapping Lightning case, this appendix says a shared AP Object and `om`-gated post must agree on what content is public.

---

## 5. HTTP Signature → entitlement mapping

This is the load-bearing mechanism. When a remote subscriber's home server fetches the Object behind a preview Activity, how does the publisher learn that this subscriber has an `om` entitlement?

ActivityPub itself provides one useful primitive: the HTTP Signature over the fetch request identifies the signing actor. The publisher can verify the signature, resolve the actor's URI, and — in principle — look up whether that actor has an active `om` entitlement. In practice, the mapping from "actor URI" to "`om` subject" is not automatic, because `om` does not require subscribers to have ActivityPub actors at all. This appendix defines three patterns, in order of preference, for threading an entitlement through the signed fetch.

### 5.1 Pattern A — Actor-bound bearer

**The subscriber's home server attaches an `Authorization: Bearer <om-token>` header to its signed fetch**, alongside the HTTP Signature. The publisher verifies both: the HTTP Signature establishes which actor is signing the fetch, and the bearer token asserts the `om` subject. The publisher then checks that the two agree — i.e., that the signing actor was previously bound to this bearer token during the subscriber's checkout.

```http
GET /activities/post-123 HTTP/1.1
Host: fieldnotes.example
Accept: application/activity+json
Signature: keyId="https://mastodon.example/users/alice#main-key", ...
Authorization: Bearer eyJhbGciOiJFZERTQSI...
```

Binding happens out-of-band during subscription: when a subscriber pays, the publisher's unlock endpoint asks the subscriber for their preferred AP actor URI (optional), stores the binding, and includes the actor URI in the issued token's claims. Subsequent fetches can therefore be authorized without a second round trip.

Advantages: single round trip; same token works for RSS and AP transports; verification is fast.

Disadvantages: the subscriber's home server must be willing to attach the bearer (many fediverse servers will not, out of the box); the token leaves the subscriber's reader and enters the fediverse server's request path, which some privacy-minded subscribers will object to.

### 5.2 Pattern B — Signed-fetch + presentation endpoint

**The subscriber's home server performs an ordinary signed fetch. The publisher responds 401 with a `Link: <presentation-endpoint>; rel="om-presentation"` header. The subscriber (not the home server) presents the `om` credential out-of-band at that endpoint, receives a scoped token, and the home server retries the fetch carrying the token.**

```http
GET /activities/post-123 HTTP/1.1
Host: fieldnotes.example
Signature: keyId="https://mastodon.example/users/alice#main-key", ...

HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="om"
Link: <https://fieldnotes.example/om/present>; rel="om-presentation"
```

This is the pattern closest in spirit to how Mastodon currently handles authorized-fetch 401s for non-approved actors, and the one that requires the least change to existing AP server implementations. The receiver needs only to honor the `Link: rel="om-presentation"` header.

The presentation step itself reuses `om`'s normal unlock flow: the subscriber's reader POSTs its credential (bearer, DPoP proof, or VC presentation per SPEC §1) to the presentation endpoint, the publisher returns a short-lived scoped token specifically for AP-path fetches against this publisher, and the home server attaches that token on its retry. The scoped token SHOULD carry a `cnf` claim binding it to the fetching instance's actor key, so it cannot be lifted from one home server and replayed from another.

Advantages: no bearer leakage into the home server's signed fetch; works for subscribers whose home servers the publisher does not trust to carry tokens; naturally composes with `om`'s existing unlock flow; the presentation step is identical to the RSS-path presentation, which simplifies the publisher's verification code.

Disadvantages: two round trips on first access; the subscriber's reader (not their fediverse server) must participate in the presentation step, so timeline-side UX is less seamless; requires readers that understand `rel="om-presentation"`; clients without an `om`-capable reader integration (most timeline apps today) will simply see the preview and never trigger the retry.

### 5.3 Pattern C — Linked entitlement document

**The publisher publishes a signed `om` entitlement as an ActivityPub Object at a discoverable URL (typically dereferenced from the subscriber's actor or issued by the publisher during checkout). The receiver GETs that Object before fetching the gated post, verifies its signature, and attaches a reference to it (via the `Link: <entitlement-url>; rel="om-entitlement"` header) on the gated-post fetch.**

```http
GET /activities/post-123 HTTP/1.1
Host: fieldnotes.example
Signature: keyId="https://mastodon.example/users/alice#main-key", ...
Link: <https://mastodon.example/users/alice/om-entitlement/42>; rel="om-entitlement"
```

The entitlement Object itself is a JSON-LD document whose `type` includes `OMEntitlement` (a term the publisher defines in its own AP context extension; it does not require a central registry). It carries the issuer DID, the audience (the publisher URI), validity window, and a status list reference. The publisher verifies the Object's signature — typically against a key resolved from the issuer's DID document, exactly as any OM-VC presentation would be verified — and caches the result for the Object's `validUntil` or a publisher-chosen shorter lifetime.

Advantages: the entitlement is a public, signed, verifiable object — same shape as any other AP Object — so existing AP tooling can fetch and cache it; the subscriber's home server does not need to know what an `om` token is, only how to attach a `Link` header it received during the subscription dance; works cleanly with OM-VC 1.0 (non-selective-disclosure) credentials because the credential is already shaped like a signed document.

Disadvantages: an extra round trip per unique entitlement (though the publisher MAY cache); pseudonymous subscribers cannot use this pattern without leaking the link between their actor URI and their entitlement URL (see §7), and therefore publishers declaring `<om:privacy>pseudonymous-required</om:privacy>` SHOULD NOT offer this pattern at all; fundamentally incompatible with OM-VC-SD 1.0 because selective-disclosure derivations are per-verifier and cannot be precomputed into a static document.

### 5.4 Decision table — which pattern fits which auth method

| `om:authMethod` | Preferred pattern | Rationale |
|---|---|---|
| `url-token` | A (actor-bound bearer) | The token is already bearer-shaped; binding it to an actor at subscription time is the minimal change. Pattern C is acceptable if the reader cannot modify outbound fetch headers. |
| `bearer` | A (actor-bound bearer) | Identical to url-token except the token is carried in `Authorization` natively. Same reasoning. |
| `dpop` | B (presentation endpoint) | DPoP requires proof-of-possession on each request and is incompatible with having a home server inject the token on the subscriber's behalf. The out-of-band presentation step keeps the DPoP key where it belongs, in the subscriber's reader. |
| `vc-presentation` (OM-VC 1.0) | B or C (publisher's choice) | VCs are naturally presentable at an endpoint (B) or publishable as a signed document (C). Publishers with heavy federation use may prefer C for caching; privacy-leaning publishers prefer B. |
| `vc-presentation` (OM-VC-SD 1.0) | B only | Selective-disclosure credentials must never be published as a static document; the derived proof is per-verifier. Pattern C is actively unsafe for SD credentials. Pattern A is also unsuitable: the bearer would have to re-derive the proof on each fetch. |

---

## 6. Preview semantics

A federated representation of an `om`-gated post MUST NOT contain the full content. It MAY contain preview content drawn from `<om:preview>`. The rules:

- **`summary` field.** The AP Object's `summary` SHOULD carry the `<om:preview>` text (plain or HTML-flattened per the receiver's expectation). If no `<om:preview>` is present, the publisher SHOULD supply a generic placeholder drawn from the discovery document (e.g., "This post is available to supporters of Field Notes.") rather than leaking headlines or opening paragraphs by default.
- **`content` field.** MUST be either absent or equal to the `summary`. MUST NOT contain gated content. An Object leaking full content via `content` is a conformance failure.
- **`sensitive: true` or `summary` + content-warning fold.** Publishers MAY additionally mark preview Activities with `sensitive: true` so that Mastodon-style clients render the summary behind a click-to-expand control. This is a UX hint, not a gating mechanism; it does not substitute for the preview/full split above.
- **`url` field.** SHOULD point at the publisher's canonical web URL for the post, which itself may present a paywall to unauthenticated browsers per the publisher's normal web-side flow.
- **Federation addressing.** The preview Activity is addressed to `https://www.w3.org/ns/activitystreams#Public` and/or the publisher's followers collection, exactly as a normal public Activity would be. The Activity itself is public; only the underlying full Object is gated.

This mirrors SPEC §1.6's publisher-curated-preview semantics for RSS: the same `<om:preview>` content that flows into the RSS `description` or `content:encoded` flows into the AP `summary`. One authored preview, two transports.

---

## 7. Actor identity and pseudonymity

A subscriber has, at most, two identities under this appendix:

1. An `om` subject (from SPEC §4 and §9 — either a stable subject DID, or a per-publisher pseudonym under `<om:privacy>pseudonymous>`).
2. An ActivityPub actor URI (from their fediverse home server).

The mapping between these two is deliberately not automatic. The appendix defines three rules:

**I1 (opt-in binding).** A subscriber's `om` subject is bound to their AP actor URI only when the subscriber explicitly consents during subscription checkout or entitlement redemption. A publisher MUST NOT infer this binding from same-name handles, same-email contact fields, or any other passive observation.

**I2 (no cross-publisher linking of pseudonyms to actors).** For publishers declaring `<om:privacy>pseudonymous</om:privacy>` or `<om:privacy>pseudonymous-required</om:privacy>`, the per-publisher pseudonym MUST NOT be linked to a stable AP actor URL across publishers. If the same subscriber federates at `@alice@mastodon.example` and subscribes pseudonymously to two different publishers, those two publishers MUST see two different pseudonym↔actor bindings at each of their endpoints, not one shared binding.

**I3 (pseudonymous-required + federation is a conflict).** A publisher declaring `<om:privacy>pseudonymous-required</om:privacy>` SHOULD NOT federate gated posts at all. The act of federation — even with preview content and gated full-fetch — leaks the fact of a subscriber's interest to their fediverse home server and, via inbox delivery, to anyone with administrative access to that server. If a publisher's privacy posture is "we cannot know which of our subscribers read which article," federation reintroduces exactly the correlation surface the `om` privacy work removed. The safe default for `pseudonymous-required` publishers is to turn federation off for gated content; the discovery document SHOULD advertise this choice via `activitypub.federates_gated_content: false`.

The deeper implication is that `pseudonymous-required` publishers and ActivityPub are, at the protocol layer, incompatible for the gated half of their catalog. This appendix does not try to resolve that; the honest framing is that there are two good designs (federate-and-paywall, or privacy-first-no-federation), and the publisher picks one per post or per catalog. The cautionary tale in SPEC §G.2 is partly about what happens when protocols try to pretend otherwise.

A publisher whose privacy posture is `<om:privacy>pseudonymous</om:privacy>` (the softer of the two privacy modes) MAY federate gated content but SHOULD warn subscribers during checkout that the act of subscribing-from-Mastodon leaves an actor-URI↔publisher-binding observable at the publisher's server, even if article-level reading patterns remain pseudonymous. Readers surfacing the binding-consent step during subscription (see §12 and §13 for implementation guidance) are the UX layer that makes this trade-off visible to the subscriber instead of silent.

---

## 8. Revocation propagation

When an `om` entitlement is revoked (SPEC §2), the receiving server's next attempt to fetch a gated Object 401s. No separate `Delete` Activity is required. The receiver handles this exactly as any fetch failure — by removing or hiding the timeline item for the affected follower — and the publisher's Bitstring Status List (SPEC §9) becomes the single source of truth for revocation.

Consequences:

- A publisher MUST NOT emit `Delete` Activities purely to propagate an `om` revocation. That would be observable across all of federation and would leak the revocation event (and by extension, the subscriber's prior access) to every instance that cached the Object's existence.
- Receivers SHOULD treat a 401 on a previously-accessible Object as "entitlement no longer valid" rather than "object withdrawn." A well-behaved receiver shows the follower the preview representation again, not a "deleted post" indicator.
- Publishers MAY shorten AP-specific cache lifetimes on gated Objects (e.g., `Cache-Control: max-age=300`) so revocation propagates within a few minutes rather than whenever the receiver next happens to refresh.

This is exactly the revocation posture SPEC §2 takes for the RSS path: status-list-driven, with no side-channel events. The AP path reuses it rather than inventing a parallel mechanism.

---

## 9. Bundle credentials over federation

A subscriber to a bundle aggregator (SPEC §3) reads a bundled publisher's gated post via their Mastodon (or other AP) server. Which credential presents — the aggregator's bundle credential, or a per-publisher scoped token the aggregator previously swapped for?

**The preferred path: per-publisher scoped token.**

Per SPEC §3.4, after first use of a bundle credential at a participating publisher, the publisher issues its own short-lived scoped bearer token. The subscriber's reader (or, in the AP case, whichever component signs outbound fetches) SHOULD present that scoped token — not the bundle credential — on subsequent AP-path fetches against that publisher.

Rationale: the bundle credential names *all* audience publishers, and carrying it around on every AP fetch would needlessly disclose the subscriber's full bundle membership to every participating publisher's logs. The scoped token is locally-issued, locally-verifiable, and discloses only the publisher that issued it. It also composes cleanly with Pattern A or B from §5.

**Exception: first-contact fetch.** The very first AP fetch against a given publisher MAY carry the bundle credential (Pattern C, linked entitlement document) so the publisher can verify the aggregator signature, record the membership, and issue the scoped token for future fetches. Subsequent fetches against the same publisher SHOULD use the scoped token.

**Federation does not create new aggregator trust.** A publisher's `<om:bundled-from>` declaration applies uniformly to RSS and AP transports. An aggregator not listed in `<om:bundled-from>` MUST NOT be trusted purely because its credential arrived via the AP path rather than the RSS path.

---

## 10. Worked example — a Ghost publisher with AP enabled

A small news publication, Field Notes, runs on Ghost. Its members feature defines a `paid` tier. It has AP enabled (native Ghost ActivityPub, 2025+). It has installed an `om`-for-Ghost plugin that emits `om` 0.4 markup and serves `.well-known/open-membership`. The publisher opts into Pattern A for its federated-gated path.

Post lifecycle:

1. **Editor publishes.** The editor writes a post, marks it "Paid tier only" in Ghost, and saves. Ghost's post table records `visibility = 'paid'`. The `om` plugin's pre-publish hook reads this and stamps the post with `<om:access>locked</om:access>` (and a `<om:preview>` block from the post excerpt) for the RSS path.
2. **AP background job runs.** Ghost's ActivityPub background job runs its normal outbox-emission logic. The `om` plugin has registered a filter on the outbox-emission path that sees `visibility = 'paid'` and intervenes: instead of emitting a Create Activity with the full `content`, it emits a Create whose embedded Note has `summary` set from `<om:preview>`, `content` absent, `id` pointing at the gated-object URL, and `sensitive: true`. The Activity's addressing is standard (`Public` plus `followers`).
3. **Federation fanout.** The preview Activity is delivered to follower inboxes across the fediverse exactly as any other public Activity. Mastodon, kbin, GoToSocial, and Ghost-to-Ghost federation all accept it; none of them know `om` exists.
4. **Follower sees the preview.** Alice, a subscriber, follows Field Notes from `@alice@mastodon.example`. The preview appears in her home timeline with the summary ("Today's dispatch: what the county zoning board did not tell us…") behind a content-warning fold, courtesy of Mastodon's `sensitive: true` handling.
5. **Alice taps "Show more."** Her Mastodon client issues a signed fetch against `https://fieldnotes.example/activities/post-123` with her instance's actor key in the HTTP Signature. Because Field Notes previously bound Alice's `om` subject to `https://mastodon.example/users/alice` during her subscription flow, Mastodon's AP-fetch library (Ghost-AP, Fedify, or similar) has been configured to attach the stored `om` bearer token on fetches to `fieldnotes.example`. The request carries both `Signature: ...` and `Authorization: Bearer eyJ…`.
6. **Publisher verifies both.** The Field Notes server verifies the HTTP Signature against `alice`'s public key (standard AP path), and separately verifies the bearer token through its `om` unlock logic. The two identities — actor URI and `om` subject — match the stored binding.
7. **Publisher returns the full Object.** The response is the same Note but with full `content`. Alice's client renders it inline.
8. **A week later, Alice cancels.** Her Stripe subscription lapses; the Stripe webhook fires the `om` revocation path; the Bitstring Status List entry for her token flips to revoked. The next time her Mastodon instance attempts to fetch a still-live Field Notes gated post on her behalf, the bearer fails validation and the publisher returns the preview-only representation again. No `Delete` Activity is emitted. Alice's timeline-level state is: old posts she has already fetched and cached remain readable (subject to her instance's cache policy and the publisher's declared `<om:revocation>` grace period); new posts appear as preview-only.

Every step of this flow reuses existing primitives: Ghost's AP background job (step 2), Mastodon's authenticated-fetch (step 5), `om`'s unlock and status-list (steps 6, 8). The appendix's contribution is the filter at step 2 and the binding at step 5, nothing more.

A variant worth naming: if Alice's Mastodon instance does not carry `om` bearers on outbound fetches (the default for most instances today), step 5 produces a 401 with the `om-presentation` Link header (Pattern B). Alice's `om`-capable reader — whether that is a NetNewsWire-like app configured to augment her Mastodon timeline, or a Mastodon web-UI extension — sees the 401, fetches the presentation endpoint with her stored bearer, receives a scoped token, and instructs the instance to retry. The subscriber experiences a one-time handshake on first access and cached access thereafter; the instance never holds a long-lived `om` credential. This is the more realistic deployment for the 2026 fediverse, and the reason Pattern B, not Pattern A, is the default recommendation for publishers who cannot coordinate with specific home servers.

---

## 11. What this appendix does NOT specify

To keep the scope honest:

- **No new ActivityPub object type.** There is no `om:GatedNote` or `om:ProtectedCreate`. A gated post is a standard `Note` or `Article` whose full representation is entitlement-gated. Inventing a new object type would split federation in half.
- **No authentication for non-`om` federated content.** ActivityPub's authorized-fetch, signed-fetch, instance-level blocklists, and other access controls are out of scope. This appendix addresses only the case where a post is `om`-gated and also federated.
- **No monetization primitives for non-`om` federated platforms.** SPEC §G.2 is explicit: the spec does not try to add subscription, tipping, or paywalling to ActivityPub proper. A Mastodon server that wants to sell access to its timelines is out of scope. The scope is "a publisher who has already decided to use `om` wants their federation story to be consistent with their paywall story."
- **No conversion between `om` and future AP monetization proposals.** Several drafts circulate (FEP-0837 for QuickPay-style tipping, FEP-xxxx for subscription tiers) and it would be premature to profile them here. When and if any such proposal stabilizes, a future version of this appendix can add a bridging section.
- **No federation-first discovery.** `om` discovery remains RSS + `.well-known/open-membership`. ActivityPub actors do not advertise `om` capability via a new actor property in this version.

---

## 12. Implementation guidance — Ghost

Ghost's ActivityPub integration (landed 2024, expanded through 2025) runs as a background service that emits outbox entries and processes inbox deliveries. The integration points for `om` co-existence are concrete:

**The outbox-emission path.** Ghost emits Activities via an internal job that reads recently-published posts and constructs Create Activities. An `om`-for-Ghost plugin adds a filter here. When the post's `visibility` column is `paid` or `members`, the plugin rewrites the emitted Object: `content` is stripped, `summary` is populated from the post's excerpt (or from `<om:preview>` if explicitly authored), and `sensitive` is set to `true`. The `id` of the Object remains the publisher's canonical Object URL so that follower instances can later re-fetch it. This is the filter at step 2 of §10's worked example.

**The Object-serving route.** Ghost's AP integration serves each Object at a stable URL under content negotiation. The plugin wraps this route with `om`'s entitlement check: if the `Accept` header indicates an AP-shape response and the request carries an `om` bearer (Pattern A) or has followed the `om-presentation` handshake (Pattern B), the full content is served; otherwise, the preview Object is served. This is one added middleware, registered via Ghost's HTTP framework, and does not require forking Ghost itself.

**The actor-binding step during checkout.** Ghost's Members checkout UI gains an optional field: "Fediverse handle (optional)." When the subscriber completes checkout, the handle is resolved via Webfinger, the corresponding actor URI is stored against the subscriber's `om` subject, and the binding flows into the token the plugin issues. This is the only new UI the plugin needs for federation support; existing subscribers can add a handle post-hoc in their account settings.

**The revocation path.** Ghost's existing Stripe-webhook handler already triggers `om` revocation through the plugin. No AP-side change is required: the next AP fetch simply returns preview-only, as described in §8.

**Discovery advertisement.** The plugin extends Ghost's `.well-known/open-membership` handler (which `om-ghost` already serves) with the `activitypub` block described in §16. The Ghost AP integration's own actor endpoint — typically at `/ghost/api/activitypub/actor` or the publication's root actor URL — is unchanged; the two discovery mechanisms (Webfinger/actor for AP, `.well-known/open-membership` for `om`) live side by side and reference each other via cross-links in their respective JSON bodies.

None of this exists in Ghost's current AP integration. This appendix is the specification for what a Ghost `om`-AP plugin would need to add, not a description of what Ghost does today. The estimated effort for a competent Ghost plugin developer who already knows `om-ghost` internals is 2–3 engineer-weeks — the bulk of it in the outbox-emission filter and the actor-binding UI, both of which are mechanical; the entitlement-verification middleware reuses existing `om-ghost` code paths.

---

## 13. Implementation guidance — WordPress

WordPress's Automattic ActivityPub plugin (maintained as `pfefferle/wordpress-activitypub`, later acquired and rebranded) federates posts as Activities when published. The integration points for `om` co-existence are:

**The `pre_get_posts` hook and AP query filter.** The Automattic plugin exposes hooks on its outbox query and on the per-post Activity serialization. An `om-wordpress` plugin adds a filter on the Activity serialization that inspects the post's `om_access` meta (written by `om-wordpress` at save time). When the meta is non-open, the filter overrides the serialized Object's `content` with the `summary` derived from `om_preview` meta and sets `sensitive: true`. This is the WordPress equivalent of the Ghost outbox-emission filter.

**The `template_redirect` hook for AP requests.** The Automattic plugin intercepts requests with `Accept: application/activity+json` and serves a JSON-LD representation of the post. `om-wordpress` adds an entitlement check before this serialization runs: if the request carries a valid bearer bound to an actor that matches the fetch's HTTP Signature, the full representation is served; otherwise, the preview representation. This hooks into `template_redirect` at a priority earlier than the AP plugin's own handler.

**Webfinger-based actor binding at subscription time.** `om-wordpress` adds a Fediverse-handle field to its checkout form, resolves it via the Automattic plugin's Webfinger client (already present), and stores the actor URI in the `om_activitypub_actor` user meta. Tokens issued to this subscriber carry the actor URI as a JWT claim; verification on AP-path fetches uses the claim to match against the HTTP Signature actor.

**Uninstall and cleanup.** The plugin's uninstall routine (already present in `om-wordpress`) removes the actor-binding user meta alongside the existing `om_*` metas. Revocation flows through the same Bitstring Status List path as RSS-side revocation; no AP-specific cleanup is required.

**Discovery and coexistence with the Automattic plugin's settings.** The Automattic plugin exposes its own settings screen for federation scope, actor profile, and shared-inbox behavior. `om-wordpress` adds an "ActivityPub co-existence" section to its existing admin page (not the AP plugin's page, to avoid cross-plugin coupling) with a single toggle — "Federate gated posts as previews" — defaulting to off, and a selector for Pattern A / Pattern B preference. When enabled, the plugin registers its filters; when disabled, it unregisters them and gated posts are simply omitted from the AP outbox.

As with Ghost, none of these integration points exist in the current `om-wordpress` plugin. This appendix defines them. Because WordPress's AP plugin is already mature and the relevant hooks are stable, the estimated effort for this work is smaller than the Ghost side — roughly 1–2 engineer-weeks for a developer familiar with both `om-wordpress` and the Automattic plugin's hook surface. The largest unknown is the Webfinger-handle checkout integration, which touches the subscription flow's UX and should be scoped conservatively.

---

## 14. Relationship to SPEC §8 Podcasting 2.0 co-existence

SPEC 0.3 introduced the co-existence shape: when `om` overlaps with another RSS-adjacent namespace, the rule is not "merge the two" but "define how they compose without stepping on each other." The Podcasting 2.0 co-existence rules work because:

- They do not redefine `podcast:value`; they specify how an `om`-aware reader should interpret a feed carrying both.
- They privilege backward compatibility: a Lightning-only Podcasting 2.0 app sees exactly what it expected before `om` arrived; an `om`-aware reader sees the extra capability.
- They are narrow: they answer the specific question "what happens when both tags name recipients?" and leave everything else alone.

This appendix follows the same three disciplines for ActivityPub:

- It does not redefine ActivityPub primitives (no new object types, no new actor properties, no new Activity vocabulary).
- It privileges backward compatibility: a Mastodon instance that does not know `om` exists sees a preview Activity it can render with its existing code; a publisher that never turns on `om`-AP co-existence behaves exactly as its existing AP integration has always behaved.
- It is narrow: it answers the specific question "how does an `om` entitlement thread through an AP authenticated fetch?" and declines to opine on broader ActivityPub monetization.

The structural parallel is deliberate. If and when further RSS-adjacent namespaces emerge that overlap with `om` (Atom payment extensions, JSON Feed subscription fields, future Podcasting 2.0 additions), co-existence appendices for each SHOULD follow the same shape. The pattern, more than any individual appendix, is the durable contribution.

---

## 15. Open questions

Carried here rather than silently deferred, per the guiding principle to publish negative results and unresolved questions:

**OQ1 — Shared-inbox delivery.** When a publisher's AP integration uses shared-inbox delivery (one POST per receiving instance, regardless of how many of that instance's users follow), the inbox-side entitlement check has to scale to per-user granularity at fetch time rather than per-delivery time. Pattern A assumes a single bearer per fetch; in shared-inbox scenarios, multiple users on the same instance may each have different entitlements, and the instance has to attach the correct per-user bearer on each fetch. This works in principle, but requires receiving-server implementers to cooperate. The conservative answer is Pattern B (presentation endpoint) for shared-inbox-heavy fediverses.

**OQ2 — Cached-forever problem.** Once a follower's home server has fetched and cached a full gated Object, it is that server's obligation to honor the publisher's revocation. Today, few AP implementations treat cached Objects as revocable on upstream change. This appendix asks (§8) for a polite contract: refetch on revocation, serve preview-again on 401. There is no enforcement mechanism. Publishers with strict retroactive-revocation policies (`full-revocation` per SPEC §2) may need to route around federation for their most sensitive gated content, at least until fediverse implementations catch up.

**OQ3 — Relay amplification.** Fediverse relays re-broadcast public Activities to subscribing instances. A preview Activity from an `om`-gated post will be relayed like any other public Activity; this is fine. The relay will not (by virtue of being a relay) participate in the entitlement presentation flow, so the relay's cached copy of the preview is genuinely public. Nothing to fix here; named for completeness.

**OQ4 — FEP convergence.** Several fediverse enhancement proposals touch the same surface area (authenticated-fetch variants, object-addressing with access control). If any reaches consensus before `om` 1.0, this appendix SHOULD cite it as the underlying primitive rather than redefine. The current draft deliberately does not pre-commit to any specific FEP.

**OQ5 — Boost and reblog semantics.** An `Announce` Activity (Mastodon "boost", Ghost "reshare") against a preview Activity federates the preview, not the full content. This is the correct behavior: a boost propagates the publisher-authored summary across the fediverse, and anyone following the boost still has to present an entitlement to see the full post. But the boost receiver's home server may attempt to re-fetch the Object to refresh its cache, and if the receiver's actor has no entitlement, the fetch legitimately 401s. Implementers SHOULD treat boost-driven fetch failures the same as direct-follow fetch failures: preview-only representation, no visible error.

**OQ6 — Account migration.** ActivityPub's `Move` Activity lets a user migrate from one home server to another. If a subscriber has bound their `om` subject to an actor URI at their old server, a `Move` should trigger a rebinding to the new actor URI. The publisher's revocation path (SPEC §2) does not quite fit this case because the subscription itself is not revoked, only the actor binding. A clean mechanism would be for `om` implementations to subscribe to `Move` activities for bound actors and update the binding automatically on receipt, verifying the move per Mastodon's existing `Move`-validation rules. This is a future-version consideration, not a 1.0 requirement.

---

## 16. Conformance

This appendix is non-normative. There is no `om`-AP conformance level defined here. A publisher that implements this appendix is simply an `om` publisher whose AP integration behaves consistently with `om`'s access rules.

The only normative requirement this appendix carries over is the one inherited from SPEC §1: an `om`-gated post's full content MUST NOT be delivered to an unauthenticated requester via any transport, including ActivityPub. The mechanisms in §5 and the representation rules in §6 are specific ways to meet that requirement; a publisher choosing to turn federation off for gated posts entirely also meets it.

A publisher declaring adherence to this appendix SHOULD advertise it in `.well-known/open-membership`:

```json
{
  "activitypub": {
    "coexistence_profile": "http://purl.org/rss/modules/membership/activitypub-coexistence/1.0",
    "federates_gated_content": true,
    "preferred_pattern": "actor-bound-bearer",
    "presentation_endpoint": "https://fieldnotes.example/om/present"
  }
}
```

A publisher declaring `<om:privacy>pseudonymous-required</om:privacy>` SHOULD set `federates_gated_content: false` regardless of other choices, per §7 I3.

---

## 17. Acknowledgements

This appendix draws on the ActivityPub Recommendation (Prodromou, Snell, Webber, Tallon), Mastodon's authenticated-fetch documentation (originally by Eugen Rochko), the `pfefferle/wordpress-activitypub` plugin's integration-point documentation, and the Ghost ActivityPub engineering team's public notes on their outbox architecture. The identification of ActivityPub as a cautionary tale on monetization in SPEC §G.2 is the framing this appendix inherits; credit for the framing belongs to the long list of implementers who tried and failed to fit paid content into ActivityPub's existing vocabulary over the past decade.

The structural decision to model this as a co-existence appendix rather than a protocol extension came from the Podcasting 2.0 precedent discussed in SPEC §G.1: small, scoped, non-invasive appendices age better than ambitious joint specifications. If this appendix is wrong about something, a future version can correct it without affecting either `om` proper or ActivityPub proper — which is exactly the property the co-existence shape was chosen for.
