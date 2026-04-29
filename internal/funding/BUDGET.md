# Budget

Eighteen-month phased budget. All figures in euros, rounded.

## By phase

### Phase 1, Ship something real (M1-M3)

| Month | Work | Effort | Cost |
|---|---|---|---|
| M1 | Ghost plugin v0.1 scaffolding | 1 engineer-month | €15,000 |
| M2 | Stripe integration and entitlements | 1 engineer-month | €15,000 |
| M3 | Miniflux reader fork (overlapping M2) | 2 engineer-months parallel | €30,000 |
| **Total** | | **3 engineer-months** | **€60,000** |

### Phase 2, First outside publisher (M4-M6)

| Month | Work | Cost |
|---|---|---|
| M4 | Production hardening, Stripe live, Mollie PSP, webhook hardening | €10,000 |
| M4 | External security review (consultant, a few days) | €3,000 |
| M4 | i18n (`tax_inclusive` on `<om:price>`) + anti-sharing primitive v0 | €4,000 |
| M5 | Publisher outreach and onboarding (mostly time) | €5,000 |
| M6 | First live paying subscriber + 0.4.1 errata | rolled into M4/M5 |
| **Total** | | **~€22,000** |

### Phase 3, Governance and test infrastructure (M7-M9)

| Month | Work | Cost |
|---|---|---|
| M7 | Custodian outreach | time only |
| M8 | Grant applications | time only |
| M9 | Publisher test suite v1 | €15,000 |
| M9 | Reader conformance harness | €10,000 |
| M9 | Atom + JSON Feed appendix work | €3,000 |
| **Total** | | **~€28,000** |

### Phase 4, Second reader, WordPress, replication (M10-M12)

| Month | Work | Cost |
|---|---|---|
| M10 | WordPress plugin | €20,000-€30,000 |
| M10 | Platform Adapter Profile (incl. WooCommerce + Memberful validation) | €6,000 |
| M11 | Second reader (NetNewsWire fork or Feeder for Android) | €20,000 |
| M11 | Static-site reference (Eleventy + Cloudflare Workers) | €12,000 |
| M12 | Publisher replication (outreach + onboarding) | rolled in |
| M12 | ActivityPub co-existence appendix (coordination + writing) | €5,000 |
| **Total** | | **~€68,000** |

### Phase 5, IETF submission prep (M13-M15)

| Month | Work | Cost |
|---|---|---|
| M13 | Markdown-to-IETF format conversion (technical writer) | €8,000 |
| M13 | Subscriber portability format (spec + Miniflux↔NetNewsWire round-trip proof) | €3,000 |
| M14 | External review (security + privacy reviewers) | €3,000 |
| M15 | IRSG submission | time only |
| **Total** | | **~€14,000** |

### Phase 6, 1.0 release and event (M16-M18)

| Month | Work | Cost |
|---|---|---|
| M16 | First IndieWebCamp-style event (venue, food, travel subsidies) | €8,000-€15,000 |
| M17 | 1.0 errata freeze and RC | time only |
| M18 | 1.0 released (press + comms) | rolled in |
| **Total** | | **~€15,000** |

## Totals

| | Amount |
|---|---|
| Direct engineering and event spend | ~€205,000 |
| Of which, interop-track work distributed across Phases 2-5 | ~€40,000 |
| Grant target | ~€130,000 |
| Gap to close from publisher contributions / individual donations | ~€75,000 |

Volunteer time, working group, reviewers, event attendees, sits on top of all of this and is not budgeted.

## Critical path

Phase 1 (M1-M3) is non-negotiable. If it slips past M3, every later phase slips with it; the funding case in particular weakens because the NLnet and SIDN Fonds applications both rely on naming `om-ghost` as in flight or in production.

Phase 3 (M7-M9) is the second critical phase: the custodian needs to be lined up before grant money lands, because grants pay to legal entities. If the custodian decision slides, the working group's fiscal sponsor (Open Collective or equivalent) carries the money temporarily.

## Cost basis

Engineer-month is calculated at €15,000 = ~2,000 EUR/week loaded for an experienced contributor in Western Europe. This is below commercial consulting rates (€8,000-€15,000/month for someone of the same calibre at a market firm) and above NLnet's stated cost-recovery floor. The number is what an indie maintainer working on this part-time-or-full-time can sustain without burning out or losing rent money.

External security review and the technical-writer line are at consultant day rates: €1,000-€1,500/day for a few days of work each.
