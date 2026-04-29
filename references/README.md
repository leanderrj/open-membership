# `/references`, Original Spec Source Files

Verbatim copies of every upstream specification the Open Membership RSS design builds on or cites. These are preserved so every design decision in [`/SPEC.md`](../SPEC.md) can be traced back to an authoritative source without depending on an external URL staying reachable.

Files are checked in **as fetched**, original line endings, original markup, so diffing a future update against what we archived shows exactly what changed upstream.

## Index

### Syndication

| File | Spec | Source | SPEC.md tie |
|---|---|---|---|
| [`rss-1.0.html`](rss-1.0.html) | RDF Site Summary (RSS) 1.0 | https://web.resource.org/rss/1.0/spec | Namespace binding for RSS 1.0 / RDF (SPEC §Foundational) |
| [`rss-2.0.html`](rss-2.0.html) | RSS 2.0.11 (RSS Advisory Board) | https://www.rssboard.org/rss-specification | Primary parent of the `om:` namespace (SPEC §Foundational) |
| [`atom-rfc4287.txt`](atom-rfc4287.txt) | Atom Syndication Format (RFC 4287) | https://www.rfc-editor.org/rfc/rfc4287.txt | Compatibility baseline for a future Atom binding |
| [`podcasting-2.0-namespace.md`](podcasting-2.0-namespace.md) | Podcasting 2.0 namespace (index) | https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/1.0.md | Co-existence with `podcast:value` (SPEC §Commercial); per-tag files live under [`docs/tags/`](https://github.com/Podcastindex-org/podcast-namespace/tree/main/docs/tags) in the upstream repo |

### Federation

| File | Spec | Source | SPEC.md tie |
|---|---|---|---|
| [`activitypub.html`](activitypub.html) | ActivityPub | https://www.w3.org/TR/activitypub/ | Federation layer for Mastodon, PeerTube, Ghost Fediverse; cautionary tale on monetization (SPEC §G.2) |

### Authentication & discovery

| File | Spec | Source | SPEC.md tie |
|---|---|---|---|
| [`rfc9728.txt`](rfc9728.txt) | OAuth 2.0 Protected Resource Metadata (RFC 9728) | https://www.rfc-editor.org/rfc/rfc9728.txt | Composes with `.well-known/open-membership` discovery (SPEC §Discovery) |

### Verifiable Credentials stack (OM-VC and OM-VC-SD)

| File | Spec | Source | SPEC.md tie |
|---|---|---|---|
| [`vc-data-model-2.0.html`](vc-data-model-2.0.html) | Verifiable Credentials Data Model 2.0 | https://www.w3.org/TR/vc-data-model-2.0/ | Foundation of the OM-VC 1.0 profile (SPEC §Identity, §4) |
| [`vc-bitstring-status-list.html`](vc-bitstring-status-list.html) | Bitstring Status List v1.0 | https://www.w3.org/TR/vc-bitstring-status-list/ | Revocation mechanism for OM-VC credentials (SPEC §2, §4) |
| [`vc-di-bbs.html`](vc-di-bbs.html) | Data Integrity BBS Cryptosuites (`bbs-2023`) | https://www.w3.org/TR/vc-di-bbs/ | Selective-disclosure cryptosuite for OM-VC-SD 1.0 (SPEC §4) |
| [`did-core.html`](did-core.html) | DID Core 1.0 | https://www.w3.org/TR/did-core/ | Publisher / aggregator identity via `did:web` (SPEC §3.3, §bundles) |

### Group provisioning

| File | Spec | Source | SPEC.md tie |
|---|---|---|---|
| [`rfc7643.txt`](rfc7643.txt) | SCIM 2.0 Core Schema (RFC 7643) | https://www.rfc-editor.org/rfc/rfc7643.txt | Group membership schema (SPEC §Group, §2) |
| [`rfc7644.txt`](rfc7644.txt) | SCIM 2.0 Protocol (RFC 7644) | https://www.rfc-editor.org/rfc/rfc7644.txt | Self-managed group subscription binding (SPEC §Group, §2) |

## Why archive all of this

Most of these hosts (IETF, W3C) have never gone dark, but ActivityPub references originally pointed at SDOs that later renamed, RFC IDs have been deprecated mid-draft, and W3C documents move between TR/ and specs.w3.org/. The archive gives every future editor a ground truth they can diff against upstream. A re-fetch that produces no diff means the upstream hasn't drifted; any delta is worth reviewing before accepting.

## Licensing

The archived documents belong to their respective authors / SDOs:

- **RSS 1.0**, public domain per the RSS-DEV Working Group's terms.
- **RSS 2.0** (RSS Advisory Board edition), CC-BY-SA 2.5.
- **Atom RFC 4287, RFC 7643, RFC 7644, RFC 9728**, [BCP 78 / IETF Trust Legal Provisions](https://trustee.ietf.org/license-info/).
- **ActivityPub, VC 2.0, Bitstring Status List, DI BBS, DID Core**, © W3C, [W3C Document License](https://www.w3.org/Consortium/Legal/2015/doc-license).
- **Podcasting 2.0 namespace**, CC0 per its repository.

Inclusion in this folder is for reference and archival, not redistribution for use, consult the upstream license before copying into another project.

## Re-fetch (drift check)

```bash
cd references
curl -sSL "https://web.resource.org/rss/1.0/spec"                                         -o rss-1.0.html
curl -sSL "https://www.rssboard.org/rss-specification"                                    -o rss-2.0.html
curl -sSL "https://www.rfc-editor.org/rfc/rfc4287.txt"                                    -o atom-rfc4287.txt
curl -sSL "https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/1.0.md" -o podcasting-2.0-namespace.md
curl -sSL "https://www.w3.org/TR/activitypub/"                                            -o activitypub.html
curl -sSL "https://www.rfc-editor.org/rfc/rfc9728.txt"                                    -o rfc9728.txt
curl -sSL "https://www.w3.org/TR/vc-data-model-2.0/"                                      -o vc-data-model-2.0.html
curl -sSL "https://www.w3.org/TR/vc-bitstring-status-list/"                               -o vc-bitstring-status-list.html
curl -sSL "https://www.w3.org/TR/vc-di-bbs/"                                              -o vc-di-bbs.html
curl -sSL "https://www.w3.org/TR/did-core/"                                               -o did-core.html
curl -sSL "https://www.rfc-editor.org/rfc/rfc7643.txt"                                    -o rfc7643.txt
curl -sSL "https://www.rfc-editor.org/rfc/rfc7644.txt"                                    -o rfc7644.txt
```

Then `git diff --stat`, a clean diff means the upstream spec hasn't drifted.
