# Funding plan

Where the money comes from for the 18-month plan to ship Open Membership RSS to 1.0. Budget detail lives in [BUDGET.md](BUDGET.md). Each funder has its own file with the application text ready to paste into the form (or to send as an email). The intent is that none of these need rewriting before they go out, only updating dates, contact details, and the fiscal-sponsor line.

## What we need

~€205,000 across 18 months for direct engineering and event spend. Of that, ~€130,000 in grants is the realistic target. The rest comes from publisher contributions and individual donations or, failing that, a slower roadmap with more volunteer time.

Critical-path work is in Phase 1 (working Ghost + Miniflux demo, M1-M3) and Phase 3 (test suite + custodian, M7-M9). Interop-track work is deliberately off the critical path.

## Where to apply, in order

The applications go out in sequence, not in parallel. Each one cites the previous as in-flight, which costs nothing and helps the next reviewer. Sequencing also stops a single bad week of writing from torpedoing all three.

| # | Funder | Programme | Ask | Deadline | Status |
|---|---|---|---|---|---|
| 1 | NLnet Foundation | NGI Zero Commons Fund | €50,000 | rolling, next 1 June 2026 | primary |
| 2 | SIDN Fonds | Theme call (Internet & society) | €25,000-€50,000 | rolling | NL backup |
| 3 | Sovereign Tech Fund | Contract Work | €60,000-€80,000 | rolling | stretch |
| 4 | Stripe Open Source | discretionary / DevRel | $25,000 or engineer time | none | informal |

If 1 and 2 both land, the budget is covered through Phase 4. If only 1 lands, Phase 4 slips by ~3 months but the project keeps moving. If none land, the fallback in §"What if everyone says no" applies.

## Timing

```
2026-05  send NLnet application (deadline 2026-06-01)
2026-06  decision expected from NLnet within 8 weeks
2026-07  send SIDN Fonds application
2026-09  send Sovereign Tech Fund inquiry once om-ghost is in production
2026-10  approach Stripe DevRel with a working demo
```

Each NLnet round runs on a fixed cadence (1st of every even month). If the June round is missed for any reason, application not finished, fiscal sponsor not in place, August is the next slot. The plan does not depend on hitting June specifically; it depends on not waiting longer than August.

## Fiscal sponsor

NLnet, SIDN Fonds, and STF all pay to a legal entity with a bank account, not to a project. Open Membership does not yet have a permanent custodian (the four candidates, Internet Archive, Sovereign Tech Fund itself, NLnet, Software Freedom Conservancy, are tracked in [`docs/GOVERNANCE.md`](../../docs/GOVERNANCE.md), and Phase 3 outreach is when one is locked in).

**Interim fiscal sponsor: leme** (Netherlands). IBAN `NL77 ADYB 1000 0421 82`, BIC `ADYBNL2A` (Adyen-issued business IBAN). Contact: Leander Jansen, leander@leme.nl.

leme holds the grant funds and pays out to engineers and reviewers per the budget. When a permanent custodian is named in Phase 3, code ownership transfers to the custodian; any residual budget transfers with it. This avoids Open Collective's 10% overhead and gives every funder a single Dutch counterparty.

The decision is made; the same fiscal-sponsor block goes into all four applications.

## What if everyone says no

The project survives. The eighteen-month timeline does not.

- 1.0 slips from M18 to ~M24.
- Test suite (Phase 3) ships partial, with Levels 6/7/8 deferred until funding lands.
- Second reader (Phase 4) becomes opportunistic, a NetNewsWire fork happens if a NetNewsWire contributor adopts it, or it doesn't.
- Working group meets less frequently; the IndieWebCamp event in Phase 6 becomes a smaller meet-up.

What does not change:
- Spec work continues at maintainer pace.
- `om-ghost` and `om-wordpress` reach Level 5 because they're already most of the way there.
- The IETF submission (Phase 5) still goes in, just later.

The plan is robust to two of three rejections and degrades gracefully on three of three. The shape that kills the project is over-committing to a budget and then not raising it; that's why each phase's deliverables are scoped to be doable on the volunteer-only timeline if necessary.

## Files

- [`BUDGET.md`](BUDGET.md), phase-by-phase spend, by month
- [`nlnet-ngi-zero-commons.md`](nlnet-ngi-zero-commons.md), primary application, paste straight into the NLnet form
- [`sidn-fonds.md`](sidn-fonds.md), Dutch backup, theme call
- [`sovereign-tech-fund.md`](sovereign-tech-fund.md), stretch application, post-Phase-1
- [`stripe-open-source.md`](stripe-open-source.md), informal email to DevRel

The text in each file is the actual content to send, not a draft to rewrite. Update the dates, the fiscal-sponsor block, and the contact name; everything else is ready.
