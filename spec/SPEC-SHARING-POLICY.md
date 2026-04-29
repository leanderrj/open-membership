# Open Membership RSS, Sharing Policy Companion 0.1

> **Provisional, subject to errata once a production podcast publisher (SPEC §H.5 persona 2) has deployed and tested this primitive.** Do NOT treat this element as stable until at least one publisher has used it in anger. The version number is 0.1, deliberately not 1.0, to signal that the shape below is a first attempt at an open problem.

- **Title:** Open Membership RSS, Sharing Policy Companion
- **This version:** 0.1 (draft, 2026-04-24)
- **Companion to:** Open Membership RSS 0.4 (`SPEC.md`)
- **Namespace:** `http://purl.org/rss/modules/membership/` (the element lives in the existing `om:` namespace, no new namespace is introduced)
- **Status:** Provisional. ROADMAP Phase 2 M4 deliverable. Resolves SPEC §H.2 Open Question as a first draft only. Expect churn in 0.4.1 errata once persona 2 deployment evidence arrives.

## Copyright

Copyright © 2026 by the Authors. Same terms as `SPEC.md`.

---

## 1. Why this exists

SPEC §H.2 documents Patreon's production-validated anti-sharing machinery: multi-device usage analytics on tokenized RSS URLs, automatic link reset on detected sharing, comment/DM suspension as escalation, Trust & Safety review as terminal. Patreon's own documentation is quoted there: *"We monitor how many devices and/or podcast apps are using each RSS link. If usage numbers are higher than usual, it may indicate that a member is sharing their link with others."* SPEC §H.2 item 1 then says:

> **Open Question for 0.5:** should the spec define a `<om:sharing-policy>` element that lets publishers declare "we monitor for usage anomalies," along with reader-side conventions for honoring per-device limits?

This companion is a first draft answer. It exists for three reasons:

1. **Patreon's model is the production evidence.** It is the only widely-deployed anti-sharing model for tokenized RSS at scale. Ignoring it would leave `om` publishers improvising.
2. **The federation risk is real.** SPEC §H.2 item 1 names it: *"in a federated `om` ecosystem, a malicious reader could intentionally distribute one token across many devices and there would be no central party to enforce."* Without even a declarative element, publishers will improvise incompatibly and readers will have no signal to honor.
3. **Publisher visibility, not DRM.** The goal is to give publishers a signal they can act on and to give honest readers a way to behave well. This is not a rights-management primitive and cannot be made into one, see §C below.

This companion is explicitly not a stable 1.0 artifact. ROADMAP's risk register flags "anti-sharing primitive lands too early and fragments" and mitigates with: *"ship the M4 draft as explicitly provisional, clearly marked subject to errata once persona 2 (podcaster) is in production."* That is what this document is.

---

## 2. `<om:sharing-policy>`, channel-level element (optional)

A publisher declares its sharing posture at channel level. The element is optional; its absence means the publisher makes no declaration and readers infer nothing.

### 2.1 Attributes

| Attribute | Type | Required | Meaning |
|---|---|---|---|
| `enforcement` | enum: `advisory`, `soft`, `hard` | yes | The action the publisher takes when the declared limit is exceeded. See §4. |
| `max_devices` | integer | no | Maximum number of concurrent devices bound to one credential. Default is unset, meaning "no limit declared." When unset, a reader honoring the policy MUST NOT infer a limit. |
| `grace_period_hours` | integer | no | Hours a newly-seen device has before it counts against `max_devices`. Default `0`. Useful for legitimate reader migration (see §5) and short-lived devices. |
| `detection` | enum: `client-id`, `dpop-key`, `both` | yes | How the publisher identifies "a device." See §3. |

### 2.2 Example

```xml
<rss version="2.0" xmlns:om="http://purl.org/rss/modules/membership/">
  <channel>
    <title>Field Notes</title>
    <om:provider>https://fieldnotes.example</om:provider>
    <om:authMethod>dpop</om:authMethod>

    <om:sharing-policy
      enforcement="soft"
      max_devices="3"
      grace_period_hours="48"
      detection="dpop-key" />
  </channel>
</rss>
```

The element does NOT introduce a new `<om:authMethod>` value. It composes with the existing `dpop` method defined in SPEC 0.4 §Foundational and profiled for portability in `SPEC-PORTABILITY.md` §4.6.

---

## 3. Device detection

The `detection` attribute selects the mechanism the publisher uses to distinguish devices.

### 3.1 `detection="client-id"`

The publisher relies on client-supplied hints: User-Agent, session cookie, reader-assigned installation identifier. This is the mechanism Patreon currently uses (SPEC §H.2), observable from outside. It is cheap to implement but:

- It is trivially spoofed.
- It leaks User-Agent and IP-shaped fingerprints into publisher logs.
- It is incompatible with `<om:privacy>pseudonymous</om:privacy>` (see §7).

### 3.2 `detection="dpop-key"`

The publisher expects each device to present a DPoP proof (RFC 9449) on every authenticated fetch. The SHA-256 JWK thumbprint of the device's DPoP public key is the device identifier. Properties:

- Thumbprints are stable across requests from the same reader installation.
- Thumbprints are different across installations (a fresh key is generated per installation).
- Thumbprints are not linkable across publishers, each publisher sees its own binding; the same device fetching from two publishers may use the same key or may use different keys at the reader's discretion (readers with pseudonymous publishers in the feed list SHOULD rotate per publisher).
- No User-Agent or IP data is implied; the thumbprint alone is enough.

The DPoP public-key thumbprint IS the device identifier for the purposes of `<om:sharing-policy>`. No other identifier is introduced by this companion.

### 3.3 `detection="both"`

The publisher MAY use both signals, for example, soft-count distinct thumbprints and hard-count distinct (User-Agent, IP/24) pairs. A publisher choosing `both` SHOULD document in its discovery document (§9) which signal dominates when they disagree.

---

## 4. Reader-side per-device key binding (the DPoP convention)

When a reader subscribes to a feed from a publisher declaring `<om:sharing-policy detection="dpop-key">` or `detection="both"`:

1. On first subscribe, the reader generates a DPoP key pair per RFC 9449. One key per (reader installation, publisher) pair. Ed25519 is RECOMMENDED; the key curve and algorithm are those permitted by RFC 9449.
2. The reader presents a DPoP proof on every fetch of a gated resource (feed URL, enclosure, unlock endpoint). The proof is bound to the HTTP method and target URI as specified in RFC 9449.
3. The reader uses the same key across every fetch for the lifetime of that subscription. Rotating the key mid-subscription looks like a new device to the publisher (see §C, "Honest limits").
4. The reader stores the DPoP private key alongside the bearer token. `SPEC-PORTABILITY.md` §4.6 defines the export shape for this key pair; a reader MAY export it, but doing so counts as a device migration (see §5).
5. The reader MUST NOT share the DPoP key pair with other readers, other installations, or the user's other devices. If the user legitimately needs the subscription on another device, they use the portability flow in §5.

The reader does NOT need to know the publisher is counting thumbprints. From the reader's side, DPoP is already mandated by `<om:authMethod>dpop</om:authMethod>`; this companion just gives the thumbprint a second job as a device identifier.

---

## 5. Legitimate reader migration

SPEC-PORTABILITY §S4 already names this interaction: *"Importing a credential does not migrate the publisher's notion of who the subscriber is. If the publisher has a device-count limit (SPEC §H.2 anti-sharing), importing on a new device counts as an additional device. Readers SHOULD warn the user when importing a credential whose publisher advertises a `<om:sharing-policy>` with per-device limits."*

This companion formalizes that recommendation.

### 5.1 Reader recommendations

- A reader importing a `.ommem` portability bundle (SPEC-PORTABILITY §4.6 shape) that includes a DPoP key SHOULD, for each such credential, inspect the publisher's feed (or cached discovery document) for `<om:sharing-policy>`.
- If `<om:sharing-policy>` is present with `max_devices` set, the reader SHOULD display a warning: the device count will increment on first fetch from the imported installation, and the publisher MAY throttle or reject that fetch under `soft` or `hard` enforcement.
- The reader MAY offer the user two paths: (a) import the existing DPoP key (same thumbprint, same device-count slot, recommended when retiring the source device) or (b) discard the imported key and trigger a device-rotation flow at the publisher (see §5.2, recommended when the source device remains in use).

### 5.2 Publisher recommendations

- A publisher declaring `<om:sharing-policy>` with `max_devices` SHOULD expose a device-rotation endpoint at `/om/rotate-device` under its provider origin. The endpoint accepts a valid DPoP proof from an existing device and issues a fresh bearer token; the publisher invalidates the prior thumbprint's slot and admits the new thumbprint.
- The rotation endpoint is NOT a general "add device" endpoint. It is a one-in-one-out swap. Adding a device beyond `max_devices` still requires the user to exceed the limit and trigger whatever `enforcement` the publisher declared.
- The discovery document (§9) MAY advertise the rotation endpoint under `sharing_policy.rotate_device_endpoint`. When advertised, readers SHOULD prefer it over triggering a silent over-limit fetch.

---

## 6. Publisher-side enforcement

The `enforcement` attribute declares what the publisher does when a credential exceeds `max_devices`. All three modes presume `detection` is in place and working.

### 6.1 `enforcement="advisory"`

The publisher takes no technical action. The publisher MAY display, in its own UI or in `www-authenticate`-style response headers, an informational notice such as *"this credential is currently bound to 4 devices; the typical limit for this tier is 3."* Readers MAY surface this to the user. No fetch is denied, no throttle is applied.

Advisory is the honest default for a publisher that wants to gather signal without committing to enforcement.

### 6.2 `enforcement="soft"`

The publisher MAY throttle feed refresh, enclosure download rate, or unlock endpoint calls for credentials exceeding `max_devices`. The specific throttle policy is publisher-local and not normatively constrained here. Readers MUST treat 429 Too Many Requests (RFC 6585) responses on gated resources the same way they treat them on any other resource, respecting `Retry-After`, backing off exponentially, surfacing the throttle to the user if it persists beyond the publisher-advertised `grace_period_hours`.

A publisher in `soft` mode MUST NOT 401 or 403 over-limit fetches. `soft` is about friction, not lockout.

### 6.3 `enforcement="hard"`

The publisher MUST 401 Unauthorized any fetch from the (N+1)th and subsequent devices, where N is `max_devices`. Which N devices are privileged is a publisher-local decision; the straightforward rule is first-seen-wins (FIFO by DPoP thumbprint first-observation time), but LRU, explicit user-chosen, or user-admin-reviewed policies are all permissible.

The 401 response body MUST be JSON and MUST include, at minimum:

```json
{
  "error": "device_limit_exceeded",
  "max_devices": 3,
  "current_devices": 4,
  "review_devices_endpoint": "https://fieldnotes.example/om/devices"
}
```

`review_devices_endpoint` is a publisher-hosted URL where the subscriber can review the current device list, revoke a device, and trigger a rotation. The endpoint is OUT of scope for this companion, publishers implement whatever UX suits them; only the JSON pointer is normative.

---

## 7. Privacy interaction

`<om:sharing-policy>` adds tracking data to publisher logs. Not a lot, a DPoP thumbprint is 32 bytes of not-obviously-meaningful entropy, but enough to matter for publishers with a stated privacy posture.

### 7.1 Pseudonymous publishers

A publisher declaring `<om:privacy>pseudonymous</om:privacy>` or `<om:privacy>pseudonymous-required</om:privacy>` (SPEC 0.4 §4.3) SHOULD use `detection="dpop-key"` and SHOULD NOT use `detection="client-id"` or `detection="both"`.

Rationale: DPoP thumbprints are per-installation and not linkable across publishers (when the reader rotates keys per publisher, which a privacy-aware reader SHOULD do for pseudonymous publishers). Client-id signals (User-Agent, IP) are linkable across publishers using the same reader and leak User-Agent fingerprints even to a single publisher. For a pseudonymous publisher, using `client-id` would effectively turn the pseudonym back into a fingerprint.

### 7.2 Pseudonym rotation and thumbprint rotation

OM-VC-SD §4.8 per-publisher pseudonyms (SPEC-PORTABILITY §4.8) are orthogonal to DPoP thumbprints. A reader rotating its BBS+ pseudonym for a publisher SHOULD also rotate its DPoP key for that publisher; a rotated pseudonym presented alongside an unrotated thumbprint trivially re-links the old and new pseudonyms from the publisher's side.

Implementations SHOULD treat the (pseudonym, DPoP thumbprint) pair as a single privacy unit and rotate them together.

### 7.3 What the publisher learns

Under `detection="dpop-key"`, a publisher learns: *"this credential is bound to N distinct DPoP keys, last seen at times T_1 ... T_N."* That is strictly less than Patreon's current production signal (User-Agent, IP, app name, fetch pattern), and it is the minimum needed to make sharing visible. Publishers SHOULD NOT store DPoP proofs beyond the short verification window (DPoP proofs carry a `jti` and `iat`; publishers need `jti` only long enough to detect replay per RFC 9449, typically on the order of minutes).

---

## 8. Bundle and federation considerations

### 8.1 Bundle credentials

SPEC 0.4 §3 bundle credentials (OM-VC issued by an aggregator, `audience` listing multiple participating publishers) do NOT carry device binding by default. The bundle OM-VC is a delegation, not a device-bound token.

### 8.2 Per-publisher re-binding

A bundled publisher (one declaring `<om:bundled-from>`) MAY require per-publisher DPoP re-binding for its gated fetches. The flow:

1. Reader presents the bundle OM-VC to the publisher's verification endpoint.
2. Publisher validates the bundle credential per SPEC 0.4 §3.4.
3. If the publisher's feed declares `<om:sharing-policy detection="dpop-key">`, the publisher issues a DPoP-bound bearer token scoped to the publisher, binding to the reader's DPoP key.
4. From that point, sharing-policy enforcement is per-publisher, based on the thumbprints that have ever presented this bundle credential.

This means a subscriber using a bundle across three publishers generates three independent per-publisher thumbprint counts, each one subject to that publisher's `<om:sharing-policy>`. This is correct behavior: each publisher decides its own sharing posture.

### 8.3 No central enforcement

Aggregators SHOULD NOT attempt to enforce `<om:sharing-policy>` across participating publishers. A bundle aggregator has no operational visibility into thumbprint counts at each participating publisher and no authority over them. Enforcement is strictly per-publisher; the aggregator's role ends at credential issuance.

This is the honest answer to SPEC §H.2's "no central enforcer" concern: there is no central enforcer, by design, and the spec chooses federated fragmentation over re-centralization.

---

## 9. Discovery document

The `.well-known/open-membership` document (SPEC 0.4 §9) gains an optional `sharing_policy` object mirroring the element:

```json
{
  "spec_version": "0.4",
  "sharing_policy_version": "0.1-provisional",

  "sharing_policy": {
    "enforcement": "soft",
    "max_devices": 3,
    "grace_period_hours": 48,
    "detection": "dpop-key",
    "rotate_device_endpoint": "https://fieldnotes.example/om/rotate-device",
    "review_devices_endpoint": "https://fieldnotes.example/om/devices"
  }
}
```

The `sharing_policy_version` field at top level is an explicit marker, readers that do not recognize the version string SHOULD treat the whole object as opaque and behave as if no policy were declared.

---

## 10. Worked example, podcast publisher (persona 2)

A podcast publisher matching SPEC §H.5 persona 2 (the Patreon-refugee podcaster) declares a soft-enforcement sharing policy. Full feed fragment:

```xml
<rss version="2.0" xmlns:om="http://purl.org/rss/modules/membership/">
  <channel>
    <title>Shop Talk</title>
    <om:provider>https://shoptalk.example</om:provider>
    <om:discovery>https://shoptalk.example/.well-known/open-membership</om:discovery>

    <om:authMethod>dpop</om:authMethod>
    <om:psp id="stripe" account="acct_..." />
    <om:tier id="paid" price="USD 8.00" period="monthly">Supporter</om:tier>

    <om:sharing-policy
      enforcement="soft"
      max_devices="3"
      grace_period_hours="48"
      detection="dpop-key" />
  </channel>
</rss>
```

### 10.1 Reader behavior

On first subscribe:

1. Reader fetches the feed, sees `<om:authMethod>dpop</om:authMethod>` and `<om:sharing-policy ... detection="dpop-key">`.
2. Reader generates a fresh Ed25519 DPoP key pair, scoped to (this reader installation, `https://shoptalk.example`).
3. Reader presents a DPoP proof on every subsequent fetch of the gated feed URL and on every enclosure download.
4. Reader stores the DPoP key alongside the bearer token per SPEC-PORTABILITY §4.6.

### 10.2 Publisher behavior

- Publisher maintains a per-credential set of seen DPoP thumbprints and their `first_seen_at` timestamps.
- Within the 48-hour grace window, a new thumbprint does not count against `max_devices`. This accommodates a subscriber setting up their podcast app on two phones over a weekend.
- Once there are 4 or more active thumbprints past their grace window, the publisher throttles feed refresh for the 4th and later thumbprints. Concretely: feed refresh is rate-limited to once per 6 hours instead of the normal once per hour; enclosure fetches return 429 Too Many Requests with `Retry-After: 3600` for the throttled thumbprints.
- Publisher does not revoke any credential and does not block any fetch outright. `enforcement="soft"` is throttle-only.

### 10.3 User experience on device 4

The user adds the subscription to a fourth app. The reader:

1. Fetches the feed. The first fetch succeeds (grace period).
2. After 48 hours, subsequent fetches receive 429s.
3. The reader surfaces the 429 to the user: *"Shop Talk appears to be at its declared device limit (3 devices). You can rotate a device from your Shop Talk account page, or continue at a reduced refresh rate."*
4. The reader links to `review_devices_endpoint` from the discovery document.

The publisher gets a visible, actionable signal. The reader behaves honestly. A malicious reader or a determined user can still bypass this (see §C), and that is acknowledged, not hidden.

---

## 11. Conformance

**This section is provisional, like the rest of the document.** Do NOT treat any of the below as stable Level assignments until at least one podcaster (persona 2) has deployed and tested the primitive.

### 11.1 Reader conformance

- A **Level 3** reader (SPEC 0.4 §7) already implements bearer + DPoP auth. Such a reader honors `<om:sharing-policy>` essentially for free: it already generates and presents DPoP proofs; all that's added is the reader-side warning on portability import (§5.1) and the 401/429 response handling (§6).
- A **Level 2** reader (url-token + in-app checkout, no DPoP) MAY ignore `<om:sharing-policy>`. Absence of DPoP means `detection="dpop-key"` is not applicable to this reader's traffic; under `detection="client-id"` the publisher falls back to whatever client-side signals it can observe.
- A reader claiming to honor this companion MUST honor §4 (key binding) and §5 (migration warnings). It SHOULD honor §6 (surfacing 429 / 401 with device-limit JSON bodies). It MUST NOT claim to "enforce" sharing policy, this is a reader-side honest-behavior contract, not enforcement.

### 11.2 Publisher conformance

- A publisher declaring `<om:sharing-policy>` MUST declare a consistent `enforcement` value and SHOULD implement the declared behavior (§6). A publisher declaring `enforcement="hard"` but not actually 401-ing over-limit requests is non-conformant.
- A publisher with `<om:privacy>pseudonymous(-required)?` SHOULD NOT use `detection="client-id"` (§7.1).
- A publisher declaring `max_devices` SHOULD expose a `review_devices_endpoint` and SHOULD expose a `rotate_device_endpoint` in its discovery document.

### 11.3 Provisional marker

> **Reminder: this document is Provisional 0.1.** The ROADMAP risk register explicitly permits replacing this element wholesale in 0.4.x errata if persona 2 deployment shows the current shape doesn't fit. A reader or publisher adopting this companion today should budget for a breaking change in 0.4.1 or 0.4.2. Conformance claims against 0.1 are claims against a known-unstable target.

---

## 12. Honest limits (what a malicious reader can still do)

This is not a DRM primitive. A reader that is actively hostile to its publisher can still:

- **Rotate DPoP keys on demand.** A malicious reader can generate a fresh key pair for every fetch, presenting a new thumbprint each time. The publisher sees one infinite device; `max_devices` is trivially defeated if every fetch is a new "device." Publishers MAY mitigate by rate-limiting the rate of new-thumbprint observations per credential (e.g., no more than N new thumbprints per credential per 24 hours), but this is a publisher-local heuristic, not a protocol feature.
- **Proxy fetches through a single reader.** A malicious intermediary (a pirate aggregator) can fetch on behalf of many end-users using a single DPoP key, making one credential look like one device while serving content to thousands. This is the TV Key Sharing problem; `<om:sharing-policy>` does not address it.
- **Share the exported portability bundle.** SPEC-PORTABILITY §S2 already names this: *"DPoP and VC holder keys, once exported, can be re-used indefinitely by anyone holding the file."* Exported keys are bearer credentials.

`<om:sharing-policy>` is a publisher-visibility primitive, not an enforcement primitive. It gives honest readers a signal to behave well and gives publishers a signal to act on when behavior diverges. That is strictly less than Patreon's current model provides, and it is also strictly more than `om` 0.4 provides.

---

## 13. Open questions for 0.5

This companion resolves SPEC §H.2 Open Question as a first draft. It leaves several dependent questions unresolved; their resolution comes from production deployment evidence, not from further drafting.

1. **Is `first-seen-wins` the right default under `enforcement="hard"`?** Patreon appears to use a user-visible device list with explicit revocation. `om` 0.1 punts to publisher discretion. The first podcaster to deploy will tell us whether first-seen-wins is usable or infuriating.
2. **What is the right `grace_period_hours` default?** 0.1 says `0`. Patreon's observed behavior suggests they tolerate short-term over-limits that auto-resolve. A single production deployment with instrumentation will answer this better than any draft.
3. **Should `max_devices` have tier-scoped variants?** A family tier SHOULD permit more devices than a solo tier. 0.1 punts, the element is channel-level only. Evidence of demand may push this to a tier-scoped attribute in 0.4.1.
4. **How does `<om:sharing-policy>` interact with `<om:group>` (SPEC 0.2)?** A group subscription already intends multiple devices. 0.1 does not specify, and the first group-subscription deployment will force clarification. Likely answer: `<om:group>` credentials are exempt from `max_devices`, or `max_devices` is per-group-member rather than per-credential.
5. **Is `review_devices_endpoint` enough UX glue?** Or does the reader need a richer in-app flow (per RFC-9728-style metadata) to show the device list inline? 0.1 keeps it to a JSON pointer; the first reader integration will tell us whether that's enough.

Resolution of each open question is gated on production evidence. None of them should be resolved by further drafting in the absence of a deployed publisher.

---

## 14. Relation to SPEC 0.4 and SPEC-PORTABILITY 1.0

- **SPEC 0.4 §H.2**, this companion is the first draft answer to that Open Question.
- **SPEC 0.4 Foundational, `<om:authMethod>`**, no new auth method is added. `dpop` is reused as-is.
- **SPEC 0.4 §4.3 `<om:privacy>`**, §7 of this companion defines the interaction.
- **SPEC 0.4 §3 bundles**, §8 of this companion defines the interaction.
- **SPEC-PORTABILITY §4.6 dpop credential shape**, the DPoP key pair exported there is the same key pair `<om:sharing-policy>` counts against `max_devices`.
- **SPEC-PORTABILITY §S4 import warning**, formalized in §5.1 of this companion.

---

## 15. Acknowledgements (0.1)

This companion's shape is built on public observation of Patreon's anti-sharing operation (SPEC §H.2 and the sources named there), on RFC 9449 (OAuth 2.0 Demonstrating Proof of Possession, the DPoP mechanism), and on the ROADMAP risk register's explicit permission to ship provisional primitives. None of the acknowledged parties endorse this companion.

> **Final reminder: Provisional 0.1.** This document will change once persona 2 is in production. Do not ship a reader or publisher that depends on any detail above being stable.
