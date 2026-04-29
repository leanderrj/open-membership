# SIDN Fonds — Theme call (Internet & society)

**Funder:** SIDN Fonds (the .nl registry's foundation)
**Programme:** Theme call, Internet & society track
**Submission URL:** https://www.sidnfonds.nl/aanvragen
**Deadline:** rolling, decisions every two months
**Ask:** €25,000 over 6 months
**Status:** secondary; send after NLnet, position as parallel track
**Payee:** leme (Netherlands), IBAN `NL77 ADYB 1000 0421 82`, contact leander@leme.nl

---

SIDN Fonds funds projects "for a stronger and more secure internet for everyone in the Netherlands." They have funded protocol work before (DNSSEC tooling, IPv6 deployment work, identity projects). They prefer projects with a clear Dutch-society relevance, but they have funded internet-wide protocol work where the Dutch dimension was secondary.

The fit for `om` is real but smaller than NLnet. The pitch leans on Dutch independent journalism as the user population. Dutch publications running on Ghost or WordPress (NRC's blog network, Tweakers, De Correspondent's older infrastructure, Apache, individual investigative outlets) all pay the Substack-Patreon vendor tax today; `om` is the open alternative.

## Application content

The SIDN Fonds form is shorter than NLnet's. The required fields are: project description, target group, budget, timeline, and how the project benefits the Dutch internet. Below is the text.

### Project description

Open Membership RSS (`om`) is an open-spec extension to RSS that lets any publisher charge for content and any reader unlock it, without depending on Substack, Patreon, or another closed platform. The protocol adds a small set of namespaced elements to a standard RSS feed and a JSON discovery document at `.well-known/open-membership`. A reader app fetches the feed, recognises the gated items, and unlocks them by presenting a credential the publisher issued at checkout. The credential is portable across reader apps; the spec defines an export format so a subscriber moving between apps does not have to re-subscribe.

The specification is at version 0.4 (draft, feature-frozen). Two reference implementations are scheduled — a plugin for Ghost (the most-used indie-publisher CMS) and a fork of Miniflux (a self-hosted RSS reader). The work this grant funds is the production deployment of these two implementations with at least one Dutch publisher.

### Target group

Independent Dutch publishers running paid content on platforms they own — primarily Ghost, WordPress, and to a lesser extent Hugo or Eleventy. The estimated population is 200–500 publications across investigative journalism, niche commentary, technology writing, and specialist newsletters. Most of them currently route their paid-subscription revenue through Substack (which takes 10% plus Stripe fees) or Patreon (which takes 5%–12%). A meaningful subset of them — including parts of the Tweakers, NRC, and De Correspondent ecosystems — already self-host on Ghost or WordPress but have no portable paid-RSS mechanism, so their paying subscribers cannot read in their preferred RSS reader without manual cookie-juggling.

### Why this benefits the Dutch internet specifically

Three reasons.

First, Dutch journalism's subscription infrastructure currently routes through American platforms (Substack, Patreon, Stripe-as-a-service). Reducing that dependency without forcing every publication to negotiate bilaterally with each vendor is exactly what an open standard is for. NLnet's NGI portfolio frames this as digital sovereignty; the same frame applies to the Dutch internet ecosystem more narrowly.

Second, the Dutch language has a small enough audience that the ad-supported model has never worked well for serious journalism. Subscription-based publications are how Dutch independent journalism survives at all. Locking the subscription mechanism to American payment platforms makes Dutch publishers permanently dependent on US foreign-platform decisions. `om` decouples them.

Third, SIDN's own work on identity (eIDAS, the Dutch government's DigiD ecosystem, and the broader EU digital wallet initiative) creates the legal and infrastructural backdrop for the privacy mode `om` defines (Verifiable Credentials with selective disclosure). When EU digital identity wallets are deployed, an `om`-conformant publication is well-positioned to accept them as a subscription credential without re-engineering. SIDN funding for `om` is, in effect, an early bet on the publisher side of that ecosystem.

### Budget breakdown

| Line | Amount |
|---|---|
| `om-ghost` integration with at least one Dutch publisher (onboarding + bug-fix iterations) | €10,000 |
| Mollie PSP profile (the Dutch-relevant payment processor; spec already supports it, reference code needed) | €8,000 |
| Dutch-language documentation: spec abstract, publisher onboarding guide, reader integration guide | €4,000 |
| External review by a Dutch security or privacy researcher | €3,000 |
| **Total** | **€25,000** |

### Timeline

| Month | Deliverable |
|---|---|
| 1 | Mollie PSP profile reference code in `om-ghost`; passes integration tests |
| 2 | First Dutch publisher onboarded to a staging deployment |
| 3 | Publisher in production; first Dutch paying subscriber |
| 4 | Dutch-language docs published; security review commissioned |
| 5 | Security review delivered; any findings addressed |
| 6 | Public report on Dutch deployment, lessons, and follow-on work |

### Open-source commitments

All code released under MIT (matching the parent project's licensing). All documentation under CC-BY-4.0. No CLA. No private fork. Code lives in the project's public repository and transfers to the working group's custodian when that custodian is in place.

## Notes for the submitter

**Don't oversell the Dutch dimension.** It's real but it isn't enormous. SIDN Fonds reviewers will test the claim. The honest pitch: this is internet-wide protocol work whose first production deployment can be Dutch and whose Mollie PSP track makes Dutch publishers easier to onboard than American ones.

**Cite the NLnet application.** If the NLnet application has been submitted (or accepted), say so in the cover note. SIDN and NLnet do not coordinate formally but reviewers know each other's work.

**Pick the publisher before submitting.** SIDN reviewers will ask "which publisher" in the follow-up, and the strength of the answer matters. Ideally name two, one Ghost and one WordPress, both Dutch, both currently paying for proprietary paid-RSS infrastructure. Do not promise either is committed unless they are.

**The Mollie line item.** This is the strongest part of the application from SIDN's perspective. Mollie is Dutch; SIDN reviewers know Mollie's team. Building first-class Mollie support in the reference implementation is the clearest "this funds work that benefits the Netherlands specifically" deliverable in the budget.

## Cover email

Subject: `Open Membership RSS — application for the Internet & society theme`

Hello,

We're applying to SIDN Fonds for €25,000 over 6 months to bring the Open Membership RSS protocol to a first Dutch publisher in production, with a focus on Mollie payment integration and Dutch-language documentation.

The full application is in the attached PDF. Brief context: `om` is an open-spec extension to RSS that handles paid subscriptions without locking publishers to Substack or Patreon. The specification is at 0.4 draft, feature-frozen. Reference implementations for Ghost and Miniflux are funded separately by an NLnet NGI Zero Commons application currently in review *(or: accepted in [month])*. SIDN's grant covers the Dutch-specific deliverables: Mollie PSP support, a first Dutch publisher in production, and Dutch-language documentation.

I'm happy to come in for a short conversation if useful. The protocol composes with EU digital-identity work and with the existing .nl publishing ecosystem; both topics are easier to discuss in person than in writing.

Best,
Leander Jansen
leander@leme.nl
