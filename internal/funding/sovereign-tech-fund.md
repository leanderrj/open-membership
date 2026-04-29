# Sovereign Tech Fund

**Funder:** Sovereign Tech Fund (Germany; programme run by Sovereign Tech Agency, funded by BMWK)
**Programme:** Contract Work (the long-form maintenance grant)
**Submission URL:** https://www.sovereigntech.fund/programs/contract-work
**Deadline:** rolling
**Ask:** €60,000-€80,000 over 12 months
**Status:** stretch; only send after `om-ghost` is in production with at least one paying publisher
**Payee:** leme (Netherlands), IBAN `NL77 ADYB 1000 0421 82`, contact leander@leme.nl

---

## Honest assessment of fit

STF normally funds critical infrastructure that is *already deployed* and needs maintenance, hardening, or specific feature work. They are not a venture funder; they are an OSS-maintenance funder with a security frame. The 2023 socialweb.coop grant for ActivityPub test infrastructure is the closest analog, it funded an existing initiative's interop work, not a from-scratch build.

This means: **don't send the STF application during Phase 1**. The honest answer to "is this critical infrastructure?" while we're still writing v0.1 is "not yet." Send the STF application after Phase 2 wraps and the project has at least one production publisher and a couple of independent reader implementations. At that point the infrastructure case is real; "critical" is shorthand for "if this breaks, real publishers and real subscribers feel pain."

The right STF angle for `om` is the **interoperability test suite**, not the reference implementations themselves. NLnet funds the implementations (because that's NLnet's wheelhouse); STF funds the test infrastructure that keeps multiple independent implementations honest (because that's STF's wheelhouse, with the socialweb.coop precedent to back it).

If `om-ghost` is in production with a publisher and a Miniflux fork, and a WordPress plugin is mid-flight, the STF application gets sent. Until then, hold.

## Application content

STF's application form is more involved than NLnet's. It expects: a problem statement, a list of work items, a budget and timeline per work item, a maintenance plan, and a description of who depends on the project. The text below is what to send when the application moment arrives.

### Problem statement

The Open Membership RSS protocol (`om`) is the open-spec interoperability layer for paid content delivered over RSS. Two reference implementations exist: a Ghost plugin (funded by NLnet, in production with [n] publishers as of submission) and a Miniflux fork (also NLnet-funded, ~[n]k users running it). A WordPress plugin is in development. Three more reader integrations are in scope for the next year.

For the protocol to remain interoperable across these implementations, an automated test suite has to verify each implementation against the spec at every conformance level, eight levels in total, from basic feed parsing to bundle aggregation across publishers. Without a public, automated, hosted test suite, "this implementation conforms to `om`" is an unverifiable marketing claim, and the protocol fragments into per-vendor interpretations within a year.

The role we are asking STF to fund is the same role socialweb.coop plays for ActivityPub: independent test infrastructure that any implementation can run against and any user can audit.

### Work items

**WI-1, Test suite infrastructure: €30,000**

A hosted test service at `test.openmembership.org` that any publisher or reader implementation can submit a feed URL or implementation report to and receive a public conformance pass/fail per level. Built in Go (matching the reference Miniflux fork's language). Test fixtures published as a separate repository so other test runners can consume them.

Deliverables: hosted service live, fixture repository with at least 200 test cases across Levels 1-5, public dashboard of certified implementations.

**WI-2, Cryptographic verification (Levels 4 and 7): €25,000**

The privacy-preserving credential profiles in `om` rest on W3C Verifiable Credentials 2.0 and the BBS+ cryptosuite (`bbs-2023`). Verifying that an implementation's credential issuance, presentation, and selective-disclosure derivations are correct is harder than parsing XML; it requires running real cryptographic test vectors against the implementation's verification path.

Deliverables: a test harness that produces VC and BBS+ test vectors, runs them against an implementation's verification endpoint, and reports pass/fail per cryptographic invariant. Integrates with WI-1's hosted service.

**WI-3, Public certification programme and report: €10,000**

A documented certification process: an implementation submits, the test runs, the result is public. Quarterly public reports on ecosystem health (number of certified implementations, errata raised through testing, security findings).

Deliverables: certification documentation; first ten implementations certified; first public report.

**WI-4, Maintenance reserve: €15,000**

Funds for reactive work: spec errata that surface during testing, security findings, integration support for new implementations. Twelve months of part-time maintainer presence.

### Maintenance plan

After this contract ends, the test suite runs on:

- The hosted service at `test.openmembership.org` is paid for by the working group's general operating budget (currently €500/month for hosting; covered by individual donations and publisher contributions).
- The fixture repository is community-maintained. Errata and new fixtures land via pull request from implementers as new edge cases are discovered.
- The certification report is generated automatically every quarter from the test results; a working-group volunteer reviews and publishes.

The work this grant funds is the initial build. Ongoing maintenance is engineered down to a level a volunteer working group can sustain.

### Who depends on this

At submission time, the answer should be at least: two production publishers running `om-ghost`, the Ghost AP team if our co-existence appendix is in production by then, the Miniflux fork's user base, the WordPress plugin's pilot publishers, and at least one investigative-journalism publication relying on the privacy mode. The test suite is what turns those independent users into a coherent ecosystem instead of four point integrations.

The honest framing for STF: today, "depends on this" is a small group. In twelve months, with the test suite live, it can be the open-internet-side answer to Substack and Patreon for any publisher who chooses to use it. STF's mandate is to fund the work that turns small open ecosystems into resilient ones; this is exactly that work.

## Cover email (when ready to send)

Subject: `Sovereign Tech Fund inquiry, Open Membership RSS interoperability test suite`

Hello,

Open Membership RSS is an open-spec extension to RSS for paid content. The specification is at version 1.0-rc *(adjust as appropriate)*. Two reference implementations are in production, a Ghost plugin and a Miniflux fork, and a third (WordPress) is in pilot.

We're writing to ask about Contract Work funding for the protocol's interoperability test suite. The test suite role is structurally analogous to socialweb.coop's role for ActivityPub: hosted, independent, public-pass/fail conformance verification across multiple implementations. Without it, the protocol can't credibly claim to be open in the IETF sense.

The full work-item breakdown is in the attached PDF. The ask is €70,000 over twelve months, split across four work items. The most distinctive piece is verification of the privacy-preserving credential profiles, which requires running W3C VC 2.0 and BBS+ test vectors against implementations' verification paths.

We've been pointed at the 2023 socialweb.coop grant as the closest precedent for this category of work. The shape is the same; the protocol is different.

Happy to come to Berlin for a conversation if useful, or do this remotely.

Best,
Leander Jansen
leander@leme.nl
