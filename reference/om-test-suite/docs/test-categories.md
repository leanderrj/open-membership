# Test categories

Every test in the `om-test-suite` publisher runner is a named check under a
category; this document lists all v0.1 tests and maps them back to the spec
rule they validate. Stub tests are marked `(stub)`; the test registers and
emits `StatusSkip` with a TODO rationale until a maintainer fills it in.

Test names follow `snake_case`. Every test carries a `spec_ref` string in the
JSON report so a failure always links back to an authoritative sentence in
`SPEC.md`, `../../../docs/FEATURESET.md`, or `plans/PHASE-3-4.md`.

---

## Level 1, Parsing

Foundational: the feed parses, declares the namespace, and states its provider.

### `parse/feed_fetchable`

GET the feed URL, assert HTTP 200. On failure all later tests in the run
Skip rather than re-fetch. Spec: `SPEC.md §Featureset Summary / 0.1
Foundational`.

### `parse/namespace_declared`

The feed's root element (or `<channel>`) carries an `xmlns:*` declaration
that resolves to `http://purl.org/rss/modules/membership/`. Prefix is
irrelevant; namespace URI is load-bearing. Spec: `../../../docs/FEATURESET.md §"Conformance
levels" / Level 1`.

### `parse/provider_present`

`<om:provider>` exists and is non-empty. Spec: `SPEC.md §Featureset Summary /
0.1 Foundational`.

### `parse/provider_is_url`

`<om:provider>` parses as an absolute URL with a scheme and host. `https`
passes; `http` emits a Warn (non-normative SHOULD); anything else Fails.
Spec: `SPEC.md §Appendix A`.

### `parse/at_least_one_tier`

At least one `<om:tier>` is declared and every declared tier has a non-empty
`id` attribute. Spec: `../../../docs/FEATURESET.md §Level 1`.

### `parse/access_values_valid`

Every `<om:access>` value across items is in the enum
`{open, preview, locked, members-only}`. Spec: `SPEC.md §Featureset Summary /
0.1 Foundational`.

### `parse/locked_item_has_preview`

Every item with `<om:access>locked</om:access>` carries a non-empty
`<om:preview>`. Treated as Warn (not Fail) because the SPEC phrases this as
a SHOULD and a publisher MAY choose to gate a post with no teaser; the Warn
keeps the cosmetic requirement visible in the report. Spec:
`plans/PHASE-3-4.md §2.3.1 Preview semantics`.

---

## Level 1, Discovery

The `.well-known/open-membership` document exists, matches the feed, and
carries the required top-level fields.

### `discovery/discovery_resolves`

GET the discovery URL, assert HTTP 200. If no `--discovery` flag is passed
the test Skips (not every publisher runs Level 1 with a discovery doc in v0.4
- though they SHOULD). Spec: `SPEC.md §9`.

### `discovery/discovery_spec_version_present`

`spec_version` is a top-level string field and starts with `0.` or equals
`1.0`. Unknown versions Warn. Spec: `SPEC.md §9`.

### `discovery/discovery_matches_feed_provider`

`<om:provider>` in the feed equals `provider` in the discovery JSON (trailing
slash-insensitive). A mismatch here usually means the publisher's feed is
served from a different origin than the publisher declares it is. Spec:
`plans/PHASE-3-4.md §2.3.1 Discovery document`.

### `discovery/discovery_revocation_policy_enum`

If a `revocation` block exists, its `policy` is one of
`{prospective-only, chargeback-revocation, full-revocation}`. Absence of the
block is not a failure at Level 1, the spec's default is
`prospective-only`. Spec: `SPEC.md §2.1`.

---

## Level 2, Auth (stubs)

URL token auth + unlock endpoint. Every check below is a stub emitting Skip
with a TODO. Spec: `../../../docs/FEATURESET.md §Level 2`; `SPEC.md §Featureset Summary /
0.1 Foundational (URL token auth)`.

- `auth/url_token_gating` (stub), feed with a valid token returns content
  different from the no-token / bad-token variants.
- `auth/url_token_rejection` (stub), feed with an invalid token returns
  401 or 403.
- `auth/unlock_endpoint_honors_token` (stub), `<om:unlock>` URL accepts the
  token and returns full content.
- `auth/access_revocation_no_stale_content` (stub), after a simulated
  revocation, subsequent fetches return 403 within the declared grace window.

---

## Level 5, Checkout (stubs + one real check)

Commerce: `<om:offer>` declarations and the `/api/checkout` contract.

### `checkout/offer_references_known_tier`

**Real check.** Every `<om:offer>` with a `tier` attribute references a
declared `<om:tier>` `id`. Skips if no offers are declared. Spec:
`SPEC.md §0.3 Payments and Value / <om:offer>`.

### Stubs

- `checkout/checkout_endpoint_accepts_valid_post` (stub), POST with a valid
  offer returns a session URL.
- `checkout/checkout_endpoint_rejects_invalid_post` (stub), POST with a
  bogus offer returns a 4xx with a structured error body.
- `checkout/checkout_session_url_resolves` (stub), the returned session URL
  is HTTP-reachable.

---

## Level 5, Entitlement (stubs)

- `entitlement/entitlements_endpoint_reachable` (stub), GET
  `/api/entitlements?session_id=...` returns a JSON body.
- `entitlement/entitlements_structured_response` (stub), the JSON body
  conforms to the `{status, tier_id, features[], expires_at}` shape.
- `entitlement/entitlements_after_webhook` (stub), a simulated
  `checkout.session.completed` webhook causes the entitlement to surface
  within 60 seconds. Spec: `plans/PHASE-3-4.md §2.3.1 Webhook honoring`.

---

## Level 5, Revocation

### `revocation/revocation_declared_on_channel_or_discovery`

**Real check.** Either `<om:revocation policy="...">` on the channel or a
`revocation` block in the discovery document is declared, and the policy
value is in the SPEC §2.1 enum. Absence is a Warn (default is
`prospective-only` but publishers SHOULD state this explicitly per the
spec's UX-consent rationale). Spec: `SPEC.md §2.1`.

### `revocation/revocation_policy_honored_on_chargeback` (stub)

Triggered via `stripe-mock charge.dispute.created`; under
`chargeback-revocation` or `full-revocation`, the entitlement flips within 1
hour; under `prospective-only`, it does not. Spec: `SPEC.md §2.3`.

---

## Not yet scoped for v0.1

These conformance levels are deliberately out of the v0.1 suite per
`plans/PHASE-3-4.md §2.3.1`:

- Level 3 (OAuth Bearer, RFC 9728 discovery, time windows, SCIM groups)
- Level 4 (OM-VC 1.0 presentation + Bitstring Status List)
- Level 6 (value-for-value, payment rail abstraction)
- Level 7 (OM-VC-SD 1.0, per-verifier pseudonyms)
- Level 8 (bundle credential acceptance)

Adding them follows the template in [`adding-tests.md`](adding-tests.md): a
new category file under `suite/`, an `init()` that calls `Register`, and the
test's level set to the appropriate `report.Level*` constant.
