# `/references` — Original Spec Source Files

Verbatim copies of the upstream specifications the Open Membership RSS design builds on or cites. These are preserved so every design decision in [`/SPEC.md`](../SPEC.md) can be traced back to an authoritative source without depending on an external URL staying reachable.

Files are checked in **as fetched** — original line endings, original markup — so diffing a future update against what we archived shows exactly what changed upstream.

## Index

| File | Spec | Source URL | Status |
|---|---|---|---|
| [`rss-1.0.html`](rss-1.0.html) | RDF Site Summary (RSS) 1.0 | https://web.resource.org/rss/1.0/spec | Final (2000-12-06). RDF-based syndication. Uses CR line endings. |
| [`rss-2.0.html`](rss-2.0.html) | RSS 2.0.11 (RSS Advisory Board) | https://www.rssboard.org/rss-specification | Current maintained edition of the Harvard/Winer RSS 2.0 spec. |
| [`atom-rfc4287.txt`](atom-rfc4287.txt) | The Atom Syndication Format (RFC 4287) | https://www.rfc-editor.org/rfc/rfc4287.txt | IETF Proposed Standard, December 2005. |
| [`activitypub.html`](activitypub.html) | ActivityPub | https://www.w3.org/TR/activitypub/ | W3C Recommendation, January 2018. Used by the Fediverse (Mastodon, PeerTube). |
| [`podcasting-2.0-namespace.md`](podcasting-2.0-namespace.md) | Podcasting 2.0 namespace (index) | https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/1.0.md | Per-tag specs live under [`docs/tags/`](https://github.com/Podcastindex-org/podcast-namespace/tree/main/docs/tags) in that repo — the index here is the canonical entrypoint. |

## Why these five

Each is explicitly cited in [`SPEC.md`](../SPEC.md) or directly informs the design:

- **RSS 1.0 / RSS 2.0** — the two parents of the `om:` namespace. The spec declares the namespace in both (SPEC §Foundational, §Appendix A).
- **Atom (RFC 4287)** — the other mainstream syndication format. `om:` is currently framed against RSS, but every element is designed so an Atom binding is possible; the text of RFC 4287 defines the baseline semantics we maintain compatibility with.
- **ActivityPub** — the federation layer for Fediverse platforms (Mastodon, PeerTube). SPEC §G.2 uses ActivityPub as the cautionary tale on monetization. PeerTube's paid-content gap (see [`../COMPETITIVE-LANDSCAPE.md`](../COMPETITIVE-LANDSCAPE.md)) is the exact shape of problem `om` exists to solve.
- **Podcasting 2.0 namespace** — SPEC §Commercial explicitly calls out co-existence with `podcast:value` for value-for-value. Where our commercial vocabulary overlaps theirs, we defer to theirs.

## Other specs referenced but not archived

Referenced in [`SPEC.md`](../SPEC.md) but hosted at long-lived W3C / IETF URLs and maintained upstream. Following the URL is preferred to snapshotting:

- **RFC 9728** — OAuth 2.0 Protected Resource Metadata. https://datatracker.ietf.org/doc/html/rfc9728
- **W3C Verifiable Credentials Data Model 2.0** — https://www.w3.org/TR/vc-data-model-2.0/
- **W3C Bitstring Status List v1.0** — https://www.w3.org/TR/vc-bitstring-status-list/
- **W3C Data Integrity BBS Cryptosuites (`bbs-2023`)** — https://www.w3.org/TR/vc-di-bbs/
- **SCIM 2.0 (RFC 7643 / 7644)** — https://datatracker.ietf.org/doc/html/rfc7644
- **W3C DID Core 1.0** — https://www.w3.org/TR/did-core/

If any of those go dark we'll snapshot them here too.

## Licensing

The archived spec documents belong to their respective authors / SDOs:

- RSS 1.0 is public domain per the RSS-DEV Working Group's terms.
- RSS 2.0 (RSS Advisory Board edition) is licensed under CC-BY-SA 2.5 per RSSBoard.
- Atom RFC 4287 is governed by [BCP 78 / Trust Legal Provisions](https://trustee.ietf.org/license-info/).
- ActivityPub is © 2018 W3C, licensed under the [W3C Document License](https://www.w3.org/Consortium/Legal/2015/doc-license).
- The Podcasting 2.0 namespace is CC0 per its repository.

Inclusion in this folder is for reference and archival, not redistribution for use — consult the upstream license before copying into another project.

## How to update

```bash
cd references
curl -sSL "https://www.rssboard.org/rss-specification" -o rss-2.0.html
curl -sSL "https://www.rfc-editor.org/rfc/rfc4287.txt"  -o atom-rfc4287.txt
curl -sSL "https://www.w3.org/TR/activitypub/"          -o activitypub.html
curl -sSL "https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/1.0.md" -o podcasting-2.0-namespace.md
curl -sSL "https://web.resource.org/rss/1.0/spec"       -o rss-1.0.html
```

Then `git diff --stat` — a clean diff means the upstream spec hasn't drifted. Any delta is worth reviewing before accepting.
