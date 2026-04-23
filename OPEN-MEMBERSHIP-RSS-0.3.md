# Open Membership RSS 0.3

**An open module for paid, tiered, time-gated, group-shared, and value-for-value syndication content.**

- **Latest version:** `http://purl.org/rss/modules/membership/`
- **This version:** 0.3 (draft, 2026-04-23)
- **Previous version:** 0.2 (2026-04-23)
- **Namespace URI:** `http://purl.org/rss/modules/membership/`
- **Suggested prefix:** `om`
- **Status:** Draft for public comment. Not yet frozen.

## Copyright

Copyright © 2026 by the Authors.

Permission to use, copy, modify and distribute the Open Membership RSS Specification and its accompanying documentation for any purpose and without fee is hereby granted in perpetuity, provided that the above copyright notice and this paragraph appear in all copies.

The copyright holders make no representation about the suitability of the specification for any purpose. It is provided "as is" without expressed or implied warranty. This copyright applies to the Open Membership RSS Specification and accompanying documentation and does not extend to the format itself.

## Changes from 0.2

1. **Native PSP bindings.** New `<om:offer>` and `<om:psp>` elements let a reader start a checkout or subscription directly in the reader — no browser detour required — across Stripe, Mollie, PayPal, Adyen, Paddle, and any PSP implementing the minimum binding interface.
2. **Feature-level entitlements.** `<om:feature>` decouples what the publisher sells (tiers) from what the reader checks for (features), matching the shape Stripe Entitlements and WorkOS Entitlements use. A reader evaluates features, not tier names.
3. **Podcasting 2.0 parity.** Full cross-mapping and co-existence rules with `podcast:funding`, `podcast:value`, `podcast:valueRecipient`, `podcast:valueTimeSplit`, `podcast:locked`, and `podcast:license`. A feed that declares both namespaces is unambiguous.
4. **Value-for-value native.** `<om:value>` handles one-time tips, streaming micropayments, and split recipients in a PSP-agnostic way — Lightning, Stripe, Mollie, or any combination — alongside or instead of subscriptions.
5. **Payment discovery document.** `.well-known/open-membership` extended with a `payments` section listing offered PSPs, price IDs, and webhook conventions.

---

## 1. What This Version Fixes

0.1 and 0.2 specified entitlement *shapes* but assumed the reader already held a bearer token or VC. That assumes payment happens somewhere else — a browser tab, a publisher signup page, a Patreon flow. This is exactly the "walled garden" fallback that kills the cross-platform dream: if payment lives outside the protocol, the platform that owns the checkout owns the subscriber.

0.3 brings payment into the protocol. A reader that supports the PSP binding for Stripe can take a user from "I want this" to "I have access" without leaving the app, with the subscription object living in the publisher's Stripe account (not the reader's, not a platform's). The same flow works with Mollie for EU-centric publishers, with PayPal for consumer-preference reasons, and with Lightning via the existing Podcasting 2.0 primitives for value-for-value shows.

The design principle: **the RSS feed says what it costs and how to pay; the reader coordinates the checkout; the publisher holds the payment relationship.** No middleman is added by the spec.

## 2. Architecture

```
                           Reader                              Publisher
                   ┌──────────────────┐                 ┌───────────────────┐
                   │                  │                 │                   │
  User taps ──────▶│  parses <om:offer>│                │                   │
   "Subscribe"     │  picks PSP        │                │                   │
                   │  POST /checkout   │───────────────▶│  creates Stripe   │
                   │                  │                 │  Checkout Session │
                   │  opens hosted    │◀───────────────│  returns hosted   │
                   │  checkout page   │                 │  checkout URL     │
                   │                  │                 │                   │
                   └──────────────────┘                 │   Stripe webhook  │
                                                        │   → entitlement   │
  Next feed poll ◀────────────── 200 OK with content    │                   │
                                                        └───────────────────┘
                                                                 ▲
                                                                 │
                                                        ┌───────────────────┐
                                                        │      Stripe       │
                                                        │  (or Mollie, etc) │
                                                        └───────────────────┘
```

The reader never holds Stripe keys. The publisher never holds the reader's session. The PSP holds the money and the mandate.

## 3. New Elements — Channel Level

### 3.1 `<om:psp>` (optional, repeatable)

Declares a Payment Service Provider this publication accepts. A channel may declare multiple; readers pick the one they support.

Attributes:

- `id` (required) — one of the registered PSP identifiers: `stripe`, `mollie`, `paypal`, `adyen`, `paddle`, `lightning`, `custom`. For `custom`, the PSP MUST also be described in the discovery document.
- `account` (optional) — PSP-assigned merchant identifier. For Stripe, the `acct_` ID. For Mollie, the profile ID. For Lightning, a LNURL or Lightning Address.

```xml
<om:psp id="stripe" account="acct_1Pxyz..." />
<om:psp id="mollie" account="pfl_v9hTwCvYqw" />
<om:psp id="lightning" account="alice@getalby.com" />
```

The `account` attribute exists so a reader can construct direct charges or show a Lightning Address without an API round-trip, but the authoritative source of truth is always the discovery document (§7).

### 3.2 `<om:feature>` (optional, repeatable)

Declares a feature — a capability a subscriber gets. Features are the unit of access control. Tiers are marketing; features are what the reader checks.

This mirrors the Stripe Entitlements "features" model and the WorkOS entitlements JWT claim shape, where an access token carries `entitlements: ["audit-logs", "advanced-analytics"]` rather than `tier: "enterprise"`.

Attributes:

- `id` (required) — opaque lookup key, unique within the channel. MUST match the PSP's feature lookup key if one exists (e.g., Stripe `feature.lookup_key`).

```xml
<om:feature id="full-text">Full article text</om:feature>
<om:feature id="weekly-premium">Weekly premium essay</om:feature>
<om:feature id="ad-free-audio">Ad-free audio</om:feature>
<om:feature id="back-catalog">Complete back catalog</om:feature>
```

A tier MAY reference one or more features:

```xml
<om:tier id="paid" price="USD 8.00" period="monthly">
  Paid
  <om:includes feature="full-text" />
  <om:includes feature="ad-free-audio" />
</om:tier>
```

### 3.3 `<om:offer>` (optional, repeatable)

A buyable thing. An offer is what a reader presents a "Subscribe" button for. It binds a tier or a set of features to one or more PSPs and prices.

Attributes:

- `id` (required) — opaque identifier
- `tier` (optional) — references an `<om:tier>` id
- `group` (optional) — references an `<om:group>` id

Child elements:

- `<om:price>` — one or more; one per currency or PSP
- `<om:checkout>` — one or more; one per PSP
- `<om:trial>` (optional) — trial period specification

```xml
<om:offer id="paid-monthly" tier="paid">
  <om:price amount="8.00" currency="USD" period="P1M" />
  <om:price amount="7.50" currency="EUR" period="P1M" />
  <om:trial days="14" />
  <om:checkout psp="stripe" price_id="price_1Pxyz..." />
  <om:checkout psp="mollie" plan_id="sub_plan_..." />
  <om:checkout psp="paypal" plan_id="P-5ML4..." />
</om:offer>

<om:offer id="paid-yearly" tier="paid">
  <om:price amount="80.00" currency="USD" period="P1Y" />
  <om:checkout psp="stripe" price_id="price_1Pabc..." />
</om:offer>

<om:offer id="team" tier="paid" group="team">
  <om:price amount="200.00" currency="USD" period="P1M" model="flat" />
  <om:price amount="12.00" currency="USD" period="P1M" model="per-seat" />
  <om:checkout psp="stripe" price_id="price_1Pteam..." />
</om:offer>
```

Attributes on `<om:price>`:

- `amount`, `currency`, `period` (ISO 8601 duration — `P1M` = monthly, `P1Y` = yearly)
- `model` (optional) — `flat` (default), `per-seat`, `metered`

Attributes on `<om:checkout>`:

- `psp` (required) — matches an `<om:psp id="">` declared on the channel
- `price_id` / `plan_id` / `product_id` — PSP-native identifier. The reader passes this opaquely back to the publisher's checkout endpoint; the publisher's server uses it in the PSP API call. **Readers never call PSP APIs directly with these identifiers.**

Attributes on `<om:trial>`:

- `days` — integer, trial length in days

## 4. New Elements — Channel Level, Value-for-Value

### 4.1 `<om:value>` (optional)

PSP-agnostic value-for-value. A channel-level `<om:value>` applies to all items by default; an item-level override applies to just that item. Fully compatible with — and intended to replace at the spec level — the payload of `<podcast:value>`.

Attributes:

- `type` — `tip` (one-time), `streaming` (per unit of consumption), or `both`
- `suggested` (optional) — suggested default amount with currency (e.g. `USD 1.00`, `sats 100`)
- `unit` (optional, for streaming) — one of `minute`, `second`, `item`; default `minute`

Child elements: one or more `<om:recipient>` elements, optionally `<om:split>` for time-based splits.

```xml
<om:value type="both" suggested="USD 1.00" unit="minute">
  <om:recipient psp="stripe" account="acct_hostA" split="50" name="Host A" />
  <om:recipient psp="stripe" account="acct_hostB" split="40" name="Host B" />
  <om:recipient psp="stripe" account="acct_producer" split="10" name="Producer" />
</om:value>

<om:value type="streaming" suggested="sats 100" unit="minute">
  <om:recipient psp="lightning" account="alice@getalby.com" split="70" name="Alice" />
  <om:recipient psp="lightning" account="bob@getalby.com" split="30" name="Bob" />
</om:value>
```

### 4.2 `<om:recipient>` (required inside `<om:value>`)

Attributes:

- `psp` (required) — matches a channel-level `<om:psp>` or is `lightning`
- `account` (required) — recipient identifier scoped to the PSP
- `split` (required) — integer percentage, 0–100; splits across recipients in one `<om:value>` block SHOULD sum to 100
- `name` (optional) — display name
- `fee` (optional) — `true` if this recipient is a fee recipient (platform, producer) and should receive `split%` *on top of* the 100% to other recipients; matches `podcast:valueRecipient fee="true"`

## 5. New Elements — Item Level

### 5.1 `<om:value>` at item level

Item-level `<om:value>` overrides channel-level for that item. All channel-level behavior applies.

### 5.2 `<om:split>` (optional, repeatable) inside `<om:value>`

Time-based split for streaming value, matching `<podcast:valueTimeSplit>`.

Attributes:

- `startTime` (required) — seconds from item start
- `duration` (required) — seconds
- `remotePercentage` (optional) — integer; percentage of the parent split that goes to the remote recipients during this window

```xml
<om:value type="streaming" unit="minute">
  <om:recipient psp="lightning" account="host@getalby.com" split="100" />
  <om:split startTime="600" duration="180" remotePercentage="80">
    <om:recipient psp="lightning" account="guest@getalby.com" split="100" />
  </om:split>
</om:value>
```

## 6. Checkout Flow (Normative)

A reader that supports an offered PSP MUST use the following flow:

1. User taps a subscribe button on an offer.
2. Reader POSTs to the publisher's checkout endpoint (discovered via `.well-known/open-membership` → `payments.checkout_endpoint`), with a JSON body:

```json
{
  "offer_id": "paid-monthly",
  "psp": "stripe",
  "price_id": "price_1Pxyz...",
  "return_url": "com.example.reader://subscribe/return",
  "customer_hint": {
    "email": "alice@example.com",
    "subject_did": "did:web:alice.example"
  }
}
```

3. Publisher's endpoint calls the PSP API (Stripe `checkout.sessions.create`, Mollie `POST /v2/subscriptions`, etc.) and returns:

```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_...",
  "session_id": "cs_test_...",
  "expires_at": "2026-04-23T09:30:00Z"
}
```

4. Reader opens `checkout_url` in a system browser or in-app web view. User completes payment.
5. PSP calls publisher's webhook; publisher provisions entitlement.
6. Reader is returned to `return_url` (or polls the publisher's entitlement endpoint — see §6.2).
7. Reader requests a fresh access token via the already-declared `<om:tokenEndpoint>` (per 0.2 §4.6). The new token carries the provisioned entitlements as claims.

### 6.1 Why the Publisher Is in the Middle

The reader does not call Stripe (or Mollie, or any PSP) directly. Three reasons:

- **No API keys in readers.** A reader that held publisher Stripe keys would be a breach magnet. The publisher's own server is the only party that needs keys.
- **PSP webhook idempotency.** Only the publisher's server can reliably reconcile "payment succeeded → entitlement granted" via signed webhooks. A reader-side flow can't see the webhook.
- **Publisher policy.** Taxes, fraud rules, referral codes, regional availability — these are publisher decisions, not reader decisions.

What the reader gets in exchange: a single normalized flow that works whether the publisher uses Stripe, Mollie, or PayPal.

### 6.2 Entitlement Polling (Optional)

If a reader cannot reliably receive return URLs (some mobile platforms, some desktop readers), it MAY poll a publisher-operated entitlement status endpoint:

```
GET /api/entitlements?session_id=cs_test_...
```

Publisher responds `200 {"status": "pending"}` or `200 {"status": "active", "refresh_token": "..."}` or `410 Gone` if the session expired.

## 7. Discovery Document Extensions

The `.well-known/open-membership` document from 0.2 §7 gains a `payments` section:

```json
{
  "spec_version": "0.3",
  "provider": "https://fieldnotes.example",
  "publisher_name": "Field Notes",
  "feed_urls": ["https://fieldnotes.example/feed.xml"],

  "auth_methods": ["url-token", "bearer", "vc-presentation"],
  "token_endpoint": "https://fieldnotes.example/oauth/token",
  "signup_url": "https://fieldnotes.example/subscribe",

  "payments": {
    "checkout_endpoint": "https://fieldnotes.example/api/checkout",
    "status_endpoint": "https://fieldnotes.example/api/entitlements",
    "manage_endpoint": "https://fieldnotes.example/api/portal",
    "supported_psps": [
      {
        "id": "stripe",
        "account": "acct_1Pxyz...",
        "publishable_key": "pk_live_...",
        "methods": ["card", "apple_pay", "google_pay", "link"],
        "entitlements_source": "stripe-native",
        "webhook_events_supported": [
          "checkout.session.completed",
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
          "entitlements.active_entitlement_summary.updated"
        ]
      },
      {
        "id": "mollie",
        "account": "pfl_v9hTwCvYqw",
        "methods": ["ideal", "creditcard", "bancontact", "sepadirectdebit"],
        "entitlements_source": "derived-from-subscription-status"
      },
      {
        "id": "lightning",
        "account": "fieldnotes@getalby.com",
        "entitlements_source": "value-for-value"
      }
    ],
    "offers_catalog": "https://fieldnotes.example/api/offers"
  },

  "tiers": [...],
  "groups": [...],
  "verifiable_credentials": {...}
}
```

### 7.1 `entitlements_source`

One of:

- `stripe-native` — the publisher uses Stripe Entitlements; the subscription → entitlement mapping lives in Stripe. `<om:feature id>` values SHOULD match Stripe feature `lookup_key` values.
- `derived-from-subscription-status` — for Mollie, PayPal, Adyen, and others that don't have native entitlement APIs. The publisher derives the entitlement set from the subscription object's status and price_id.
- `value-for-value` — for Lightning and other micropayment rails. Entitlement is per-payment, not per-subscription.
- `custom` — publisher maintains its own entitlement logic. The reader's job is unchanged; this value is informational.

### 7.2 `publishable_key` Convention

For PSPs where payments can be started from the client without an API key exchange (Stripe publishable keys, Mollie profile IDs), the publishable identifier MAY be exposed in discovery. The reader MUST NOT use this to create Checkout Sessions directly against the PSP — that's the publisher's job — but MAY use it for PSP-specific client SDKs (e.g., Stripe.js for saved card display, Apple Pay availability checks).

## 8. Podcasting 2.0 Co-existence

An `om`-aware feed MAY also declare the `podcast:` namespace. When both are present, the following rules apply.

### 8.1 Mapping Table

| `podcast:` element | `om` equivalent | Co-existence rule |
|---|---|---|
| `podcast:funding` | `<om:signup>` plus `<om:offer>` | Both can be present; readers prefer `<om:offer>` when they can drive a checkout, fall back to `<om:signup>` otherwise |
| `podcast:locked` | `<om:access>members-only</om:access>` at channel level | `om` is finer-grained (item-level); `podcast:locked` is about feed portability, `om:access` is about content access. They answer different questions. |
| `podcast:license` | `<om:license>` (new in 0.3, see §8.3) | Copy both for maximum reader support. |
| `podcast:value` | `<om:value>` | See §8.2 |
| `podcast:valueRecipient` | `<om:recipient>` | Direct 1:1 mapping |
| `podcast:valueTimeSplit` | `<om:split>` | Direct 1:1 mapping |
| `podcast:guid` | use standard RSS `<guid>` | `om` does not redefine item identity |

### 8.2 Value-for-Value Co-existence

A podcast that wants to support *both* Lightning-native Podcasting 2.0 clients *and* `om`-aware readers with fiat fallback SHOULD declare both namespaces:

```xml
<rss version="2.0"
     xmlns:om="http://purl.org/rss/modules/membership/"
     xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <!-- Podcasting 2.0 native, Lightning-only -->
    <podcast:value type="lightning" method="keysend" suggested="0.00000005000">
      <podcast:valueRecipient name="Alice" type="node"
        address="02d5c1bf8b940dc9cad..." split="70" />
      <podcast:valueRecipient name="Bob" type="node"
        address="03a2f6c1abc..." split="30" />
    </podcast:value>

    <!-- om: multi-PSP, covers Lightning + fiat -->
    <om:value type="both" suggested="USD 1.00" unit="minute">
      <om:recipient psp="lightning" account="alice@getalby.com" split="70" name="Alice" />
      <om:recipient psp="lightning" account="bob@getalby.com" split="30" name="Bob" />
      <om:recipient psp="stripe" account="acct_alice" split="70" name="Alice" />
      <om:recipient psp="stripe" account="acct_bob" split="30" name="Bob" />
    </om:value>
  </channel>
</rss>
```

A Podcasting-2.0-only reader sees only the Lightning payment. An `om`-aware reader sees both and can offer the user a fiat-or-Lightning choice. No information is lost to either.

### 8.3 `<om:license>` (new in 0.3)

Direct parallel to `podcast:license`. Attributes: `url`, `identifier` (e.g., `cc-by-4.0`). Applicable at channel or item level. Does not affect entitlement logic; purely informational. Included here so a single-namespace `om` feed doesn't force publishers to pull in the `podcast:` namespace just for license info.

### 8.4 Why `om` Doesn't Just Extend `podcast:`

The `podcast:` namespace is governed by the Podcast Index team and scoped to podcasting. `om` applies equally to newsletters, blogs, and video feeds. Folding subscription semantics into a namespace that only podcast readers parse would lock out most of the audience. Parallel namespaces that cross-reference each other are the right structural choice; this is the same calculus that led RSS 2.0 to have separate `iTunes:` and `content:` namespaces.

## 9. PSP Binding Profiles (Normative)

A PSP binding profile defines exactly how a given PSP's objects map onto `om` primitives. A publisher that conforms to a profile MUST follow it. Readers that implement a profile MUST handle its specified fields correctly. New PSPs can be added without spec changes by publishing a new profile at `https://purl.org/rss/modules/membership/psp-profiles/{id}`.

### 9.1 Stripe Profile (`id="stripe"`)

- `<om:feature id>` MUST equal the Stripe `feature.lookup_key`.
- `<om:checkout psp="stripe" price_id="...">` — the `price_id` MUST be a Stripe Price ID.
- Publisher MUST process the following webhooks and update entitlements accordingly:
  - `entitlements.active_entitlement_summary.updated` (preferred if using Stripe Entitlements)
  - `customer.subscription.created`, `.updated`, `.deleted` (fallback)
  - `checkout.session.completed` (initial provisioning trigger)
- Publisher's access token (issued via `<om:tokenEndpoint>`) SHOULD include an `entitlements` JWT claim that is an array of Stripe feature lookup keys, matching the WorkOS + Stripe Entitlements convention.
- Publisher MAY delegate webhook-to-entitlement sync to an umbrella auth provider (WorkOS, Clerk, Auth0) that has native Stripe Entitlements integration. See Appendix A.

### 9.2 Mollie Profile (`id="mollie"`)

- `<om:checkout psp="mollie" plan_id="...">` — the `plan_id` MAY be a Mollie Subscription ID template or an opaque publisher-side identifier that maps to Mollie `customerId` + amount + interval.
- Because Mollie does not have a native entitlements API, the publisher derives entitlement from Subscription `status`:
  - `active` → entitlement granted
  - `pending`, `suspended` → entitlement paused (reader still shows signup prompt; content reverts to preview)
  - `canceled`, `completed` → entitlement revoked
- Publisher MUST process the Mollie payment webhook and, on each call, re-read the Subscription and (re-)derive entitlement state.
- Publisher SHOULD use Mollie's next-generation webhooks when available, subscribing to `subscription.*` events for earlier status change detection.

### 9.3 Lightning Profile (`id="lightning"`)

- `account` is a Lightning Address (`user@domain`) or LNURL.
- No subscription object; entitlement is per-payment and scoped per item.
- Reader MUST present `<om:value>` amounts in either the publisher-suggested unit or the user's preferred unit (configurable).
- For gated content via Lightning (rare but valid), the publisher operates an LNURL-pay endpoint that returns a short-lived access token in the payment's success_action. This is out of scope for the main spec; see Lightning Profile addendum.

### 9.4 PayPal Profile (`id="paypal"`)

- `<om:checkout psp="paypal" plan_id="...">` — `plan_id` is a PayPal Billing Plan ID.
- Publisher processes the `BILLING.SUBSCRIPTION.ACTIVATED`, `.CANCELLED`, `.EXPIRED`, and `PAYMENT.SALE.COMPLETED` webhooks.
- Entitlement derivation follows the Mollie pattern (subscription status → entitlement).

### 9.5 Adyen, Paddle, Chargebee, custom

Skeleton profile template included in the canonical repo at `psp-profiles/TEMPLATE.md`. New profiles are PRs, not spec revisions.

## 10. Reader Conformance Levels

Levels 1–4 from 0.2 unchanged. New in 0.3:

- **Level 5 (Commerce)** — supports `<om:offer>` checkout flow for at least one PSP profile, and evaluates `<om:feature>` claims from access tokens.
- **Level 6 (Value-for-Value)** — supports `<om:value>` for at least one PSP profile, including one-time tips and splits. Streaming and `<om:split>` time-based splits are RECOMMENDED but not required.

A reader that implements Levels 1–4 + 5 for Stripe is the pragmatic adoption target — it covers newsletter, blog, and non-Lightning podcast use cases. A reader that additionally implements Level 6 for Lightning achieves full Podcasting 2.0 parity.

## 11. Publisher Conformance (Extended)

0.2 rules apply, plus:

- If `<om:offer>` is declared, publisher MUST operate the checkout endpoint described in §7 and MUST handle at least one PSP profile's webhook events fully.
- If `<om:value>` is declared, publisher MUST have a valid receiving account for each declared recipient, and splits SHOULD sum to 100.
- If mixing `om` and `podcast:` value blocks (§8.2), the two MUST express the same intent — it is a conformance violation for a podcast feed to advertise a 70/30 split in `<podcast:value>` and a 50/50 split in `<om:value>`.

---

## Appendix A — Non-Normative: Stripe + WorkOS Reference Flow

This is the shortest path from "I have a publisher" to "entitlements flow end-to-end," using off-the-shelf pieces.

### A.1 Setup

1. Publisher creates Stripe products with feature lookup keys matching their `<om:feature id>` values. E.g., a Stripe feature with `lookup_key: "full-text"` maps to `<om:feature id="full-text">`.
2. Publisher attaches features to Stripe products.
3. Publisher connects their Stripe account to WorkOS via the WorkOS Stripe Entitlements integration.
4. Publisher configures AuthKit to include `entitlements` in the JWT.

### A.2 Runtime

1. Subscriber signs in via WorkOS → receives a JWT with `entitlements: ["full-text", "weekly-premium"]`.
2. Reader presents JWT as Bearer token when fetching `<om:unlock>` URLs.
3. Publisher's API validates JWT, checks for required feature lookup key in the `entitlements` claim, returns gated content or 403.
4. Subscriber upgrades or cancels → Stripe fires `entitlements.active_entitlement_summary.updated` → WorkOS updates session → next JWT refresh carries new claims.

Total code written by publisher: the checkout endpoint (~40 lines), the content-gate check (~5 lines per route). Everything else is configuration.

### A.3 Mapping Summary

| `om` element | Stripe object | WorkOS primitive |
|---|---|---|
| `<om:feature id="X">` | Feature with `lookup_key: "X"` | String in `entitlements` JWT claim |
| `<om:tier>` | Product with attached features | Role (optional) |
| `<om:offer>` `<om:checkout psp="stripe" price_id="Y">` | Price `Y` | — (not represented in WorkOS) |
| `<om:group kind="company">` | Customer with metadata, or Connect account | Organization |
| Checkout success webhook | `checkout.session.completed` → `customer.subscription.created` | Organization gets active subscription; entitlements sync |
| Cancellation | `customer.subscription.deleted` | Entitlements claim shrinks in next token |

## Appendix B — Non-Normative: Mollie Reference Flow (EU Publishers)

For EU publishers serving primarily iDEAL, SEPA, Bancontact:

1. Publisher creates Mollie customers on signup (Mollie requires a customer object for recurring).
2. Publisher's checkout endpoint creates the first payment with `sequenceType: "first"` to establish the mandate, then creates a subscription on the customer.
3. Publisher subscribes to Mollie webhooks. On each payment webhook, the publisher re-reads the subscription and updates its internal entitlement store.
4. Publisher's access token endpoint issues JWTs with `entitlements` derived from subscription status (`active` → features included, anything else → features excluded).

Because Mollie doesn't have a feature-level API, the publisher's internal mapping table (subscription plan_id → feature set) is authoritative. This mapping is published in the discovery document under `payments.offers_catalog` for reader introspection.

## Appendix C — Non-Normative: Lightning + Stripe Hybrid

A podcast that wants Lightning-native support for modern podcast apps AND fiat subscriptions for everyone else:

```xml
<om:psp id="stripe" account="acct_1Pxyz..." />
<om:psp id="lightning" account="show@getalby.com" />

<om:tier id="paid" price="USD 5.00" period="monthly">Paid tier</om:tier>
<om:feature id="ad-free">Ad-free audio</om:feature>
<om:feature id="bonus-episodes">Bonus episodes</om:feature>

<om:offer id="paid-monthly" tier="paid">
  <om:price amount="5.00" currency="USD" period="P1M" />
  <om:checkout psp="stripe" price_id="price_1Paid..." />
</om:offer>

<om:value type="both" suggested="sats 100" unit="minute">
  <om:recipient psp="lightning" account="show@getalby.com" split="100" />
</om:value>
```

Listener on Fountain (Lightning-native): sees `<om:value>` or the parallel `<podcast:value>`, streams sats.
Listener on a hypothetical `om`-aware reader: sees both `<om:offer>` and `<om:value>`, can subscribe via Stripe OR tip via Lightning.
Listener on Apple Podcasts: sees neither; falls back to `podcast:funding` if declared for a signup link to the publisher's web page.

All three listeners are served from the same feed.

## Appendix D — Non-Normative: Family Plans With Stripe

Family plans use publisher-managed groups (0.2 §8.1) with per-seat provisioning:

1. Parent subscribes to `<om:offer id="family-monthly" group="household">`.
2. Publisher's checkout creates a Stripe subscription to a `family` Product.
3. Stripe feature `household-seats` (quantity: 6) is attached to that Product.
4. Parent receives a 6-use invite link. Each invite consumes one seat.
5. Seat consumption is tracked in publisher-side state; Stripe's role is to know the subscription is active and how many seats are licensed.
6. Each family member's JWT carries `entitlements: [...]` AND `group: {id: "household", parent: "cus_..."}`.
7. When the parent cancels, Stripe fires `customer.subscription.deleted`; publisher revokes all 6 seats simultaneously.

## Open Questions for 0.4

- **Refunds and chargebacks.** How should a refund affect content the subscriber already downloaded during the paid window?
- **Gift subscriptions via PSP.** Stripe supports "gift card" products but not gift subscriptions natively. The protocol layer can fix this; the spec should say how.
- **Proration on tier changes.** Stripe handles this natively; Mollie requires explicit proration logic. The reader probably shouldn't care, but the offer catalog may need to declare the proration policy.
- **Cross-publisher bundles, revisited.** A single Stripe Checkout Session can't subscribe to items in three different Stripe accounts. A bundle probably requires an aggregator (another publisher who resells). Needs a worked example.
- **Privacy and payment-method linkability.** A reader that presents the same email to five publishers creates a trackable identity. The long-term fix is SD-JWT + pseudonymous accounts per publisher, but that breaks Stripe's fraud tooling. Trade-off needs to be named explicitly.

## Acknowledgements

0.3 builds on Stripe's Entitlements team (quietly shipped in 2024 and now core to the B2B billing stack), Mollie's Subscriptions and next-gen webhooks team, the Podcast Index team (whose `podcast:value`, `podcast:valueRecipient`, and `podcast:valueTimeSplit` primitives are directly mirrored here), and the WorkOS Entitlements integration (which proved the JWT-claims-from-PSP pattern in production).
