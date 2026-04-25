# Open Membership RSS — Subscriber Portability Format 1.0

**A cross-reader export/import format for a user's `om` membership state.**

- **Companion to:** Open Membership RSS 0.4 / 1.0 (`http://purl.org/rss/modules/membership/`)
- **Profile URI:** `http://purl.org/rss/modules/membership/portability/1.0`
- **Status:** Draft, 2026-04-24
- **Format:** JSON-LD envelope, optionally encrypted with age or JWE
- **Media types:**
  - `application/vnd.om-membership-export+json` (plaintext)
  - `application/vnd.om-membership-export+jwe` (encrypted, JOSE)
  - `application/vnd.om-membership-export+age` (encrypted, age)
- **File extensions:** `.ommem`, `.ommem.jwe`, `.ommem.age`

## Copyright

Copyright © 2026 by the Authors. Permission to use, copy, modify and distribute this specification is granted under the same terms as the parent Open Membership RSS specification.

---

## 1. Why this exists

When a subscriber changes reader — from Miniflux to NetNewsWire, from an Android reader to an iOS reader, from a legacy self-hosted instance to a managed one — everything about their reading state today travels with them *except* paid memberships. Free feeds are expressed as URLs in an OPML file; paid memberships are expressed as per-reader bearer tokens, credentials, and stored entitlements that the receiving reader has no standard way to accept.

SPEC §G.2 names account portability as "the hardest unsolved problem in federated identity." ActivityPub has been working on it for nearly a decade. `om` sidesteps the hardest version of the problem — a portable *subscriber identity across publishers* — by delegating identity to publishers and umbrella issuers. What remains, and what this spec addresses, is a much smaller problem: a standard container shape for a user's already-issued memberships, so that the reader they move to can keep reading without re-subscribing.

This is the OPML-for-paid-feeds, nothing more.

---

## 2. What this format is not

- **Not a replacement for publisher discovery.** A destination reader MUST re-fetch `.well-known/open-membership` for every imported publisher before honoring any imported token or credential. Publisher configuration may have changed since export.
- **Not a credential issuer.** The format ports credentials a publisher or umbrella already issued. It does not mint new ones.
- **Not a transport.** Moving the exported file between devices — email, AirDrop, USB, cloud drive — is out of scope. The file is self-contained; how it gets from A to B is the user's and the reader's concern.
- **Not a subscription-list format.** Export a free feed as OPML; this format is strictly for memberships that require `om`-level authentication.
- **Not a backup archive.** Exports are portable snapshots, not archives. Readers SHOULD NOT rely on old export files as durable backups — tokens expire and credentials rotate.

---

## 3. Document shape

A portability document is a JSON-LD object with a fixed top-level shape. When encrypted, the ciphertext envelope wraps this object verbatim; the JSON-LD does not change.

### 3.1 Top-level fields

| Field | Required | Type | Meaning |
|---|---|---|---|
| `@context` | yes | array | MUST include `https://www.w3.org/ns/credentials/v2` and `https://purl.org/rss/modules/membership/portability/v1` |
| `type` | yes | string or array | MUST include `OMMembershipExport` |
| `spec_version` | yes | string | `1.0` |
| `exported_at` | yes | ISO-8601 datetime | When this document was produced |
| `exported_by` | yes | object | Source reader identification (see §3.2) |
| `subject` | yes | object | The local user identity (see §3.3) |
| `memberships` | yes | array | Zero or more membership records (see §4) |
| `bundles` | no | array | Zero or more bundle records (see §5) |
| `gifts_pending` | no | array | Zero or more unredeemed gift records (see §6) |
| `integrity` | yes | object | Checksum and optional signature (see §7) |

Absent optional arrays MAY be omitted or represented as `[]`. No distinction is made between the two on import.

### 3.2 `exported_by`

```json
{
  "reader": "Miniflux",
  "reader_version": "2.1.3-om",
  "reader_instance_id": "urn:uuid:8f0e6d4a-..."
}
```

`reader` is a free-text reader name. `reader_version` SHOULD be a version identifier useful to the user when debugging. `reader_instance_id` is an opaque local identifier for the source reader installation; it is used only for signature key binding (see §7.2) and does not cross to the destination reader.

### 3.3 `subject`

```json
{
  "local_id": "urn:uuid:3a1f-...",
  "display_name": "leander"
}
```

`local_id` is the source reader's local identifier for this user. It is opaque and MUST NOT be a cross-publisher identifier; see §8. `display_name` is a free-text hint shown by the destination reader during import (e.g., "Import Leander's memberships?"). Neither field is trusted by publishers.

---

## 4. Membership records

Each membership corresponds to a publisher the user has an active entitlement with. The record's shape depends on the publisher's advertised `<om:authMethod>`.

### 4.1 Common fields

Every membership record has:

| Field | Required | Type | Meaning |
|---|---|---|---|
| `provider` | yes | URI | The publisher's `<om:provider>` value |
| `discovery` | yes | URI | The `.well-known/open-membership` URL |
| `feed_url` | yes | URI | The per-subscriber (or public) feed URL the reader was fetching |
| `auth_method` | yes | string | Matches the publisher's `<om:authMethod>` value at export time |
| `added_at` | yes | ISO-8601 | When the source reader first saw this membership |
| `updated_at` | yes | ISO-8601 | Last time the source reader refreshed the record |
| `entitlements` | no | object | Cached entitlements snapshot (see §4.2) |
| `privacy_mode` | no | string | Matches the publisher's `<om:privacy>` value if declared |

Auth-specific fields follow.

### 4.2 `entitlements`

An informational snapshot of what the source reader most recently observed. The destination reader MUST NOT treat this as authoritative; it re-derives entitlements by presenting the ported credential to the publisher.

```json
{
  "tiers": ["paid"],
  "features": ["long-form"],
  "valid_until": "2026-05-01T00:00:00Z"
}
```

### 4.3 url-token

The tokenized feed URL is the entire auth state. No separate `credential` field is required.

```json
{
  "provider": "https://fieldnotes.example",
  "discovery": "https://fieldnotes.example/.well-known/open-membership",
  "feed_url": "https://fieldnotes.example/feed/om/8a7b9c.../",
  "auth_method": "url-token",
  "added_at": "2026-03-01T09:00:00Z",
  "updated_at": "2026-04-20T09:00:00Z",
  "entitlements": { "tiers": ["paid"], "valid_until": "2026-05-01T00:00:00Z" }
}
```

### 4.4 http-basic

HTTP Basic auth is discouraged in 0.1 and this spec does not provide a shape for it. A source reader SHOULD convert Basic-auth memberships to `url-token` if the publisher also supports it, and otherwise MAY omit the membership from the export with a warning to the user.

### 4.5 bearer

```json
{
  "provider": "https://fieldnotes.example",
  "discovery": "https://fieldnotes.example/.well-known/open-membership",
  "feed_url": "https://fieldnotes.example/feed/om/",
  "auth_method": "bearer",
  "added_at": "...",
  "updated_at": "...",
  "credential": {
    "type": "bearer_token",
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_at": "2026-04-24T11:00:00Z",
    "token_endpoint": "https://fieldnotes.example/api/token"
  }
}
```

The destination reader SHOULD assume the access token is near expiry and refresh before first use. If `refresh_token` is absent, the destination reader re-initiates the bearer flow with the publisher using the subject identity the publisher already recognizes.

### 4.6 dpop

As bearer, plus:

```json
"credential": {
  "type": "dpop_bound_token",
  "access_token": "...",
  "dpop_private_key_jwk": { "kty": "OKP", "crv": "Ed25519", "d": "...", "x": "..." },
  "dpop_public_key_thumbprint": "sha-256:..."
}
```

The DPoP private key is included because DPoP binding is per-key, not per-session. Exporting the private key is **the** sensitive operation in this format. Plaintext export of a DPoP key is forbidden (see §9); an export that includes any DPoP credential MUST be encrypted.

### 4.7 vc-presentation (OM-VC 1.0)

```json
"credential": {
  "type": "OM-VC",
  "profile": "https://purl.org/rss/modules/membership/vc-profile/1.0",
  "credential_jsonld": { "@context": [...], "type": ["VerifiableCredential", "OMMembershipCredential"], "...": "..." },
  "holder_key_jwk": { "kty": "OKP", "crv": "Ed25519", "d": "...", "x": "..." },
  "status_list_url": "https://issuer.example/status/3#42"
}
```

The full credential JSON-LD is embedded as-is. The holder's binding key is exported with it — without the binding key, the destination reader cannot re-present the credential.

### 4.8 vc-presentation (OM-VC-SD 1.0)

As §4.7, with these additions:

```json
"credential": {
  "type": "OM-VC-SD",
  "profile": "https://purl.org/rss/modules/membership/vc-sd-profile/1.0",
  "credential_jsonld": { "...": "...bbs-2023 signed full credential..." },
  "holder_secret_jwk": { "kty": "BBS+", "...": "..." },
  "per_publisher_pseudonyms": {
    "https://underreported.example": "pseudo-xyz-..."
  }
}
```

`per_publisher_pseudonyms` is the mapping the source reader has accumulated between each publisher and the pseudonym the user was presenting to it. This is load-bearing: **without it, the destination reader would present a fresh pseudonym at next access, and the publisher would see a new subscriber appear instead of a continuing one.** Export of this field is the whole reason the format exists for privacy-mode publishers.

The `holder_secret_jwk` is BBS+-specific; treat it with the same care as a DPoP private key.

---

## 5. Bundle records

A bundle record is distinct from a membership because the credential is issued by the aggregator and presented at *each* participating publisher. Exporting it once, rather than once per audience member, keeps the document compact and correct.

```json
{
  "aggregator": "https://indie-bundle.example",
  "bundle_id": "indie-news",
  "audience": [
    "https://fieldnotes.example",
    "https://underreported.example",
    "https://localcity.example"
  ],
  "credential": {
    "type": "OM-VC",
    "credential_jsonld": { "...": "..." },
    "holder_key_jwk": { "...": "..." },
    "status_list_url": "https://indie-bundle.example/status/1#17"
  },
  "added_at": "...",
  "updated_at": "..."
}
```

On import, the destination reader discovers each audience publisher, verifies each accepts this aggregator via `<om:bundled-from>`, and presents the bundle credential exactly as the source reader did.

---

## 6. Pending gifts

A gift that the user has purchased or received but not yet redeemed.

```json
{
  "redemption_url": "https://fieldnotes.example/gift/redeem",
  "redemption_token": "gift-xy9z-...",
  "offer_reference": "paid-yearly",
  "gift_message": "Happy birthday!",
  "received_at": "2026-04-20T...",
  "expires_at": "2027-04-20T..."
}
```

If the gift is tied to a specific recipient (`transferable="false"` in SPEC §5.1), the source reader SHOULD NOT export it; the redemption will fail for any other identity. The source reader MAY export it anyway, with the understanding that import is best-effort.

---

## 7. Integrity

### 7.1 Checksum (required)

Every export document MUST carry a checksum over the canonicalized JSON body, excluding the `integrity` object itself.

```json
"integrity": {
  "checksum": {
    "alg": "sha-256",
    "canonicalization": "jcs",
    "value": "f3c2..."
  }
}
```

`canonicalization` is RFC 8785 JCS unless otherwise stated. Readers MUST verify the checksum on import and reject on mismatch.

### 7.2 Signature (optional)

A source reader MAY additionally sign the canonicalized body with an Ed25519 key bound to its `reader_instance_id`. The purpose is integrity across untrusted transport, not authentication of the user — there is no PKI, and destination readers do not know source readers.

```json
"integrity": {
  "checksum": { "...": "..." },
  "signature": {
    "alg": "EdDSA",
    "publicKeyMultibase": "z6MkjP...",
    "signatureValue": "z5vq..."
  }
}
```

A destination reader that cannot verify a signature (unknown key, etc.) SHOULD warn but MAY still import, falling back to the checksum. A destination reader that *can* verify it is gaining only tamper evidence, not trust.

---

## 8. Privacy and unlinkability

This section is normative. Portability is the single point in an `om` deployment where per-publisher identities can accidentally leak into a single file, so the rules are strict.

**P1 (no cross-publisher identifiers).** An export document MUST NOT include any identifier that is the same across two or more publishers except:

- The user's local `subject.local_id` (opaque to all publishers)
- An aggregator's bundle credential, which by design names all its audience publishers
- OM-VC-SD per-publisher pseudonyms, which MUST be listed individually per publisher and MUST NOT share values

**P2 (pseudonym preservation).** For every publisher where `privacy_mode` is `pseudonymous` or `pseudonymous-required`, the source reader MUST export the per-publisher pseudonym it was presenting. Losing this is worse than losing access: it presents the same subscriber to the publisher as a different person, contaminating the publisher's analytics with a phantom churn event.

**P3 (ciphertext by default).** Exports containing *any* bearer token, refresh token, DPoP private key, VC holder key, or pseudonym secret MUST be encrypted. Plaintext export of these artifacts is a conformance failure.

**P4 (warning on wide exports).** If the export would list more than one publisher with `privacy_mode: pseudonymous-required`, the source reader SHOULD warn the user that the combined file is a more sensitive artifact than the sum of its parts, because compromising it links two publications that were deliberately unlinked.

**P5 (no telemetry).** A source reader MUST NOT report, log, or transmit the contents of an export to anyone other than the user who requested it. This is a reader conformance requirement, not a spec one — but it is the point of the whole feature.

---

## 9. Encryption envelope

### 9.1 Default: age

The default encryption is [age](https://age-encryption.org/), passphrase-based. The plaintext is the JCS-canonicalized JSON-LD body. The file extension is `.ommem.age`. The media type is `application/vnd.om-membership-export+age`.

A source reader prompting the user for a passphrase SHOULD:

- Warn against empty passphrases
- Suggest a dice-ware-style recovery phrase if generating on behalf of the user
- Not store the passphrase after the export completes

Recipients of `.ommem.age` files prompt the user for the passphrase at import.

### 9.2 Alternative: JWE

An export MAY be encrypted as a JWE Compact Serialization token using A256GCM content encryption with a key derived from a passphrase via PBES2-HS512+A256KW (RFC 7518 §4.8). File extension `.ommem.jwe`. This alternative exists for readers in ecosystems (JavaScript, iOS/Android keychains) where a JOSE dependency is already present and pulling in an age implementation would be disproportionate.

### 9.3 Unencrypted

A `.ommem` plaintext file MAY be produced **only** if the document contains zero bearer tokens, zero refresh tokens, zero DPoP keys, zero VC holder keys, and zero pseudonym secrets — i.e., in practice, only `url-token` memberships with feed URLs that already carry the secret.

A source reader producing a plaintext export MUST display a confirmation dialog naming every membership being exported and reminding the user the file content is equivalent to the list of tokenized feed URLs. Destination readers accepting plaintext exports MUST NOT accept any record with auth method other than `url-token`.

---

## 10. Export semantics

A source reader MUST:

- Include every active membership known to the reader for the user, unless the user explicitly excludes one
- Refresh each bearer token before export so expirations are as far out as possible
- Apply §8 rules
- Timestamp the export in UTC

A source reader SHOULD:

- Offer per-membership toggles so the user can exclude sensitive publishers
- Offer to sign the export (§7.2)
- Default to age encryption
- Show the user a diff preview before writing the file

A source reader MUST NOT:

- Include read-status, starred items, feed-entry caches, or any reading-history artifact — those are OPML/reader-specific concerns, not `om` concerns
- Include PSP-side identifiers (Stripe customer IDs, Mollie mandate IDs) the reader may have cached; those are publisher-only data
- Include any membership the user has actively revoked

---

## 11. Import semantics

A destination reader MUST:

- Verify the document's checksum before any further processing
- Reject the document if `spec_version` is a major version the reader does not understand
- For every membership, re-fetch `.well-known/open-membership` at `discovery` and confirm the publisher's `provider` URI matches. A mismatch is a hard failure for that membership; other records still import
- Re-verify tokens and credentials with the publisher before presenting them as active memberships to the user
- Discard any record that fails re-verification, showing the user which publishers need re-subscription

A destination reader SHOULD:

- Show the user a preview of what will be imported before committing
- De-duplicate against existing memberships by `provider` URI, keeping the newer `updated_at`
- For bearer memberships where `expires_at` is in the past, attempt a refresh before discarding
- Not extend the `updated_at` timestamp on import — imported records are not "freshly updated"

A destination reader MUST NOT:

- Silently replace an existing membership with an imported one without user consent
- Present the source reader's `reader_instance_id` or `subject.local_id` to any publisher
- Retain the import file after import completes, unless the user explicitly requests a copy be kept

### 11.1 Collision rules

When an imported membership collides with an existing one at the same `provider` URI:

1. If the imported record's `updated_at` is newer, offer to replace the existing record.
2. If the imported record's `updated_at` is older, offer to merge receipts and entitlements snapshots but keep the existing credential.
3. If the user declines resolution, keep the existing record and skip the import for that publisher.

Merging is additive for receipt arrays and last-write-wins for scalar fields. Credentials are never merged across sources.

---

## 12. Security considerations

**S1.** A plaintext or weakly-passphrase-encrypted export is a bearer-credential file. An attacker with the file is, for the lifetime of the contained tokens, the user. Readers SHOULD default to age or JWE with a user-supplied passphrase and SHOULD refuse to export to storage the reader identifies as insecure (e.g., a world-readable path).

**S2.** DPoP and VC holder keys, once exported, can be re-used indefinitely by anyone holding the file. Publishers cannot observe that a given credential is being presented from a new device. A user who suspects an export was compromised SHOULD revoke the affected credentials with the publisher or issuer; the Bitstring Status List mechanism from SPEC §9 §10 is the revocation path.

**S3.** Checksum verification is not authentication. A malicious actor producing an entirely new valid-looking file will pass checksum verification. The signature in §7.2 is the mechanism to detect tampering in transit, but it does not prove the file was exported by a trusted reader.

**S4.** Importing a credential does not migrate the publisher's notion of who the subscriber is. If the publisher has a device-count limit (SPEC §H.2 anti-sharing), importing on a new device counts as an additional device. Readers SHOULD warn the user when importing a credential whose publisher advertises a `<om:sharing-policy>` with per-device limits.

**S5.** A compromised source reader can produce exports that exfiltrate more than the user thinks. The format's rules are reader-side conformance; a non-conformant reader can violate §8 freely. Destination readers SHOULD display the publishers named in the import and let the user confirm each.

---

## 13. Worked example

A user exporting four memberships from Miniflux on their laptop to NetNewsWire on their phone:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.org/rss/modules/membership/portability/v1"
  ],
  "type": "OMMembershipExport",
  "spec_version": "1.0",
  "exported_at": "2026-04-24T10:00:00Z",
  "exported_by": {
    "reader": "Miniflux",
    "reader_version": "2.1.3-om",
    "reader_instance_id": "urn:uuid:8f0e6d4a-2c3f-4b1a-..."
  },
  "subject": {
    "local_id": "urn:uuid:3a1f-...",
    "display_name": "leander"
  },
  "memberships": [
    {
      "provider": "https://fieldnotes.example",
      "discovery": "https://fieldnotes.example/.well-known/open-membership",
      "feed_url": "https://fieldnotes.example/feed/om/8a7b9c.../",
      "auth_method": "url-token",
      "added_at": "2026-03-01T09:00:00Z",
      "updated_at": "2026-04-20T09:00:00Z",
      "entitlements": { "tiers": ["paid"], "valid_until": "2026-05-01T00:00:00Z" }
    },
    {
      "provider": "https://podcastco.example",
      "discovery": "https://podcastco.example/.well-known/open-membership",
      "feed_url": "https://podcastco.example/feed/om/",
      "auth_method": "bearer",
      "added_at": "2026-02-10T...",
      "updated_at": "2026-04-23T...",
      "credential": {
        "type": "bearer_token",
        "access_token": "eyJhbGciOi...",
        "refresh_token": "eyJhbGciOi...",
        "expires_at": "2026-04-24T11:00:00Z",
        "token_endpoint": "https://podcastco.example/api/token"
      }
    },
    {
      "provider": "https://underreported.example",
      "discovery": "https://underreported.example/.well-known/open-membership",
      "feed_url": "https://underreported.example/feed/om/",
      "auth_method": "vc-presentation",
      "privacy_mode": "pseudonymous-required",
      "added_at": "2026-01-15T...",
      "updated_at": "2026-04-24T...",
      "credential": {
        "type": "OM-VC-SD",
        "profile": "https://purl.org/rss/modules/membership/vc-sd-profile/1.0",
        "credential_jsonld": { "...": "...full bbs-2023 credential..." },
        "holder_secret_jwk": { "kty": "BBS+", "...": "..." },
        "per_publisher_pseudonyms": {
          "https://underreported.example": "pseudo-xyz-..."
        }
      }
    }
  ],
  "bundles": [
    {
      "aggregator": "https://indie-bundle.example",
      "bundle_id": "indie-news",
      "audience": [
        "https://fieldnotes.example",
        "https://underreported.example",
        "https://localcity.example"
      ],
      "credential": {
        "type": "OM-VC",
        "credential_jsonld": { "...": "..." },
        "holder_key_jwk": { "...": "..." },
        "status_list_url": "https://indie-bundle.example/status/1#17"
      },
      "added_at": "2026-04-01T...",
      "updated_at": "2026-04-23T..."
    }
  ],
  "integrity": {
    "checksum": {
      "alg": "sha-256",
      "canonicalization": "jcs",
      "value": "f3c2a61b..."
    },
    "signature": {
      "alg": "EdDSA",
      "publicKeyMultibase": "z6MkjP...",
      "signatureValue": "z5vq..."
    }
  }
}
```

This document is then passphrase-encrypted with age and saved as `leander-memberships-2026-04-24.ommem.age`. AirDrop'd to the phone. NetNewsWire asks for the passphrase, decrypts, checksums, previews the four items, re-fetches all four discovery documents, re-validates the three non-bundle memberships and the one bundle credential, and reports: "4 of 4 memberships imported. Your `podcastco.example` access token was refreshed during import."

---

## 14. Conformance

### 14.1 Export conformance

A reader conforms to export if, given a user with at least one active `om` membership, it can:

- Produce a document with a valid `@context`, `type`, `spec_version`, `exported_at`, `exported_by`, `subject`, `memberships`, and `integrity.checksum`
- Apply §8 P1–P5
- Encrypt per §9 when any non-`url-token` credential is included
- Round-trip its own output into itself without loss (import own export → diff is empty)

### 14.2 Import conformance

A reader conforms to import if, given a conformant export document from any source, it:

- Verifies §7.1 before any processing
- Applies all §11 MUSTs
- Refuses plaintext exports that contain disallowed auth methods (§9.3)
- Produces a per-membership success/failure report visible to the user

### 14.3 Round-trip conformance

The interoperability bar for this format is a **cross-reader round-trip:**

> A user exports from Reader A, imports into Reader B, exports from Reader B, imports back into Reader A. All four operations succeed; the final state in Reader A is byte-equivalent to the starting state, modulo timestamps in the `integrity` object and any field explicitly rotated by a publisher during the round trip.

This is the conformance criterion the `om` test suite (see ROADMAP.md Phase 3 M9) will codify.

---

## 15. IANA considerations

This spec requests IANA registration of:

- **Media type:** `application/vnd.om-membership-export+json`
- **Media type:** `application/vnd.om-membership-export+jwe`
- **Media type:** `application/vnd.om-membership-export+age`
- **JSON-LD context:** `https://purl.org/rss/modules/membership/portability/v1`

File extensions (`.ommem`, `.ommem.jwe`, `.ommem.age`) are informational; IANA does not register file extensions, but readers and operating systems should recognize them.

---

## 16. Non-goals revisited

For readers approaching this spec with ambitions beyond what it describes, it is worth being explicit about what portability does NOT include — and where the alternative lives:

| Want | Answer |
|---|---|
| Cross-reader read status (read/unread, starred) | Out of scope. Use OPML 2.0 extensions or a reader-specific sync protocol (Fever API, Google Reader API emulation). |
| Cross-reader feed list of *free* feeds | Out of scope. Use OPML. |
| Portable identity across publishers (same DID everywhere) | Explicitly rejected. SPEC §4 per-publisher pseudonymity is the privacy design. Portability preserves the pseudonyms; it does not collapse them. |
| Publisher-side export of subscriber roster | Not this spec. A publisher exporting its subscriber list for migration is a publisher-side concern; see the individual PSP's data-export tooling (Stripe's data portability, Mollie's GDPR export). |
| Reader sync across devices for the same user | Out of scope. This format is designed for one-shot migration, not continuous sync. |

---

## 17. Acknowledgements

The structural design draws on OPML 2.0 (the precedent for a portable reader-state format), the W3C Verifiable Credentials Data Model 2.0 (the credential-embedding shape), RFC 8785 JCS (canonicalization), and the age encryption format (simple, passphrase-based, well-reviewed).

The explicit decision to preserve per-publisher pseudonyms in OM-VC-SD exports came from the same reasoning as SPEC §4.4 group-membership privacy: a privacy-preserving credential that loses its per-verifier identity on migration is worse than useless, because it silently converts a long-term subscriber into a new first-time visitor in the publisher's logs. Keeping the pseudonym makes migration invisible to the publisher, which is the point.
