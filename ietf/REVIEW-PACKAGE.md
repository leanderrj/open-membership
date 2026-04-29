# Open Membership RSS — External Review Package

**Cycle:** Phase 5 Month 14 — pre-IRSG public review of `draft-om-rss-membership-00`
**Window:** three calendar weeks of reviewer time, with a fourth week for editorial incorporation
**Outcome:** revision `-01` of the Internet-Draft, ready for submission to the IETF Independent Stream Editor in Month 15

This document is the cover, the per-reviewer briefs, and the editorial scaffold for the structured external review of the Open Membership RSS Internet-Draft and its companion subscriber-portability artifact. It exists so that a reviewer who has never opened the repository before can pick up exactly what they are being asked to do, what they should ignore, what return shape the working group expects, and how their feedback will be triaged.

If you are reading this because you have been invited to review: skip to the brief that matches your role (§3) and to the return-format section (§4). The rest is for the editor.

---

## 1. What is being reviewed

Two artifacts and one test report.

### 1.1 The Internet-Draft

[`draft-om-rss-00.md`](draft-om-rss-00.md), 1,900-odd lines in kramdown-rfc2629 source. Reviewers receive both the rendered HTML and the rendered TXT (with line numbers) so that comments can cite line numbers from the canonical TXT output rather than from the Markdown source.

The draft defines the `om` namespace as an extension to RSS 2.0 and RSS 1.0/RDF, covering authentication method declaration, tier description, per-item access policy, payment service provider declarations, time-gated content, group subscriptions (publisher-managed and SCIM-bound), the OM-VC and OM-VC-SD verifiable-credential profiles (the latter with BBS+ selective disclosure for unlinkable per-publisher pseudonyms), bundle aggregation, gifting, proration, and revocation.

The draft is structured as a normative spec body followed by Security Considerations, Privacy Considerations, IANA Considerations, an Implementation Status section per RFC 7942, an Acknowledgments section, and five appendices (two worked examples, the discovery-document shape, design-rationale pointers, and a conformance-levels summary).

### 1.2 The companion specification

[`../spec/SPEC-PORTABILITY.md`](../spec/SPEC-PORTABILITY.md), 581 lines, version 1.0. A cross-reader export/import shape for a user's stored tokens, credentials, receipts, bundle memberships, and pending gifts. JSON-LD body, optionally encrypted with age or JWE, passphrase-based. Submitted to the IRSG as an informational companion artifact, not as its own draft.

### 1.3 The round-trip test report

The portability round-trip harness at [`../reference/om-portability-roundtrip/`](../reference/om-portability-roundtrip/) implements a 26-test matrix: six credential shapes (`url-token`, `http-basic`, `bearer`-with-DPoP, `OM-VC`, `OM-VC-SD`-pseudonymous, group-membership) × two encryption envelopes (age, JWE) + fourteen edge cases (rotated keys, expired validFrom, revoked entries, mid-period upgrades, partial bundle imports, etc.). The harness produces a Markdown test report at `reference/om-portability-roundtrip/reports/` showing pass/fail per cell. Reviewers receive the most recent report from the working group's CI run.

---

## 2. Review timeline

| Phase 5 milestone | Calendar | Action |
|---|---|---|
| M13 Week 3 | mid-month | Editor identifies five candidates per role; drafts one-paragraph pitches |
| M13 Week 4 | end of month | Asks sent; reviewers commit yes/no within 72 hours |
| M14 Week 1 | start of month | Fall-back candidates approached for any declines; final five confirmed by Friday |
| M14 Weeks 1–3 | three weeks | Review window. Reviewers submit comments using the format in §4 |
| M14 Week 3 Friday | cutoff | Comments received after this date roll into 1.x errata, not into revision -01 |
| M14 Week 4 | one week | Editorial incorporation. Editor triages every comment to accept / decline / defer |
| End of M14 Week 4 | submission-ready | Revision `-01` lands; the artifact that goes to the IRSG in M15 |

Reviewers are paid for their time through the custodian's fiscal sponsor (see [`../docs/GOVERNANCE.md`](../docs/GOVERNANCE.md) §"Contributor compensation"). Effort budget per reviewer: ~one engineer-week. Editorial incorporation: ~one engineer-week of protocol-editor time.

---

## 3. Per-reviewer briefs

Five reviewers: three implementers and two non-implementers. Each brief is roughly two pages and lists what the reviewer is being asked to look at, what is explicitly out of scope for this review, and the questions the working group most needs answered.

### 3.1 Implementer-1 — independent CMS-side implementer

**Who you are.** You shipped a production deployment of `om` on a CMS that is *not* one of the working group's reference implementations (Ghost, WordPress). You read and implemented the spec from scratch as the engineer who actually had to make a publisher conform.

**What you are reviewing.** The full draft. You are the closest thing the working group has to a fresh implementation perspective — you did not co-design any of this, and you are the cleanest signal on whether the spec describes what someone has to build.

**The questions we most need answered.**

1. *Is the spec a sufficient implementation guide?* Where did you have to guess at semantics, infer from context, or reach out to the working group because the document did not say?
2. *Are the conformance levels well-formed?* When you advertised your conformance level, did the level you picked match what your code actually does, or did you find yourself between levels?
3. *Are the discovery-document fields complete?* Did you have to add fields to `.well-known/open-membership` that the spec does not describe? Did any required field turn out to be unnecessary in practice?
4. *Where is the spec wrong about reality?* Specifically: PSP behavior, webhook race conditions, token-rotation semantics, the interaction between `<om:revocation>` policy and Stripe's idempotency model. If you fought the spec to make a real PSP work, document the fight.
5. *Is anything missing that you wished were there?* Distinguish "would be nice" (defer to 1.x errata) from "I had to invent this and now my implementation does not interoperate" (block on this).

**Out of scope for your brief.** You do not need to read Security Considerations, Privacy Considerations, or the BBS+ cryptographic profile end-to-end unless your implementation touches them directly. Implementer-3 covers PSP binding profiles in depth; you may skim those.

**Return shape.** Per §4 below.

### 3.2 Implementer-2 — independent reader-side implementer

**Who you are.** You ship a feed reader (mobile, desktop, web, or self-hosted) that is *not* one of the working group's two reference readers (Miniflux fork, NetNewsWire fork or Feeder for Android, depending on which shipped at M11). You implemented `om` parsing, credential storage, the unlock flow, and — at Level 5 — the portability round-trip.

**What you are reviewing.** Spec §7 (conformance levels), §§4.3–4.8 (credential handling end to end), and the entire companion `SPEC-PORTABILITY.md`. The reader perspective is what tells the working group whether the wire-side contract actually composes with the storage-and-presentation side.

**The questions we most need answered.**

1. *Does the conformance level your reader implements describe what you actually built?* You picked, say, Level 2 + Level 5 (URL-token + Commerce). Did the spec's Level definition match your scope, or did you implement parts of Level 3 because you needed them?
2. *Is the credential-handling chapter coherent across credential shapes?* You handle URL tokens, OAuth bearers, OAuth+DPoP, and (if you got there) OM-VC presentations. Are the storage, refresh, rotation, and revocation rules consistent across them, or do you have credential-shape-specific code paths the spec does not acknowledge?
3. *Is the portability format implementable from the reader-side?* You exported memberships in your reader, imported them into a cooperating reader, and read the round-trip report. Did the spec describe everything you needed to know to produce a valid export that the destination reader could consume?
4. *What did you assume that the spec does not say?* Especially around: where credentials are stored (keychain, encrypted preferences, plain DB?), how token rotation interacts with offline-first reading, what happens when `om:revocation` policy says one thing and the publisher's server says another.
5. *UI considerations the spec touches but does not normalize.* The spec is intentionally silent on reader UX. Does that silence break anything when two readers present the same membership in incompatible ways, or is the silence correct?

**Out of scope for your brief.** You do not need to review PSP binding profiles, webhook semantics, or the publisher-side discovery flow beyond what your reader fetches. Implementer-1 and Implementer-3 handle those.

**Return shape.** Per §4 below.

### 3.3 Implementer-3 — PSP integration engineer

**Who you are.** You have shipped at least one production Stripe or Mollie integration. You may or may not have implemented `om`; what matters is that you have battle-tested intuitions about webhook idempotency, dispute handling, mid-cycle prorations, refunds, and the difference between "what a PSP's API documents" and "what a PSP's API actually does at scale."

**What you are reviewing.** Spec §2 (revocation), §6 (proration), §8 (publisher conformance), and the PSP binding profiles for Stripe, Mollie, PayPal, Adyen, Paddle, and Lightning. The published profiles inherit from spec 0.3.

**The questions we most need answered.**

1. *Do the PSP binding profiles survive contact with a PSP engineer?* Specifically: are the webhook handlers complete (retry, idempotency, ordering), are the mappings between `<om:feature>` and Stripe `lookup_key` correct under realistic Stripe-side renaming, do the dispute-handling cases (`charge.dispute.created`, `charge.dispute.funds_withdrawn`) match what actually happens during a chargeback?
2. *Is the revocation model implementable?* `<om:revocation policy="prospective-only" grace_hours="168">` declares intent. Does the publisher actually have the levers to enforce this against Stripe's billing engine, or does the spec describe a policy the PSP cannot honor?
3. *Is proration coherent across PSPs?* Stripe handles mid-cycle upgrades natively; Mollie does not. Does `<om:proration>` accurately describe both, or does it leak Stripe-isms into a profile that Mollie publishers cannot satisfy?
4. *Are the trial-period semantics correct?* `<om:trial>` is fine in isolation. Does it interact correctly with PSP-side trials (Stripe trials, Mollie one-off discounts, Lightning prepaid grace)?
5. *Lightning-specific question.* The Lightning binding profile is the simplest because Lightning has no recurring-billing primitive. Is the binding honest about its limits, or does it describe a Lightning integration that does not actually compose with how publishers bill subscribers?

**Out of scope for your brief.** Verifiable Credentials, BBS+ cryptography, the privacy model end-to-end. You can skim those.

**Return shape.** Per §4 below.

### 3.4 Security reviewer (non-implementer)

**Who you are.** A named security researcher with IETF history or published work on OAuth 2.0, DPoP, token replay, or credential lifecycle. Probable pools: the Sovereign Tech Agency's ActivityPub test-suite security reviewers; published authors of recent OAuth-WG drafts; researchers from the academic security community working on credential systems.

**What you are reviewing.** The Security Considerations section in full; spec §§2.3 (PSP webhook mapping), §4 (selective disclosure under BBS+); the companion `SPEC-PORTABILITY.md` §12 (security considerations for the portability format).

**The questions we most need answered.**

1. *Is the Security Considerations section adequate by IETF standards?* Specifically by RFC 3552 conventions: does it identify the threat model, the attack surface, and the residual risks; does it cite or define mitigations; does it acknowledge the limits of those mitigations?
2. *What attack classes does the document miss?* The working group expects you to find at least three the document does not name. Plausible candidates: token-replay across a TLS-terminating reverse proxy, race conditions between revocation propagation and credential caching, downgrade attacks against the discovery document, supply-chain attacks against PSP binding implementations, side-channel leakage in BBS+ proof generation. Do not stop at three if you find more.
3. *Does the BBS+ selective-disclosure profile (§4 and OM-VC-SD 1.0) hold up?* You are the working group's check on whether the cryptographic claims are correctly stated and whether the cryptosuite pinning model is sound. Specifically: is the rotation policy survivable when a credential is revoked mid-presentation, and does the `bbs-2023` candidate-recommendation tracking model give implementers enough warning to upgrade?
4. *Webhook-mapping security.* Does §2.3 correctly handle webhook signature verification, timestamp tolerances, replay windows, and retry-from-the-PSP semantics? PSP-issued webhooks are the most common attack surface in production paid-content systems.
5. *Portability-file compromise.* `SPEC-PORTABILITY.md` §12 names the compromise modes. Are the encryption-envelope choices (age, JWE) defensible? Are the passphrase-derivation rules adequate against an offline brute-force attacker?

**Out of scope for your brief.** UX, reader-side ergonomics, governance. You may skip the appendices.

**Return shape.** Per §4 below. Security findings additionally get an explicit severity tag (`info` / `low` / `medium` / `high` / `critical`) and a clear "must-fix-before-submission" / "fix-in-1.x" recommendation.

### 3.5 Privacy reviewer (non-implementer)

**Who you are.** A W3C Verifiable Credentials WG member, or a published privacy researcher with work on selective disclosure, pseudonymous credentials, or unlinkability under issuer-verifier-holder threat models. The W3C VC WG liaison may recommend candidates if seated by M13.

**What you are reviewing.** The Privacy Considerations section in full; spec §4 (selective disclosure), §10 (cross-reader migration); `SPEC-PORTABILITY.md` §8 (privacy and unlinkability).

**The questions we most need answered.**

1. *Does the privacy model hold up under RFC 6973 threat-model conventions?* Are the entities, identifiers, observers, and threat classes correctly identified? Is the analysis honest about which threats `om` mitigates and which it does not?
2. *Are the limits of pseudonymity acknowledged honestly?* The working group's stated position is that OM-VC-SD provides per-publisher unlinkability *modulo* timing analysis, payment-graph analysis, and content-correlation attacks (i.e., publishers can still infer "the user who reads X tends to read Y" via subscription timing or the same-IP-different-pseudonym fingerprint). Does the document acknowledge this clearly enough that a publisher reading the spec does not over-promise to their subscribers?
3. *Group privacy.* `<om:group admin="self-managed">` exposes a roster to the publisher's group admin. The privacy considerations for this are weaker than for individual subscriptions. Is the spec clear that group members trade privacy for the convenience of group billing?
4. *Cross-reader migration leaks.* When a subscriber moves from Reader A to Reader B via `SPEC-PORTABILITY.md`, what does the destination reader learn about the source reader's behavior, and what does the publisher learn from the resulting re-authentication? Is §10 (cross-reader migration) adequate?
5. *Unlinkability across publishers in the bundle case.* `<om:bundled-from>` introduces a third party (the aggregator) into the trust chain. Does the bundle credential profile preserve unlinkability across participating publishers, or does the aggregator become a correlator of reading behavior?

**Out of scope for your brief.** Cryptographic implementation details (covered by the security reviewer), PSP ergonomics, conformance-level taxonomy.

**Return shape.** Per §4 below.

---

## 4. Return format

Reviewers return a single Markdown document, one document per reviewer, named `review-<role>-<initials>.md` (e.g., `review-implementer-1-ams.md`). The document has a fixed shape:

### 4.1 Document header

```markdown
# Review of draft-om-rss-membership-00

- Reviewer: <Name, Affiliation>
- Role: <Implementer-1 | Implementer-2 | Implementer-3 | Security | Privacy>
- Date: <YYYY-MM-DD>
- Artifacts reviewed: <draft-om-rss-membership-00 + SPEC-PORTABILITY.md 1.0 + test report (date)>
- Time spent: <approximate hours>
- Conflict-of-interest disclosure: <none | description>
```

### 4.2 Comments

Every substantive comment is one entry in the form:

```markdown
### Line <N> — <one-line summary>

**Section:** <e.g., §3.4.2 or "Security Considerations / Token Replay">
**Severity:** <blocking | major | minor | nit>     (security reviews additionally use info/low/medium/high/critical)
**Issue:** <what is wrong, ambiguous, or missing>
**Proposed fix:** <a diff, a prose suggestion, or "needs working group discussion">
```

The line number is the line in the rendered TXT output of the draft, not the Markdown source. The `xml2rfc` toolchain ships line numbers in the TXT artifact; reviewers cite those so the editor can find the exact location regardless of source-file reflow.

For the companion `SPEC-PORTABILITY.md`, comments use the Markdown line numbers directly because that document is consumed in Markdown form.

Severity guide:
- **blocking** — the spec is wrong; submission must wait for a fix.
- **major** — the spec has a real defect that should be fixed before -01 if possible; falls to errata otherwise.
- **minor** — the spec is unclear or could be improved; defer to 1.x errata is acceptable.
- **nit** — typo, grammar, formatting. Always accepted unless they conflict with kramdown-rfc syntax.

### 4.3 Free-form summary

A short closing paragraph (~200 words) capturing the overall impression: is the document submission-ready, what is the single most important thing to fix, what surprised the reviewer.

### 4.4 Sign-off attestation

The last line of every review is:

```markdown
---

I, <Name>, attest that this review reflects my independent judgment of the artifacts listed above.
I am being compensated <yes / no / engineer-time-only> for this review through <funding source>.
I will be acknowledged by name in the published RFC unless I request otherwise.
```

The attestation goes into the IRSG submission package per `plans/PHASE-5-6.md` §2.4 ("External review attestation").

### 4.5 Submission

Reviewers commit their review document to `ietf/reviews/` in the repository as a pull request. The pull request title is `review: <role> — <initials>`. The editor merges as-is — no edits to reviewer text. Disposition (accept / decline / defer per comment) happens in a separate file (§5).

---

## 5. Editorial process

### 5.1 Triage

Within five working days of M14 Week 3 Friday cutoff, the protocol editor reads every comment in every review and triages each into one of three buckets, recorded in `ietf/REVIEW-DISPOSITIONS.md`:

- **accept** — the comment lands as a diff in the draft. The disposition entry cites the review filename and line, and links to the commit.
- **decline** — the comment does not land. The disposition entry cites the review and gives a reason (working group consensus, contradicts another reviewer, out of scope, etc.). The reviewer is notified on the GitHub issue.
- **defer** — the comment is real but does not block the -01 revision. It moves to the 1.x errata backlog at `spec/SPEC-ERRATA-1.x.md` (created at M17 errata freeze if not earlier). The disposition entry cites the review and the errata-backlog issue number.

No comment is silently rejected. The disposition file is public.

### 5.2 Diff-and-respond

For every **accept**, the editor pushes a commit to the `-01` branch with the suggested fix. The commit message cites the review and the comment's section header.

For every **decline**, the editor opens or comments on the relevant GitHub issue with the reasoning. If the working group disagrees with the editor's decline, the issue stays open and is resolved by majority vote per `../docs/GOVERNANCE.md` §"Decision-making."

For every **defer**, the editor opens an errata-backlog issue tagged `1.x-errata`.

### 5.3 Conflict resolution

When two reviewers disagree (e.g., the security reviewer flags a behavior as unsafe and an implementer reviewer reports it as necessary for production), the editor surfaces the conflict in the working-group sync that week. The decision is a working-group call, not the editor's. Both reviewers are notified of the resolution; the disposition file records both perspectives and the chosen outcome.

### 5.4 The -01 revision

By end of M14 Week 4, the editor produces revision `-01` with all **accept** changes incorporated. The diff between `-00` and `-01` is published as `ietf/diff-00-to-01.md`. The diff plus the disposition file plus the five reviews are bundled into the `ietf-submission/2026-MM/` directory along with the other eight artifacts listed in `plans/PHASE-5-6.md` §2.4 ("Submission package checklist").

### 5.5 Late-arriving feedback

Comments that miss the M14 Week 3 Friday cutoff are not silently lost — they are appended to the 1.x errata backlog with attribution. Reviewers are warned of the cutoff in their initial brief and again on M14 Week 3 Monday.

---

## 6. Reviewer compensation

Per `../funding/BUDGET.md` Phase 5 line ("External review (security + privacy reviewers): €3,000"), the budget covers paid reviewer time at roughly one engineer-week each for the two non-implementer reviewers. The three implementer reviewers are paid in the same Phase 5 line (rolled in) when the working group can fund them; in practice, implementer reviewers are sometimes already employed by organizations that consider this work part of their open-source contribution time, in which case they decline payment and the residual budget rolls forward into 1.x errata work.

The compensation arrangement is documented per reviewer in their sign-off attestation (§4.4) so the IRSG submission package is honest about what was paid.

If grant funding for this line has not landed by M13 Week 3, the editor pauses outreach. Asking reviewers to commit a week of work without a payment path is not acceptable. Fall-back: defer the -01 revision to M15 if funding lands during M14, or proceed with `-00` as the submission artifact and treat the M14 reviews as 1.x errata input. The IRSG submission still goes in M15; the package is just less polished.

---

## 7. After the review

The five reviews, the disposition file, and the diff become permanent artifacts of the spec's history. They are referenced in the published RFC's Acknowledgments section by name (with reviewer permission per §4.4) and they are linked from the custodian's spec page so that future implementers can read the working group's reasoning on every comment.

The reviewers are also invited — separately, by the paid coordinator, after the submission email goes — to attend the in-person event in M16 (`ROADMAP.md` Phase 6 M16). Attendance is optional and travel-subsidized from the event line of the budget.

The review process is the moment where `om` stops being a working-group artifact and starts being a public protocol. Treat it accordingly.

---

## 8. Index of artifacts produced by this package

Created at the start of M14:

- `ietf/REVIEW-PACKAGE.md` — this document
- `ietf/REVIEW-DISPOSITIONS.md` — empty scaffold; the editor populates during Week 4 triage
- `ietf/reviews/` — directory; reviewer pull requests merge here

Created during M14:

- `ietf/reviews/review-implementer-1-<initials>.md`
- `ietf/reviews/review-implementer-2-<initials>.md`
- `ietf/reviews/review-implementer-3-<initials>.md`
- `ietf/reviews/review-security-<initials>.md`
- `ietf/reviews/review-privacy-<initials>.md`

Created at the end of M14 Week 4:

- `ietf/draft-om-rss-01.md` — the revised draft
- `ietf/diff-00-to-01.md` — the human-readable diff between revisions

Bundled into the M15 submission package at `ietf-submission/2026-MM/`:

- The `-01` draft and rendered HTML/TXT
- The five reviews
- The disposition file
- The diff
- The companion `SPEC-PORTABILITY.md` 1.0
- The portability round-trip test report
- The conformance registry snapshot
- The errata log
- The cover letter to the Independent Stream Editor
