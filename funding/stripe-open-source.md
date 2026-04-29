# Stripe Open Source

**Funder:** Stripe (informal; routed through Developer Relations, not a formal programme)
**Ask:** $25,000 cash, or 10 hours/month of a Stripe engineer's time, or both
**Deadline:** none
**Status:** informal; send only after `om-ghost` is in production and the Stripe binding profile is the most-developed PSP integration in the spec

---

## Why this is shaped as an email and not a form

Stripe doesn't run a structured open-source grant programme. Their model is discretionary — a DevRel manager has a small budget for sponsoring open-source work that benefits the Stripe ecosystem, and the way to access it is to know someone or to pitch directly. The application is a one-page email, not a form.

The right time to send this email is when there is a working `om-ghost` demo using Stripe Entitlements end-to-end, and the demo is doing something the Stripe team will actually be impressed by — paid RSS in any reader, with Stripe webhooks driving the entitlement lifecycle, with the chargeback path correctly handling the `<om:revocation>` declared policy. At that point, the email below has a working artifact behind it. Without that, this is a cold pitch with no demo, which is the worst version of this kind of ask.

## The email

Subject: `Open-source paid-RSS protocol using Stripe Entitlements — sponsorship enquiry`

Hi *(name of contact, ideally via warm introduction)*,

I maintain Open Membership RSS (`om`), an open-spec extension to RSS that handles paid subscriptions on top of standard feeds. The specification is at 1.0-rc *(or adjust)*. The reference Ghost plugin uses Stripe end-to-end: Stripe Entitlements drive the per-tier feature flags, Stripe Checkout Sessions handle the subscribe flow, and Stripe webhooks drive the entitlement lifecycle including chargebacks. The Stripe integration is the most-developed of the four PSP profiles in the spec; Mollie, PayPal, and Adyen all have profiles too, but Stripe's is the one that's actually production-validated.

A short demo: *(link to a 60-second video showing a paid RSS feed unlocking in Miniflux after a test-mode Stripe purchase, or a link to the live stack for Stripe folks to try themselves).*

We're asking Stripe to sponsor 12 months of maintenance on the Stripe binding specifically. Two paths, either or both:

**Cash:** $25,000 to leme (Netherlands; IBAN `NL77 ADYB 1000 0421 82`), the project's interim fiscal sponsor. Supports ~3 engineer-months of Stripe-binding maintenance — keeping current with Stripe API changes, reviewing implementation reports from publishers using `om-ghost` in production, contributing reference code back upstream.

**Engineer time:** A Stripe engineer contributes ~10 hours/month for a year as a public open-source contribution. Same effective value, also creates a "Stripe engineer reviewed this" signal in the binding profile that cash alone doesn't.

Why this is defensible from your side:

The protocol makes Stripe the default commerce layer for an entire open ecosystem of paid RSS content. Every publisher who adopts `om` is signing up as a Stripe merchant — typically a Substack-or-Patreon migration moving real subscription revenue onto Stripe directly. We're not asking for a partnership announcement, a logo placement, or exclusivity. The spec stays provider-agnostic; Stripe just happens to have the best-developed binding because Stripe has the richest API. If Mollie or Adyen later contribute equivalent engineering hours, the spec treats their contributions with the same weight.

Stripe has funded open-source protocol work before — the OpenAPI tooling, several IETF webhook drafts, parts of the TypeScript ecosystem. This is the same shape at a smaller scale.

Specific publishers are already using a proprietary version of this. FeedPress and Outpost run paid-RSS-for-Ghost as commercial products; 404 Media (run by veterans of Vice's tech coverage), Aftermath, and others are paying customers. Their underlying payment rail is Stripe in every case. The open-source `om-ghost` we're asking you to support is the version that exists when the FeedPress/Outpost contract isn't a precondition for being a Ghost-side Stripe merchant doing paid RSS.

Happy to do a 30-minute call. If the answer is no, no hard feelings; the question is worth asking once.

Best,
Leander Jansen
leander@leme.nl
*(personal contact / repository URL / project URL)*

## Notes for the sender

**Warm introduction beats cold email.** If you know anyone at Stripe DX or DevRel — through the Stripe-Indie-Hackers community, through past API work, or through someone who used to work there — route through them. Cold email to `developers@stripe.com` is a last resort.

**Don't send before there's a demo.** The credibility of this email is 80% in the demo link. Without one, it reads as speculative.

**Don't ask for a press release.** Stripe explicitly does not co-promote open-source grantees in marketing channels. Asking for it makes you look unfamiliar with how their programme works.

**The chargeback path is the strongest technical hook.** Stripe's chargeback handling is one of their most underused APIs and one of the most painful things to integrate correctly. `om`'s `<om:revocation>` declarations and the `charge.dispute.created` webhook handling in `om-ghost` are real, working solutions to a problem the Stripe team knows is hard. Mention this in the demo if there's time.

**$25,000 is below the threshold that requires Stripe executive approval.** A single DevRel manager can authorise it from discretionary budget. Don't ask for more; the friction goes up steeply above that line.

**If they say no.** That's fine. Stripe contributing engineering time without cash is also a real outcome and may be more useful in some ways (an actual Stripe engineer reviewing the binding profile is hard to buy with $25k of consultant time). Be ready to accept that variant.
