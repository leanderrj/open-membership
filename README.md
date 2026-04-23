# Open Membership RSS

`om` is an open-spec extension to RSS for paid, tiered, time-gated, group-shared, value-for-value, and privacy-preserving content. This repository holds the specification, the supporting design docs, and the reference implementations.

## Repository contents

### The specification

- **[SPEC.md](SPEC.md)** — the canonical spec (currently 0.4 draft). This is what implementers cite.

### Design and plan

1. **[ROADMAP.md](ROADMAP.md)** — the master plan, 18 months from today to 1.0
2. **[FEATURESET.md](FEATURESET.md)** — the authoritative feature inventory across all versions
3. **[om-ghost-ARCHITECTURE.md](om-ghost-ARCHITECTURE.md)** — technical design for the Ghost reference implementation
4. **[reader-ARCHITECTURE.md](reader-ARCHITECTURE.md)** — technical design for the reader reference implementation
5. **[FUNDING.md](FUNDING.md)** — grant application packages for Sovereign Tech Fund, NLnet, and Stripe Open Source
6. **[GOVERNANCE.md](GOVERNANCE.md)** — custodian shortlist, working-group charter, and decision-making conventions
7. **[COMPETITIVE-LANDSCAPE.md](COMPETITIVE-LANDSCAPE.md)** — what already exists, what doesn't, and where `om` adds value

### Reference implementations

- **[`reference/om-ghost/`](reference/om-ghost/)** — Ghost plugin + Node sidecar (Mode B) with Cloudflare Worker variant planned (Mode A). Targets conformance Level 5 (Commerce). Pre-v0.1.
- `reference/om-wordpress/` — WordPress plugin. Planned for Phase 4, per the roadmap.
- `reference/reader/` — reference reader. Planned alongside `om-ghost` so both sides of the wire are testable.

### Licensing

- **[`LICENSE-SPEC`](LICENSE-SPEC)** — CC-BY-4.0, covers the specification prose and design documents.
- **[`LICENSE`](LICENSE)** — MIT, covers all code including everything under `reference/`.

The `om` namespace itself is not subject to copyright.

## The short version

`om` is an open-spec extension to RSS for paid, tiered, time-gated, group-shared, and privacy-preserving content. The spec is feature-complete at 0.4. The path to 1.0 is about shipping working implementations, getting them independently adopted, establishing neutral governance, and securing an RFC number.

The single most important strategic update since 0.4 was drafted: **FeedPress and Outpost already sell a proprietary version of this to Ghost publishers**. 404 Media, Aftermath, and others are live paying customers. The implementations work; what the market lacks is interoperability. This is the exact gap an open spec fills — and it means the `om` pitch to publishers changes from "help us prove this can work" to "here's the open version of what you're already paying for."

## 18-month milestones

- **Month 3:** `om-ghost` plugin v0.1 running on a test Ghost instance, emitting feeds compliant with `om` 0.4
- **Month 6:** First non-affiliated publisher in production. First paid subscriber paying a real publisher through `om` checkout flow and reading in a reader that doesn't know who wrote the spec.
- **Month 9:** Test suite v1, three production publishers, custodian commitment signed, working group of 5–8 seated.
- **Month 12:** Second reference reader (NetNewsWire or equivalent mobile), WordPress plugin, five publishers, first funded engineering cycle started.
- **Month 15:** RFC Independent Submission filed with Implementation Status section listing all live deployments.
- **Month 18:** 1.0 released. Ten publishers minimum, test suite certifies conformance, custodian hosts the spec permanently.

## Budget

Realistic minimum to hit the 18-month plan is roughly €180,000–€250,000 across all sources. Split across three funding tracks (Sovereign Tech Fund infrastructure grant, NLnet NGI Zero development grant, Stripe Open Source sponsor). See FUNDING.md for breakdowns. A bootstrapped path with unpaid maintainers can reach month 6 but probably not month 18.

## What this package is NOT

Not a business plan. Not a startup. The work product is an open protocol under a perpetual permissive grant, held by a neutral custodian. The funding pays for maintenance and reference implementations, not equity. The reference implementations are open source. The goal is that the protocol outlives any individual maintainer or funder.
