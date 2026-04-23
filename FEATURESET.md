# Open Membership RSS — Featureset Reference

The authoritative feature inventory across all spec versions. This is the reference every implementer and reviewer starts from.

## Feature taxonomy

Features organize into seven categories. Every element in the spec fits exactly one.

1. **Foundational** — namespace, identity, authentication
2. **Access control** — tiers, features, per-item policy
3. **Temporal** — time-windowed access, proration
4. **Group** — families, companies, institutions
5. **Commercial** — payments, value-for-value, offers
6. **Identity & privacy** — credentials, pseudonymity, selective disclosure
7. **Lifecycle & governance** — discovery, revocation, bundles, gifts

## Complete feature matrix

| Feature | Category | Introduced | Conformance level | Element(s) |
|---|---|---|---|---|
| Namespace declaration | Foundational | 0.1 | 1 | `xmlns:om` |
| Provider identification | Foundational | 0.1 | 1 | `<om:provider>` |
| URL token auth | Foundational | 0.1 | 2 | `<om:authMethod>url-token</om:authMethod>` |
| HTTP Basic auth | Foundational | 0.1 | 2 | `<om:authMethod>http-basic</om:authMethod>` |
| OAuth Bearer auth | Foundational | 0.1 | 3 | `<om:authMethod>bearer</om:authMethod>` |
| DPoP token binding | Foundational | 0.1 | 3 | `<om:authMethod>dpop</om:authMethod>` |
| VC presentation auth | Foundational | 0.2 | 4 | `<om:authMethod>vc-presentation</om:authMethod>` |
| Tier declarations | Access control | 0.1 | 1 | `<om:tier>` |
| Per-item access policy | Access control | 0.1 | 1 | `<om:access>` |
| Preview content | Access control | 0.1 | 1 | `<om:preview>` |
| Unlock endpoint | Access control | 0.1 | 2 | `<om:unlock>` |
| Receipt proof | Access control | 0.1 | 5 | `<om:receipt>` |
| Feature-level entitlements | Access control | 0.3 | 5 | `<om:feature>` |
| Feature-to-tier mapping | Access control | 0.3 | 5 | `<om:includes>` |
| Time-gated access | Temporal | 0.2 | 3 | `<om:window>` |
| Proration policy | Temporal | 0.4 | 5 | `<om:proration>` |
| Publisher-managed groups | Group | 0.2 | 2 | `<om:group admin="publisher-managed">` |
| Self-managed groups (SCIM) | Group | 0.2 | 3 | `<om:group admin="self-managed">` |
| Group-scoped access | Group | 0.2 | 2 | `<om:access scope="group">` |
| PSP declarations | Commercial | 0.3 | 5 | `<om:psp>` |
| Offer declarations | Commercial | 0.3 | 5 | `<om:offer>` |
| Price specifications | Commercial | 0.3 | 5 | `<om:price>` |
| Checkout endpoints | Commercial | 0.3 | 5 | `<om:checkout>` |
| Trial periods | Commercial | 0.3 | 5 | `<om:trial>` |
| Value-for-value | Commercial | 0.3 | 6 | `<om:value>` |
| Value recipients | Commercial | 0.3 | 6 | `<om:recipient>` |
| Time-split values | Commercial | 0.3 | 6 | `<om:split>` |
| OM-VC 1.0 profile | Identity & privacy | 0.2 | 4 | (credential format) |
| OM-VC-SD 1.0 profile | Identity & privacy | 0.4 | 7 | (credential format) |
| Pseudonymous mode | Identity & privacy | 0.4 | 7 | `<om:privacy>` |
| Per-publisher pseudonyms | Identity & privacy | 0.4 | 7 | (BBS+ feature) |
| Canonical discovery | Lifecycle & governance | 0.2 | 1 | `.well-known/open-membership` |
| Discovery linkage | Lifecycle & governance | 0.2 | 1 | `<om:discovery>` |
| Token endpoint | Lifecycle & governance | 0.2 | 3 | `<om:tokenEndpoint>` |
| Revocation policy | Lifecycle & governance | 0.4 | 5 | `<om:revocation>` |
| Bundle aggregation | Lifecycle & governance | 0.4 | 8 | `<om:bundle>` |
| Bundle participation | Lifecycle & governance | 0.4 | 8 | `<om:bundled-from>` |
| Bundle trust declaration | Lifecycle & governance | 0.4 | 8 | `<om:trust>` |
| Gift subscriptions | Lifecycle & governance | 0.4 | 5 | `<om:gift>` |
| Licensing (CC-compatible) | Lifecycle & governance | 0.3 | 1 | `<om:license>` |

## Conformance levels

Features are grouped into conformance levels. Implementers state which levels they support; each level is cumulative (Level N implies Levels 1 through N-1).

### Level 1 — Parsing

The bare minimum. An RSS reader at this level:
- Parses the `om` namespace without errors
- Reads `<om:provider>`, `<om:tier>`, `<om:access>`, `<om:preview>` elements
- Displays preview content for non-open items
- Shows signup URL when present
- Continues to work on non-`om` feeds unchanged

**Implementer effort:** one afternoon.

### Level 2 — URL token auth + unlocks

Adds:
- Persisting per-feed URL tokens
- Following `<om:unlock>` endpoints with stored tokens
- Substituting unlocked content for preview when entitlement is verified
- Handling group-scoped access (`scope="group"`) at minimum via server-side entitlements

**Implementer effort:** ~1 week.

### Level 3 — OAuth Bearer + time windows + SCIM groups

Adds:
- Bearer token flow with RFC 9728 discovery
- Time window evaluation (`<om:window>`) against current clock
- Self-managed group subscription support (for company/institution plans)

**Implementer effort:** ~2–3 weeks.

### Level 4 — OM-VC 1.0 + revocation checks

Adds:
- Presenting W3C VC 2.0 credentials (EdDSA or ECDSA)
- Reading Bitstring Status List to check revocation
- Handling credential-scoped bearer tokens from presentation endpoints

**Implementer effort:** ~1 month, plus crypto library dependencies.

### Level 5 — Commerce

Adds:
- `<om:offer>` parsing and display
- In-app checkout flow (POST to `/api/checkout`, open returned URL)
- Entitlement polling and token refresh
- Feature-based access checks (`<om:feature>` IDs in JWT claims)
- Proration policy display

**Implementer effort:** ~2–4 weeks.

### Level 6 — Value-for-value

Adds:
- `<om:value>` parsing
- Payment rail abstraction (Lightning + fiat micropayments)
- Recipient splits and time-based splits
- One-time tip and streaming payment UX

**Implementer effort:** ~2 weeks beyond Level 5, plus rail-specific wallet integration.

### Level 7 — Privacy (OM-VC-SD)

Adds:
- W3C BBS+ cryptosuite support
- Selective disclosure proof generation
- Per-verifier pseudonym derivation
- Pseudonymous mode UX (user sees "you'll appear as pseudonym X to this publisher")

**Implementer effort:** ~1 month, requires BBS+ implementation (Mattr, Spruce, or Digital Bazaar libraries exist).

### Level 8 — Bundles

Adds:
- Bundle credential acceptance
- `<om:bundled-from>` trust chain verification
- Audience claim matching

**Implementer effort:** ~2 weeks beyond Level 7.

## Conformance profiles

Named combinations of levels for common use cases:

### Indie Reader profile

**Levels:** 1, 2, 5
**Good for:** general-purpose RSS readers adding paid-content support
**Rationale:** covers the Substack writer + Patreon podcaster personas; no crypto complexity

### Enterprise Reader profile

**Levels:** 1, 2, 3, 4, 5
**Good for:** readers supporting organizational customers with SCIM-provisioned teams
**Rationale:** adds the B2B subscription infrastructure; still no BBS+ complexity

### Privacy Reader profile

**Levels:** 1, 2, 3, 4, 5, 7
**Good for:** readers serving journalism-focused, legal, medical, or otherwise privacy-sensitive subscribers
**Rationale:** adds pseudonymous mode; required for publications that shouldn't retain subscriber identities

### Full Conformance profile

**Levels:** 1, 2, 3, 4, 5, 6, 7, 8
**Good for:** a flagship reader that wants to be compatible with every `om` feature including Podcasting 2.0 parity and cross-publisher bundles
**Rationale:** everything; expected of at most one or two readers in the ecosystem

## Publisher conformance

Publishers don't use the level system. Instead, they declare what their feed uses:

- Required: namespace declaration, `<om:provider>`, at least one `<om:authMethod>`
- Conditional: if `<om:offer>` present, `/api/checkout` must work; if `<om:group admin="self-managed">`, SCIM endpoint must work; if `vc-presentation` auth method, presentation endpoint must work
- Validation: test suite runs against the feed URL and discovery document; any unhonored declaration is a conformance failure

## Version-to-version backward compatibility

| Upgrading from | Upgrading to | Reader code changes? | Feed changes? |
|---|---|---|---|
| 0.1 | 0.2 | No (new features opt-in) | Add discovery doc if using new features |
| 0.2 | 0.3 | No | Add PSP declarations if using commerce features |
| 0.3 | 0.4 | No | Add revocation policy if relevant |
| 0.4 | 1.0 | No | Bump `spec_version` in discovery doc |

Post-1.0 changes in the 1.x series maintain the same pattern: new features are opt-in, existing features are frozen.

## The feature ladder

An intuitive map of what each conformance level gets you:

```
                                               ┌─────────────┐
                                               │  Level 8    │
                                               │  Bundles    │
                                               └─────────────┘
                                               ┌─────────────┐
                                               │  Level 7    │
                                               │  Privacy    │
                                               └─────────────┘
                                               ┌─────────────┐
                                               │  Level 6    │
                                               │  V4V        │
                                               └─────────────┘
                                               ┌─────────────┐
                                               │  Level 5    │
                              ◀── current      │  Commerce   │
                              "credible"       └─────────────┘
                              reader line      ┌─────────────┐
                                               │  Level 4    │
                                               │  OM-VC      │
                                               └─────────────┘
                                               ┌─────────────┐
                                               │  Level 3    │
                                               │  Bearer     │
                                               └─────────────┘
                                               ┌─────────────┐
                                               │  Level 2    │
                              ◀── minimum      │  URL token  │
                              viable           └─────────────┘
                              reader           ┌─────────────┐
                                               │  Level 1    │
                                               │  Parsing    │
                                               └─────────────┘
```

An afternoon's work gets you Level 1. A week gets Level 2, which is enough to handle the most common case (Substack-style tokenized feeds). A month gets the full enterprise-ready Level 5 stack. Beyond that, each additional level addresses increasingly specialized use cases.

The right ambition for most readers is "Level 5 within 6 months of first hearing about the spec." That's the line at which a reader becomes a serious participant in the ecosystem rather than a curiosity.
