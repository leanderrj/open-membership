# Open Membership Syndication Mappings 1.0

**A non-normative companion to Open Membership RSS 0.4, defining how every `om` element in the RSS 2.0 serialization maps onto Atom 1.0 (RFC 4287) and JSON Feed 1.1.**

- **This version:** 1.0 (draft, 2026-04-24)
- **Companion to:** Open Membership RSS 0.4 (`SPEC.md`)
- **Namespace URI:** `http://purl.org/rss/modules/membership/` (unchanged)
- **Suggested prefix:** `om` (unchanged)
- **Status:** Non-normative. This document does not alter any semantics defined in `SPEC.md`. It describes how the same `om` semantics are carried in two additional syndication substrates. Where this document and `SPEC.md` appear to disagree, `SPEC.md` wins.

This document fulfils the Atom + JSON Feed row of the ROADMAP Phase 3 M9 deliverable. It does not define new features, new conformance levels, or new test categories beyond those already specified for RSS 2.0.

---

## 1. Why this exists

`SPEC.md` defines the `om` namespace as two serializations: RSS 2.0 and RSS 1.0/RDF. In practice a large share of syndication feeds on the open web today are emitted as Atom 1.0 or JSON Feed 1.1:

- **Atom 1.0** is the default of most static-site generators written in Go, Rust, or Haskell (Hugo, Zola, Hakyll); it is also what W3C-orbit CMSes emit by default. Atom was designed as the successor to RSS and solved several categories of RSS 2.0 ambiguity that have since been patched over with extensions.
- **JSON Feed 1.1** is the default of most modern JavaScript toolchains and is the natural shape for static-JSON-plus-edge-worker deployments (Eleventy, Astro, Cloudflare Pages), which is the same substrate the Phase 4 M11 static-site reference targets.

Without a canonical mapping, each platform reinvents an ad-hoc bridge. Each bridge is a subtle source of divergence from `SPEC.md` intent, and the fragmentation compounds. This document is the canonical mapping, so that:

1. A publisher emitting Atom or JSON Feed can claim the same `om` conformance level as an RSS 2.0 publisher, without implementation-specific interpretation.
2. A reader parsing Atom or JSON Feed can apply the same `SPEC.md` rules without per-format adaptation beyond what this document covers.
3. The M9 test suite can run identical fixture sets across RSS 2.0, Atom, and JSON Feed, and report identical conformance outcomes.

---

## 2. Atom 1.0 mapping

### 2.1 Namespace declaration

The `om` namespace is attached to the Atom `<feed>` root element using the standard XML namespace mechanism. Atom permits foreign-namespace extension elements as "foreign markup" under RFC 4287 §6, and `om` qualifies as Structured Extension Elements under RFC 4287 §6.4.2.

```xml
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:om="http://purl.org/rss/modules/membership/">
  ...
</feed>
```

The namespace URI is the same one used in the RSS 2.0 binding (`SPEC.md` §0). Readers MUST treat an `om:` element in an Atom feed as semantically identical to the same element in an RSS 2.0 feed.

### 2.2 Channel-level element mapping (RSS 2.0 `<channel>` → Atom `<feed>`)

Every channel-level `om` element listed in `SPEC.md` appears as a direct child of `<feed>`, with attributes and child-element structure preserved verbatim. Per RFC 4287 §6.3, an Atom processor that does not understand `om` markup MUST NOT change its behavior as a result of the markup's presence, exactly the compatibility guarantee `SPEC.md` relies on in its RSS 2.0 binding.

| `om` element (RSS 2.0) | Atom placement | Shape notes |
|---|---|---|
| `<om:provider>` | Child of `<feed>` | Element text is the provider URI. Unchanged from `SPEC.md` §0.2. |
| `<om:discovery>` | Child of `<feed>` | Element text is the `.well-known/open-membership` URL. Unchanged. |
| `<om:authMethod>` | Child of `<feed>` | Element text is one of `url-token`, `http-basic`, `bearer`, `dpop`, `vc-presentation`. Unchanged. |
| `<om:tokenEndpoint>` | Child of `<feed>` | Element text is the token endpoint URL. Unchanged. |
| `<om:tier>` | Child of `<feed>` | All attributes and child text preserved. Unchanged. |
| `<om:feature>` | Child of `<feed>` | All attributes preserved. Unchanged. |
| `<om:psp>` | Child of `<feed>` | All attributes preserved. Unchanged. |
| `<om:offer>` | Child of `<feed>` | Nested `<om:price>`, `<om:checkout>`, `<om:proration>`, `<om:trial>` preserved. Unchanged. |
| `<om:revocation>` | Child of `<feed>` | `policy` and `grace_hours` attributes preserved. Unchanged. |
| `<om:privacy>` | Child of `<feed>` | Element text is one of `standard`, `pseudonymous`, `pseudonymous-required`. Unchanged. |
| `<om:bundle>` | Child of `<feed>` | Aggregator-only. Nested `<om:tier>`, `<om:offer>` preserved. Unchanged. |
| `<om:bundled-from>` | Child of `<feed>` | Nested `<om:trust>` preserved. Unchanged. |
| `<om:gift>` | Child of `<feed>` | All attributes preserved. Unchanged. |
| `<om:license>` | Child of `<feed>` | Element text is a CC-compatible license URL. Note: Atom also has `<atom:rights>` (RFC 4287 §4.2.10). `<om:license>` is the machine-readable licence identifier; `<atom:rights>` remains the human-readable rights statement. The two coexist. |
| `<om:window>` | Child of `<feed>` when applied to the whole feed | Attributes preserved. See also §5.3 for entry-level windows. |
| `<om:group>` | Child of `<feed>` | All attributes preserved. Unchanged. |
| `<om:value>` | Child of `<feed>` | Nested `<om:recipient>` and `<om:split>` preserved. Unchanged. |
| `<om:recipient>` | Child of `<om:value>` | Unchanged. |
| `<om:split>` | Child of `<om:value>` | Unchanged. |

### 2.3 Entry-level element mapping (RSS 2.0 `<item>` → Atom `<entry>`)

| `om` element (RSS 2.0) | Atom placement | Shape notes |
|---|---|---|
| `<om:access>` | Child of `<entry>` | Unchanged. Values: `open`, `preview`, `locked`, `members-only`. |
| `<om:preview>` | Child of `<entry>` | See §2.4.1, interacts with `<atom:summary>` and `<atom:content>`. |
| `<om:unlock>` | Child of `<entry>` | Unchanged. |
| `<om:receipt>` | Child of `<entry>` | Unchanged. |
| `<om:window>` | Child of `<entry>` | Entry-level time window. See §5.3. |
| `<om:includes>` | Child of `<entry>` | Feature-to-tier mapping. Unchanged. |
| `<om:trial>` | Child of `<entry>` or child of `<om:offer>` | Unchanged from `SPEC.md`. |

### 2.4 Element-by-element adaptation notes

This section captures the places where Atom's structural shape differs enough from RSS 2.0 to require a specific note. Anything not listed is a verbatim carryover.

#### 2.4.1 `<om:preview>` and Atom's summary/content distinction

RSS 2.0 has a single `<description>` element that pulls double duty for summary and body; Atom separates `<atom:summary>` (RFC 4287 §4.2.13) and `<atom:content>` (RFC 4287 §4.1.3). This split is helpful for `om`:

- The publisher-curated preview goes inside `<om:preview>`, exactly as in the RSS 2.0 binding.
- `<atom:summary>` SHOULD carry the same preview text, so a non-`om`-aware Atom reader still shows a preview rather than nothing.
- `<atom:content>` carries the full body. For an entry with `<om:access>locked</om:access>`, a publisher has two valid strategies:
  - **Omit** `<atom:content>` entirely and rely on `<om:unlock>` for authorized retrieval. This is the cleaner shape and the default recommendation.
  - **Include** `<atom:content>` only if the feed URL itself is token-gated (Level 2 URL-token auth) and the token authorizes this entry. A token-gated feed that includes full content inline is equivalent to the RSS 2.0 approach of serving the full `<description>` via a tokenized feed URL.

#### 2.4.2 Enclosures and `<link rel="enclosure">`

RSS 2.0 uses `<enclosure url="..." length="..." type="..."/>`. Atom has no `<enclosure>` element; the equivalent is `<atom:link rel="enclosure" href="..." length="..." type="..."/>` (RFC 4287 §4.2.7.2).

`om`'s enclosure-auth passthrough (where a URL token or bearer token carries from the feed to the enclosure fetch) is format-independent: the `href` of the Atom enclosure link MUST be constructed exactly as the RSS 2.0 `<enclosure url="...">` would have been. The same token mechanics apply.

A reader parsing an Atom feed MUST treat `<link rel="enclosure">` as equivalent to an RSS 2.0 `<enclosure>` for the purposes of every `om` section that references enclosures.

#### 2.4.3 `<atom:id>` is mandatory; `<guid>` is not

Every Atom entry MUST have an `<atom:id>` (RFC 4287 §4.2.6). RSS 2.0 `<guid>` is technically optional, though most `om`-compliant feeds include it. A publisher converting an RSS 2.0 feed to Atom MUST synthesize an `<atom:id>` if the source had no `<guid>`; the canonical synthesis rule is `tag:<host>,<date>:<path>` (RFC 4151) or a stable URL. See §7.1 for the analogous JSON Feed rule.

#### 2.4.4 `<om:provider>` vs. `<atom:author>` and `<atom:contributor>`

Atom has its own author model (RFC 4287 §4.2.1, §4.2.3). `<om:provider>` is not an author; it is the identity of the publishing organization for the purposes of `om` trust and discovery. The two are independent. A publisher MUST still populate `<atom:author>` or `<atom:contributor>` if they want conventional author display in non-`om` readers; `<om:provider>` does not substitute for it.

#### 2.4.5 `<atom:updated>` vs. `<om:window>`

Atom requires `<atom:updated>` on every entry and feed (RFC 4287 §4.2.15). This is an editorial-state timestamp, not an access-state timestamp. `<om:window>` is the access-state mechanism and is evaluated against server-side clock time regardless of what `<atom:updated>` says. See §7.3.

### 2.5 Worked example: investigative journalism publisher in Atom

The same publisher as `SPEC.md` Appendix A, re-expressed as Atom 1.0. All `om` semantics are identical; only the syndication envelope changes.

```xml
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:om="http://purl.org/rss/modules/membership/">
  <title>Underreported</title>
  <link href="https://underreported.example/"/>
  <link rel="self" href="https://underreported.example/feed.xml"/>
  <id>https://underreported.example/</id>
  <updated>2026-04-23T10:00:00Z</updated>

  <om:provider>https://underreported.example</om:provider>
  <om:discovery>https://underreported.example/.well-known/open-membership</om:discovery>

  <om:authMethod>vc-presentation</om:authMethod>
  <om:privacy>pseudonymous-required</om:privacy>
  <om:revocation policy="prospective-only" grace_hours="168"/>

  <om:psp id="stripe" account="acct_..."/>
  <om:tier id="paid" price="USD 12.00" period="monthly">Supporter</om:tier>
  <om:feature id="long-form">Long-form investigations</om:feature>

  <om:offer id="supporter-monthly" tier="paid">
    <om:price amount="12.00" currency="USD" period="P1M"/>
    <om:checkout psp="stripe" price_id="price_supporter_..."/>
  </om:offer>

  <entry>
    <title>The case we can't name yet</title>
    <id>tag:underreported.example,2026-04-20:/investigations/case-42</id>
    <updated>2026-04-20T14:30:00Z</updated>
    <link href="https://underreported.example/investigations/case-42"/>
    <summary>An investigation into the unnamed regulator. Paid supporters read the full piece.</summary>
    <om:access>locked</om:access>
    <om:preview>An investigation into the unnamed regulator. Paid supporters read the full piece.</om:preview>
    <om:unlock>https://underreported.example/unlock/case-42</om:unlock>
  </entry>
</feed>
```

The semantic payload, pseudonymous-required, vc-presentation, prospective-only revocation, a single paid tier, a single locked entry with preview, is the same as `SPEC.md` Appendix A. A Level 1 Atom reader that does not speak `om` still sees a title, a summary, and a link, and does not break.

---

## 3. JSON Feed 1.1 mapping

### 3.1 The `_om` extension object

JSON Feed's extension convention is a top-level or per-item key prefixed with an underscore (`_<namespace>`), whose value is an arbitrary JSON object. `om` uses the key `_om`.

- At the feed level, `_om` is a sibling of JSON Feed's `version`, `title`, `items`, etc.
- At the item level, `_om` is a key inside each object in the `items[]` array.

A JSON Feed parser that does not understand `om` MUST ignore the `_om` key and continue, per the JSON Feed spec's extension rules. This is the same compatibility guarantee the RSS 2.0 and Atom bindings rely on.

### 3.2 Feed-level shape

Every channel-level `om` element in `SPEC.md` becomes a key inside the top-level `_om` object. Attribute values on XML elements become JSON object keys; repeated elements become JSON arrays; leaf text content becomes the value associated with the conventional key (`value` for a single-value element, or the semantically-appropriate key when one exists).

| RSS 2.0 / Atom element | JSON Feed key | Value shape |
|---|---|---|
| `<om:provider>` | `_om.provider` | String (provider URI) |
| `<om:discovery>` | `_om.discovery` | String (discovery URL) |
| `<om:authMethod>` | `_om.auth_methods` | Array of strings (allows multiple) |
| `<om:tokenEndpoint>` | `_om.token_endpoint` | String (URL) |
| `<om:tier>` | `_om.tiers` | Array of objects: `{id, price, period, label}` |
| `<om:feature>` | `_om.features` | Array of objects: `{id, label}` |
| `<om:psp>` | `_om.psps` | Array of objects: `{id, account, ...}` |
| `<om:offer>` | `_om.offers` | Array of objects: `{id, tier, price:{...}, checkout:{...}, proration, trial}` |
| `<om:revocation>` | `_om.revocation` | Object: `{policy, grace_hours}` |
| `<om:privacy>` | `_om.privacy` | String enum |
| `<om:bundle>` | `_om.bundles` | Array of objects: `{id, audience:[...], tiers:[...], offers:[...]}` |
| `<om:bundled-from>` | `_om.bundled_from` | Array of objects: `{provider, trust:{did, jwks_uri}}` |
| `<om:gift>` | `_om.gifts` | Array of objects: `{offer, redeemable_via, transferable}` |
| `<om:license>` | `_om.license` | String (license URL) |
| `<om:window>` | `_om.window` | Object: `{start, end, kind, tier?}` |
| `<om:group>` | `_om.groups` | Array of objects: `{id, admin, scim_endpoint?}` |
| `<om:value>` | `_om.value` | Object: `{method, recipients:[...], splits:[...]}` |

### 3.3 Item-level shape

Each object in `items[]` MAY contain an `_om` key whose value maps the entry-level elements:

| RSS 2.0 / Atom entry element | JSON Feed item key | Value shape |
|---|---|---|
| `<om:access>` | `items[].​_om.access` | String enum: `open`, `preview`, `locked`, `members-only` |
| `<om:preview>` | `items[].​_om.preview` | String (HTML or plain text per publisher convention) |
| `<om:unlock>` | `items[].​_om.unlock` | String (URL) |
| `<om:receipt>` | `items[].​_om.receipt` | Object or string per `SPEC.md` receipt profile |
| `<om:window>` | `items[].​_om.window` | Object: `{start, end, kind, tier?}` |
| `<om:includes>` | `items[].​_om.includes` | Array of feature IDs |
| `<om:trial>` | `items[].​_om.trial` | Object per `SPEC.md` trial shape |

### 3.4 Data-type conventions

JSON removes a lot of XML's ambiguity but introduces some of its own. The following conventions apply throughout the `_om` extension. They are not new semantics; they spell out how the existing RSS 2.0 semantics survive a JSON round-trip.

- **Booleans.** XML attributes carry string values like `"true"` / `"false"`; JSON uses native `true` / `false`. An importer MUST accept both. A producer SHOULD emit native JSON booleans. This applies to attributes such as `transferable` on `<om:gift>`.
- **ISO-8601 timestamps.** Every time value (`<om:window start="...">`, credential `validFrom`, etc.) is an RFC 3339 / ISO-8601 string. JSON has no native date type; the value stays as a string.
- **ISO 4217 currencies.** Currency codes stay as three-letter strings. Amounts are numeric JSON values when expressed via `<om:price>`, but the free-form `price` attribute on `<om:tier>` (which carries `"USD 12.00"` as a single string in the RSS 2.0 binding) stays as a single string in JSON too, for round-trip fidelity. Parsers MUST accept either the structured `{amount, currency}` form or the combined string form when reading a `tier`.
- **ISO 8601 durations.** `period="P1M"` stays as the string `"P1M"`. No JSON-native duration type exists; do not invent one.
- **Identifiers.** All `id` attributes become string keys in JSON. Uniqueness rules from `SPEC.md` apply identically.
- **Repeated elements.** Any element that is allowed to appear more than once in the RSS 2.0 binding (`<om:tier>`, `<om:feature>`, `<om:psp>`, `<om:offer>`, `<om:gift>`, `<om:bundle>`, `<om:bundled-from>`, `<om:group>`, `<om:authMethod>`) becomes a JSON array, even when only one instance is present. This keeps parser code uniform.
- **Single-instance elements.** Elements that are semantically singular in `SPEC.md` (`<om:provider>`, `<om:discovery>`, `<om:tokenEndpoint>`, `<om:revocation>`, `<om:privacy>`, `<om:license>`, `<om:value>`, `<om:window>` at feed scope) become scalar values or single objects, not arrays.

### 3.5 Worked example: investigative journalism publisher as JSON Feed

The same publisher as §2.5 and `SPEC.md` Appendix A, as a JSON Feed 1.1 document.

```json
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "Underreported",
  "home_page_url": "https://underreported.example/",
  "feed_url": "https://underreported.example/feed.json",
  "_om": {
    "provider": "https://underreported.example",
    "discovery": "https://underreported.example/.well-known/open-membership",
    "auth_methods": ["vc-presentation"],
    "privacy": "pseudonymous-required",
    "revocation": {
      "policy": "prospective-only",
      "grace_hours": 168
    },
    "psps": [
      { "id": "stripe", "account": "acct_..." }
    ],
    "tiers": [
      { "id": "paid", "price": "USD 12.00", "period": "monthly", "label": "Supporter" }
    ],
    "features": [
      { "id": "long-form", "label": "Long-form investigations" }
    ],
    "offers": [
      {
        "id": "supporter-monthly",
        "tier": "paid",
        "price": { "amount": "12.00", "currency": "USD", "period": "P1M" },
        "checkout": { "psp": "stripe", "price_id": "price_supporter_..." }
      }
    ]
  },
  "items": [
    {
      "id": "https://underreported.example/investigations/case-42",
      "url": "https://underreported.example/investigations/case-42",
      "title": "The case we can't name yet",
      "date_published": "2026-04-20T14:30:00Z",
      "summary": "An investigation into the unnamed regulator. Paid supporters read the full piece.",
      "_om": {
        "access": "locked",
        "preview": "An investigation into the unnamed regulator. Paid supporters read the full piece.",
        "unlock": "https://underreported.example/unlock/case-42"
      }
    }
  ]
}
```

A JSON Feed reader that does not speak `om` sees a normal feed with a single preview-length summary, and links out to the article page. An `om`-aware reader reads the `_om` block and applies the same access-control logic it would apply to the RSS 2.0 or Atom form.

---

## 4. Discovery document

The `.well-known/open-membership` document defined in `SPEC.md` §9 is format-agnostic JSON and is **unchanged** by this mapping. A publisher who serves Atom or JSON Feed instead of RSS 2.0 serves the identical discovery document at the identical well-known URL.

Implementers MUST NOT introduce format-specific variants of the discovery document (e.g., a `discovery.atom` or `.well-known/open-membership.json-feed`). The discovery document is the single source of truth about the publisher's conformance and is resolved independently of which syndication format the feed uses.

---

## 5. Validation

The M9 `om-test-suite` runs identical conformance checks across all three formats. A feed claiming Level N conformance under `SPEC.md` passes the same set of Level-N tests regardless of whether it is serialized as RSS 2.0, Atom 1.0, or JSON Feed 1.1.

The suite's `fixtures/atom/` and `fixtures/json-feed/` directories contain the same fixture set as `fixtures/level-1/` through `fixtures/level-5/`, re-expressed in the target format. A passing implementation reports the same pass/skip/fail outcomes per check across all three format runs.

Format-specific checks, in addition to the shared conformance set:

### 5.1 Atom-specific checks

- The `xmlns:om` declaration is present on `<feed>` or an ancestor.
- Every `<entry>` has a well-formed `<atom:id>` (RFC 4287 §4.2.6).
- `<atom:summary>` is present when `<om:access>` is `locked`, `preview`, or `members-only`, so a non-`om` reader still displays something meaningful.
- When `<om:access>` is `locked`, either `<atom:content>` is absent or the feed URL is token-authorized.
- Enclosures are expressed as `<atom:link rel="enclosure">`, not as a foreign `<enclosure>` element.

### 5.2 JSON Feed-specific checks

- The feed `version` is `"https://jsonfeed.org/version/1.1"` (1.1 is the minimum; 1.0 feeds are rejected because they lack `authors[]` and a few fields the `om` mapping depends on).
- `_om` keys on the feed and on items parse as valid objects.
- Every `items[]` entry has an `id`, JSON Feed makes `id` mandatory, but the check enforces it explicitly because `om` entitlement keying depends on it.
- Booleans in `_om` are native JSON `true` / `false`, not strings.
- Currency codes match ISO 4217; timestamps match RFC 3339.

### 5.3 What the suite does NOT do per-format

The suite does not verify Atom schema conformance beyond what `om` depends on (use an RFC 4287 validator for that). It does not verify that a JSON Feed is fully valid JSON Feed 1.1 beyond what `om` depends on (use a JSON Feed validator). The split is deliberate: `om` conformance is narrow, format conformance is someone else's concern.

---

## 6. Edge cases and known gotchas

The following are places where the mapping is non-obvious enough that naming them saves an implementer a day of debugging.

### 6.1 Atom requires an `<atom:id>` on every entry; `om` doesn't speak to entry identity at all

`SPEC.md` is silent on entry identity; the RSS 2.0 `<guid>` happens to serve that role there. An Atom feed MUST carry an `<atom:id>` on every `<entry>` regardless of `om` (RFC 4287 §4.2.6), and a JSON Feed MUST carry an `id` on every item. When converting between formats, synthesize missing identifiers using RFC 4151 tag URIs or a stable URL; never reuse a URL that could change.

### 6.2 JSON Feed has no sparse-update signal

RSS 2.0 and Atom both allow a feed that includes "we updated this item, please re-fetch" signals (via `<pubDate>` / `<atom:updated>` changes). JSON Feed 1.1 does not carry an analogue. An `om` reader that needs to detect access-state changes (e.g., a `<om:window>` that just expired) MUST poll the feed on a cadence rather than relying on per-item update timestamps alone. This is already implicit in `SPEC.md` §3 time-windowed access; naming it here prevents a JSON Feed implementer from assuming the problem is solved by the format.

### 6.3 `<om:window start="...">` vs. `<atom:updated>`

Atom requires `<atom:updated>` on every entry and feed. This is an editorial-state timestamp (RFC 4287 §4.2.15), not an access-state timestamp. A publisher MUST NOT conflate `<om:window start="...">` (when does this entry become accessible) with `<atom:updated>` (when did we last edit this). If a reader sees both, the entitlement evaluation uses `<om:window>`; display ordering uses `<atom:updated>`.

### 6.4 Both `<enclosure>` and `<media:content>` in the same item

If a source RSS 2.0 feed includes both an RSS 2.0 `<enclosure>` and a `<media:content>` (Yahoo Media RSS) element referring to the same media object, the Atom conversion MUST emit a single `<atom:link rel="enclosure">`, one per distinct media URL, and MAY additionally retain `<media:content>` as foreign markup inside the `<entry>` for compatibility with media-RSS-aware readers. The `om` token passthrough rule applies to the enclosure URL only; if the `<media:content>` URL differs, the publisher MUST re-apply the token there too. The JSON Feed form expresses the same media object as a single entry in `attachments[]` with the bearer-token URL.

### 6.5 `<om:license>` vs. `<atom:rights>`

`<atom:rights>` (RFC 4287 §4.2.10) is a human-readable rights statement. `<om:license>` is a machine-readable license identifier (typically a Creative Commons URL). They are not alternatives; a publisher MAY populate both. An `om`-aware reader MUST use `<om:license>` for license-dependent logic (automatic attribution blocks, republication indicators), not `<atom:rights>`.

### 6.6 JSON Feed's `authors[]` vs. the `om:provider` identity

JSON Feed 1.1 deprecated `author` in favor of `authors[]` at both the feed and item level. The plural shape is for editorial authorship. `_om.provider` is the organization identity for `om` trust purposes; it is not an author. A producer SHOULD NOT duplicate `_om.provider` into `authors[]`, and SHOULD NOT infer `_om.provider` from `authors[]` when converting from another format.

### 6.7 Atom entries vs. JSON Feed items, ordering is not normative in either

Neither Atom nor JSON Feed makes entry/item ordering a protocol guarantee. Any `om` logic that depends on ordering (for example, finding the most recent item whose `<om:window>` is currently open) MUST sort by timestamp, not by feed position.

### 6.8 Foreign markup inside `<atom:content>` is not guaranteed to be preserved

Per RFC 4287 §6.3 last paragraph: foreign markup inside a Text Construct or `<atom:content>` element MAY be stripped by an Atom processor. `om` elements therefore MUST appear as direct children of `<feed>` or `<entry>`, never nested inside `<atom:content>`. The worked example in §2.5 follows this rule; mappings from other formats MUST preserve it.

---

## 7. IANA considerations

This document registers no new media types, URI schemes, or well-known URIs. The relevant existing registrations are:

- `application/atom+xml`, Atom 1.0 feeds and entry documents (RFC 4287 §7).
- `application/feed+json`, JSON Feed 1.1 feeds.
- `application/rss+xml`, RSS 2.0 feeds (the original `SPEC.md` binding).
- `.well-known/open-membership`, the discovery document, registered as part of `SPEC.md` §9 and unchanged here.

The `om` namespace URI (`http://purl.org/rss/modules/membership/`) is the single identifier for the vocabulary in all three formats.

---

## 8. Relationship to SPEC.md and versioning

This document is a **lens**, not a spec. It does not override any statement in `SPEC.md`. A conflict between this document and `SPEC.md` is a bug in this document.

Versioning is independent: this document's 1.0 maps to `SPEC.md` 0.4. Future revisions of `SPEC.md` that add new elements may require a corresponding revision here; there is no automatic guarantee that this document moves in lockstep with the spec. A publisher emitting Atom or JSON Feed with `om` markup SHOULD cite the Syndication Mappings version they targeted alongside the `om` version in their discovery document, for traceability.

---

## 9. Acknowledgements

This mapping draws on the RFC 4287 Atom specification (Nottingham, Sayre, 2005), the JSON Feed 1.1 specification (Simmons, Reece), and the prior art of how Podcasting 2.0 and Dublin Core handle cross-format compatibility. None of those projects endorse this document; the mapping decisions are the responsibility of the `om` working group.
