# Phase 5 and Phase 6 execution plan

Months 13–18 of the roadmap: convert the Markdown spec to an IETF Independent Submission, ship the subscriber portability round-trip proof, complete external review, submit to the IRSG, hold the first community event, freeze errata, and publish 1.0 at the custodian URL. See ROADMAP.md §"Phase 5" and §"Phase 6" for the authoritative scope; this plan schedules the work.

This plan adds no new protocol surface area. 0.4 is feature-frozen (SPEC.md §"Status"). Phase 5 and 6 produce editorial, governance, and conformance-evidence artifacts only.

## Shipped this session (agent-produced artifacts)

- [x] **IETF Internet-Draft** → `ietf/draft-om-rss-00.md` (1,926 lines in kramdown-rfc2629 format) — applies the PHASE-5-6.md §"structural disposition" table: SPEC.md §G, §H, and Part II deleted; worked examples collapsed into Appendix A; new Security / Privacy / IANA / Implementation Status sections written; full normative + informative reference blocks
- [x] **Subscriber portability round-trip harness** → `reference/om-portability-roundtrip/` — Go scaffold with shared types (canonicalize/checksum/signature/age/JWE), per-invariant checks (integrity, pseudonym preservation, privacy P1–P5, encryption, field preservation, collision merge), fixture-reader pair (reader_a url-token-preferring, reader_b bearer/VC-preferring), 6 canonical membership fixtures across credential shapes, 26-run test matrix, JSON + HTML report output

Remaining Phase 5–6 work is external/operational and cannot be agent-shipped: external reviewer recruitment + review, IRSG submission, IndieWebCamp venue booking, 30-day public comment period, 1.0 release press + archival copies to Internet Archive / Software Heritage.

---

## 1. Status snapshot — what Phase 5 inherits

Going into M13, assume the following are real (Phases 1–4 deliverables per ROADMAP.md):

- **Custodian committed.** Canonical spec URL hosted at the custodian's domain; signed one-page custodian agreement per ../docs/GOVERNANCE.md §"The minimum custodian agreement".
- **Publisher test suite + reader conformance harness live** at `test.open-membership.org` (ROADMAP.md M9). Same repo, two entrypoints.
- **Five publishers in production** across the three personas (ROADMAP.md Phase 4 M12).
- **Three publisher references:** `om-ghost`, `om-wordpress`, Eleventy + Cloudflare Workers (`om-static`).
- **Two readers:** Miniflux fork (Phase 1) and a second reader (NetNewsWire fork, Reeder, or Feeder — whichever materialized in M11).
- **Non-normative appendices drafted:** Atom + JSON Feed mappings (M9), Platform Adapter Profile (M10, externally validated against WooCommerce + Memberful), ActivityPub co-existence first draft (M12, may still be open-questions-flagged).
- **../spec/SPEC-PORTABILITY.md 1.0 draft exists** as of 2026-04-24 in the repo. Phase 5 M13 does not re-draft it; it proves it round-trips.
- **Errata stream:** one 0.4.1 release from Phase 2 M6, possibly an enclosure-auth errata from M12 if persona 2 onboarded late.

What is aspirational going in:

- The ActivityPub appendix may still be open-ended. It does not block Phase 5 — it can be an open question through 1.0 per ROADMAP.md risk register. The M16 event is the backup drafting venue.
- The anti-sharing primitive (`<om:sharing-policy>`) shipped provisionally in Phase 2 M4. It stays provisional through 1.0 unless a persona-2 deployment gave it a concrete shape. 1.0 publishes it as-is with the provisional marker intact.
- The fifth publisher may have onboarded late in M12; the test suite's conformance registry (../docs/GOVERNANCE.md §"Self-certification") may have only 3–4 listed implementations by M13 Week 1. This is fine — the Implementation Status section tightens as more land.

---

## 2. Phase 5 execution plan (months 13–15)

### 2.1 Month 13 — format conversion

#### Tooling decision: xml2rfc vs. kramdown-rfc2629

Two viable paths. The protocol editor (../docs/GOVERNANCE.md §"The working group" — "One protocol editor") owns the call. Decision deadline: **M13 Week 1, end of day Friday.** No spec work in either tool starts before the decision lands.

Criteria, weighted in this order:

1. **Editor familiarity.** If the protocol editor has used one before, that one wins. IETF editorial idioms are learnable in two weeks; a fight with unfamiliar tooling is not.
2. **Diff-friendliness in review.** Phase 5 M14 is a month of external review. A format where reviewers can send unified diffs is materially easier than one where they can't. kramdown-rfc wins on this criterion because the source is Markdown-with-frontmatter; xml2rfc sources are XML and diff is noisier.
3. **Round-trip with the 0.4 Markdown.** The existing SPEC.md is ~840 lines of GitHub-flavored Markdown. kramdown-rfc accepts a dialect close enough that most section bodies port without restructuring; only the metadata frontmatter and reference blocks are new. xml2rfc requires re-expressing every paragraph as XML.
4. **Publisher toolchain stability.** Both produce RFC-XML v3 for the datatracker. kramdown-rfc is a Ruby gem maintained by the RFC Editor's tooling group; xml2rfc is a Python tool also maintained by the same group. Either is fine for decade-scale stability.

Default pick if the editor has no prior preference: **kramdown-rfc2629.** Reasoning: criteria 2 and 3 dominate, and the 0.4 Markdown was drafted in a shape that ports.

Output of the decision: a one-page ADR in `plans/decisions/M13-W1-format-tool.md` citing which tool and why, signed by the protocol editor. This is the first entry in the Phase 5 decision log (§2.5).

#### Structural conversion checklist

The 0.4 Markdown is an encyclopedic document with two non-normative tails (§G open-spec analysis, §H incumbent analysis). IETF format is narrow and normative. Disposition:

| Current SPEC.md section | IETF disposition |
|---|---|
| §1 What This Version Adds | Deleted from IETF text. Version-difference prose belongs in a changelog, not an RFC. Preserved in the repo's `CHANGELOG.md`. |
| §2 Revocation | Retained verbatim; becomes §"Refund, Chargeback, and Revocation" in IETF draft. |
| §3 Cross-Publisher Bundles | Retained verbatim; becomes §"Cross-Publisher Bundles". §3.6 ("Why this doesn't recreate Spotify") moves to a non-normative design-rationale appendix. |
| §4 Selective Disclosure and Pseudonymous Tier | Retained verbatim; becomes §"Selective Disclosure". §4.5 "Implementation Note" becomes an informational sub-section. |
| §5 Gift Subscriptions | Retained verbatim. |
| §6 Proration | Retained verbatim. |
| §7–9 Conformance Levels, Publisher Conformance, Discovery Document | Retained; cross-referenced from the Implementation Status section. |
| §10 Long-Term Privacy Question | Moved into **Security Considerations** and **Privacy Considerations** (new sections required by IETF format — see below). |
| Appendix A (Investigative Journalism worked example) | Retained as non-normative appendix. |
| Appendix B (Indie Bundle worked example) | Retained as non-normative appendix. |
| Appendix C (Companion specs) | Retained as an informational pointer to ../spec/SPEC-PORTABILITY.md (which is submitted alongside — see §2.3). |
| Part II: The Plan for 0.5 | **Deleted from IETF text in entirety.** This is working-document material that does not belong in a published RFC. Preserved in `plans/archive/spec-part-ii-plan-0.5.md` as historical context. |
| §G Open-Spec Analysis | **Deleted from IETF text.** Collapsed into a two-paragraph summary in the non-normative "Design Rationale" appendix citing the archived full version. Full essay preserved in `references/`. |
| §H Incumbent Analysis | **Deleted from IETF text.** Same treatment as §G. The composite table (§H.4) is retained, re-anchored in the Design Rationale appendix. §H.5 (three personas) is retained as a one-paragraph "target audience" note. |
| Acknowledgements | Retained; becomes the standard IETF acknowledgements section. |

The conversion is a net reduction: the Markdown is ~840 lines; the IETF draft should be ~550–650 lines (RFC XML counts lines differently, but on the same order). The deletions are what makes the IETF draft a spec rather than a monograph.

#### Required IETF sections not yet in the Markdown

Four sections every Independent Submission needs. Each has a source in existing material.

**Security Considerations.** Draws from:
- SPEC.md §10 (network/payment/log-correlation limits) verbatim as the opening.
- Token replay: sourced from SPEC.md §B.2 adversarial tests and from the test suite's adversarial test set (test.open-membership.org/adversarial).
- Credential replay and Bitstring Status List race windows: sourced from SPEC.md §2 revocation model.
- DPoP key binding: sourced from the Phase 2 M4 anti-sharing primitive draft.
- Portability security: pulled from ../spec/SPEC-PORTABILITY.md §12 verbatim, cross-referenced rather than duplicated.
- Pseudonym compromise: sourced from SPEC.md §4.5 and ../spec/SPEC-PORTABILITY.md §8.
Target length: 400–500 lines of XML. Owner: protocol editor with one security reviewer sign-off (see §2.2).

**Privacy Considerations.** Separate from Security Considerations per IETF convention (RFC 6973). Draws from:
- SPEC.md §4 pseudonymous design as the primary subject.
- SPEC.md §10 acknowledged limits.
- ../spec/SPEC-PORTABILITY.md §8 (P1–P5) as the cross-reader dimension.
- Analytics data-minimization expectations on publishers declaring `pseudonymous-required`.
Target length: 200–300 lines. Owner: protocol editor with the privacy reviewer's sign-off.

**Implementation Status.** Lists every conforming implementation as of submission with its self-certification test suite run results. Draws from:
- The conformance registry at the custodian's URL (../docs/GOVERNANCE.md §"Self-certification").
- Reference implementations: `om-ghost`, `om-wordpress`, `om-static` with conformance levels.
- Reader implementations: Miniflux fork and the second reader with Indie Reader / Enterprise / Privacy profile matches per ../docs/FEATURESET.md §"Conformance profiles".
- Five production publishers with test suite run URLs.
- Standard IETF disclaimer: "This section will be removed before publication by the RFC Editor."
Target length: 150–200 lines, mostly tables. Owner: protocol editor, updated at each revision bump.

**IANA Considerations.** Draws from:
- Namespace URI registration: `http://purl.org/rss/modules/membership/`.
- `.well-known/open-membership` URI suffix registration per RFC 8615.
- Media types from ../spec/SPEC-PORTABILITY.md §15: `application/vnd.om-membership-export+json`, `+jwe`, `+age`.
- JSON-LD context URI: `https://purl.org/rss/modules/membership/portability/v1`.
- Any registries that specific elements reference (RFC 9728 OAuth 2.0 Protected Resource Metadata is referenced but not extended, so no action required there).
Target length: 80–120 lines. Owner: protocol editor.

**References (Normative + Informative).** Mechanical work but non-trivial for a spec this size. Approximate inventory from existing SPEC.md citations:

Normative: RFC 2119, RFC 8174 (keywords), RFC 4287 (Atom), RFC 8288 (Link), RFC 8615 (.well-known), RFC 8785 (JCS), RFC 7518 (JOSE), RFC 9068 (OAuth JWT access tokens), RFC 9449 (DPoP), RFC 9728 (OAuth PR metadata), W3C VC Data Model 2.0, W3C bbs-2023 cryptosuite, Podcasting 2.0 namespace doc, RSS 2.0 spec.

Informative: OPML 2.0, RFC 6973 (privacy considerations), ../spec/SPEC-PORTABILITY.md, the design rationale appendix, every publisher and reader reference implementation repo.

Owner: protocol editor. This is largely mechanical; budget 3 engineer-days.

#### Ownership

Primary owner of the conversion: **the protocol editor** (../docs/GOVERNANCE.md §"The working group"). This person is a technical writer familiar with IETF conventions — if the working group doesn't have one yet, hire one on contract through the custodian's fiscal sponsor before M13 Week 1. The paid coordinator runs the hire.

Reviewer: **one working-group member who has not edited the spec** to catch "author's assumptions" material. Rotates between the two publisher-side implementers week by week so no single reviewer burns out.

Effort budget: **3 engineer-weeks over 4 calendar weeks** for the protocol editor, plus ~0.5 engineer-week of reviewer time. The stretch is deliberate; IETF prose rhythm is different from Markdown prose rhythm and iteration happens slowly.

#### Weekly milestones — Month 13

**Week 1.** Tooling decision committed (ADR in repo). Repo structure set up: `ietf-draft/draft-om-rss-membership-00.md` (if kramdown-rfc) or `.xml` (if xml2rfc). First `xml2rfc` or `kramdown-rfc` run produces a valid but stub document. Implementation Status section skeleton populated from the conformance registry (automation: a script pulls from the registry JSON and emits an IETF-format table; rerun before each revision).

**Week 2.** §§2–6 (revocation, bundles, selective disclosure, gifts, proration) ported. Part II, §G, §H deletions complete and archived. Appendix A and B ported. First complete "body" pass done — structurally complete, editorially rough.

**Week 3.** Security Considerations, Privacy Considerations, IANA Considerations drafted. References section complete. Acknowledgements ported. The draft now validates as a well-formed RFC XML (or kramdown-rfc build) and produces HTML + txt output cleanly.

**Week 4.** Internal editorial pass with the rotating reviewer. Second pass for IETF voice (RFC 2119 keywords consistency, passive→active where natural, removal of "you" address). Draft tagged as `draft-om-rss-membership-00` at end of week, ready to post for M14 external review.

One-liner aside: if the editor hire in Week 0 slips, Week 1's tooling decision can happen in parallel with sourcing; but conversion work does not start until the editor is in seat.

### 2.2 Month 13 — subscriber portability round-trip proof

Runs in parallel with the format conversion, on a different owner so there is no contention for editor time.

The spec is **already written** (../spec/SPEC-PORTABILITY.md, 2026-04-24). M13 does not draft it. M13 proves it round-trips cross-reader and publishes the test report.

#### The exit bar

../spec/SPEC-PORTABILITY.md §14.3: Reader A → Reader B → Reader A, byte-equivalent modulo timestamps and rotated fields. This is the conformance criterion, not a stretch goal. Without a passing round trip, portability does not ship, and the IETF submission package is incomplete.

#### Test matrix

**Reader pairs.** Two readers exist (Miniflux fork, second reader — call it NetNewsWire for concreteness; substitute whichever shipped in M11). Two directions: Miniflux→NetNewsWire→Miniflux, and NetNewsWire→Miniflux→NetNewsWire. Both must pass. A one-direction-only pass is a fail.

**Membership types.** Each reader pair runs the round trip against all five credential shapes from ../spec/SPEC-PORTABILITY.md §§4.3–4.8 and §5:

| Credential shape | Publisher source |
|---|---|
| `url-token` | One of the five production publishers on Level 2 (the Substack-refugee Ghost deployment is the obvious choice). |
| `bearer` | A production publisher on Level 3; if none, `om-ghost` staging instance. |
| `dpop` | Staging instance; no production publisher is expected to be on DPoP yet. Mark as staging-only in the report. |
| `OM-VC` | A Level 4 publisher; the investigative-journalism persona publisher if they onboarded in Phase 2/4, otherwise `om-ghost` with the optional OM-VC issuer enabled. |
| `OM-VC-SD` (pseudonymous) | Must be a real `pseudonymous-required` publisher because the per-publisher pseudonym preservation (../spec/SPEC-PORTABILITY.md §8 P2) cannot be meaningfully tested against a non-pseudonymous publisher. If the investigative publisher is in production, use them; if not, bootstrap a test publication on `test.open-membership.org` with synthetic BBS+ credentials. |
| `bundle` (OM-VC via aggregator) | Requires a running aggregator. If none exists by M12, stand one up on `test.open-membership.org/bundle-demo` against three of the production publishers. This is test-suite work, not spec work. |

Matrix size: 2 directions × 6 credential shapes = 12 round trips, each scripted and repeatable.

**Publishers in the matrix.** Choose from the five in production. Minimum representation: one Ghost, one WordPress, one static-edge. If all five fit, include all five. Do not synthesize fake publishers when real ones are available; the point is that the round trip survives real production config drift.

**Encryption envelopes.** Each round trip runs twice: once with age envelope, once with JWE. Plaintext envelopes are only tested on the `url-token`-only subset per ../spec/SPEC-PORTABILITY.md §9.3. Full envelope matrix: 12 × 2 + 2 plaintext-url-token = 26 test runs.

#### Failure-mode catalog

Classify every round-trip failure at intake. Three buckets:

1. **Spec errata candidates.** An ambiguity in ../spec/SPEC-PORTABILITY.md that caused the two readers to interpret the same field differently. These are logged as issues against ../spec/SPEC-PORTABILITY.md and patched before submission. Expected volume: 3–8 across the matrix.
2. **Implementation bugs.** One reader is non-conformant. Logged as issues against the reader repo. Expected volume: 5–15. These do not block the IETF submission, but the implementation is omitted from the Implementation Status section until the bug is fixed.
3. **Publisher-side drift.** A publisher rotated a credential or changed their discovery document mid-test, breaking a round trip through no fault of the portability format. Logged and re-run. Expected volume: 1–3. Non-blocking.

The triage triad — protocol editor, Miniflux maintainer, second-reader maintainer — meets once per week during M13 to resolve the week's findings. Meeting notes published within 72 hours (../docs/GOVERNANCE.md §"Transparency commitments").

#### Delivery artifact

**A published test report at `test.open-membership.org/reports/portability-round-trip-2026-XX-XX.html`**, linked from the IETF submission's Implementation Status section. Contents:

- The 26-run pass matrix as a single HTML table with run IDs.
- Per-run artifact links: request/response transcripts, pre- and post-import state diffs, checksum verification logs.
- A short methodology section documenting the test harness and which commit of each reader was tested.
- Errata incorporated: links to the GitHub issues filed and their ../spec/SPEC-PORTABILITY.md diff.
- Signed by the three triad members.

Acceptance: all 26 runs pass, or a documented justification for any that don't, signed off by the working group.

#### Weekly milestones — Month 13 portability

**Week 1.** Test harness scaffolding (publisher/reader orchestration, envelope encryption/decryption helpers, diff tooling). Aggregator stood up on `test.open-membership.org` if not already present.
**Week 2.** First full matrix run. Expected outcome: majority passing, 5–10 clear fails across spec and implementation.
**Week 3.** Triage, errata drafted against ../spec/SPEC-PORTABILITY.md, reader bugs filed upstream or fixed in the forks the working group controls.
**Week 4.** Re-run the matrix. Publish the test report. Tag ../spec/SPEC-PORTABILITY.md as 1.0 (no "draft" marker). The final version of the spec goes into the IETF submission bundle as a companion artifact.

Owner: **one of the reader-side implementers** (Miniflux or second-reader maintainer) runs the harness, with ~0.5 engineer-week of the other reader's time for their half. 3 engineer-weeks total across M13.

One-liner aside: if the aggregator doesn't exist by Week 1, building it consumes most of Week 1 and the matrix slips one week. Acceptable.

### 2.3 Month 14 — external review

The draft is posted publicly at the end of M13. M14 is a single calendar month of structured review.

#### Reviewer recruitment

At least **three implementers and two non-implementers** (ROADMAP.md Phase 5 M14). Outreach starts M13 Week 3 so commitments are in place by M14 Week 1.

**Implementer 1.** A CMS-side implementer **not** on the working group. Target profile: someone who shipped an independent `om` deployment (one of the five production publishers that isn't a reference implementation). They read the spec as the person who actually had to make a production publisher conform.

**Implementer 2.** A reader-side implementer outside the two reference readers. Target profile: if Feeder for Android shipped in M11 as the second reader, this reviewer comes from Reeder or Inoreader instead. The point is a third implementation perspective.

**Implementer 3.** A PSP integration engineer. Target profile: someone who has shipped a Stripe or Mollie integration in production (not necessarily on `om`). They review §§2, 6 (revocation, proration) and the PSP binding profiles for operational realism.

**Non-implementer 1 — security reviewer.** Target profile: a named security researcher with IETF history or published work on OAuth 2.0 / DPoP / token replay. The Sovereign Tech Agency's ActivityPub test-suite security reviewers are a natural pool (SPEC.md §G.2 establishes that connection). Budget: paid reviewer work through the custodian's fiscal sponsor (see ../docs/GOVERNANCE.md §"Contributor compensation"; the funding for this comes from the grants in ../docs/FUNDING.md, not from the spec-work budget).

**Non-implementer 2 — privacy reviewer.** Target profile: a W3C VC WG member or a published privacy researcher who has written on selective disclosure or pseudonymous credentials. The W3C VC WG liaison (optional working group seat per ../docs/GOVERNANCE.md §"Composition") may be able to recommend candidates if they're on-board by M13.

Outreach cadence: **M13 Week 3** — identify candidates, draft one-paragraph pitch per candidate. **M13 Week 4** — send asks; accept "yes/no within 72 hours" commitments. **M14 Week 1** — fall-back candidates approached if anyone declined. Target: all five commitments in place by M14 Week 1 Friday.

#### Review scope per reviewer

Each reviewer gets:

- The `draft-om-rss-membership-00` artifact in both XML source and rendered HTML/TXT.
- The companion ../spec/SPEC-PORTABILITY.md 1.0 artifact.
- A pointer to the test report (§2.2).
- A review brief: two pages, naming what the reviewer is being asked to look at and what is out of scope. Briefs differ per reviewer.

**Implementer-1 brief:** "Does this spec describe what you actually had to build? Where did you hit something the spec doesn't answer?" Scope: full document.

**Implementer-2 brief:** "Does Reader X's implementation map cleanly to the conformance levels? What did you assume that the spec doesn't say?" Scope: §7, §§4.3–4.8 (credential handling), ../spec/SPEC-PORTABILITY.md.

**Implementer-3 brief:** "Do the PSP binding profiles survive contact with a PSP engineer?" Scope: §2 (revocation), §6 (proration), §8 (publisher conformance), PSP binding profiles from 0.3.

**Security-reviewer brief:** "Is the Security Considerations section adequate? Are there attack classes it misses?" Scope: Security Considerations section, §§2.3 (webhook mapping), §4 (selective disclosure), ../spec/SPEC-PORTABILITY.md §12.

**Privacy-reviewer brief:** "Does the privacy model hold up? Are the limits honestly acknowledged?" Scope: Privacy Considerations section, §4, §10, ../spec/SPEC-PORTABILITY.md §8.

Return shape: each reviewer returns a Markdown document with line-referenced comments (the kramdown-rfc or xml2rfc build produces line numbers in the txt output; reviewers cite those). No free-form essays; comment format is "line N: <issue>; proposed fix: <diff or prose>." Every comment gets a GitHub issue tracking its disposition.

#### Timebox

**Review window:** M14 Weeks 1–3 (three calendar weeks of reviewer time). **Cutoff:** M14 Week 3 Friday. Comments received after are rolled into 1.x errata, not the -01 revision.

**Editorial incorporation:** M14 Week 4. The protocol editor triages every comment into accept / decline / defer. Accept → diff in the draft. Decline → public response on the issue citing the reason. Defer → moved to the 1.x errata backlog. All three dispositions are public; nothing is silently rejected.

**Revision -01 lands** at end of M14 Week 4. This is what goes to the IRSG in M15.

Effort budget for reviewers: each implementer reviewer ~1 engineer-week, each non-implementer reviewer ~1 engineer-week (paid). Editorial incorporation: 1 engineer-week of protocol editor time. No other working group time committed; they're implementing.

One-liner aside: if one reviewer flakes entirely, replace from the fallback list; don't wait. The constraint is having *three implementer perspectives* and *two non-implementer perspectives*, not specific named people.

### 2.4 Month 15 — IRSG submission

#### Submission package checklist

The draft and companion artifact are only part of it. Full checklist, produced M15 Week 1:

1. `draft-om-rss-membership-01.xml` (or `.md` via kramdown-rfc) — the spec itself, -01 revision incorporating M14 review.
2. Rendered HTML and TXT artifacts from the XML source (xml2rfc toolchain output).
3. ../spec/SPEC-PORTABILITY.md 1.0 — as a companion informational reference. Not submitted as its own draft in the M15 submission; cross-referenced and hosted at the custodian URL.
4. Implementation Status section (inlined in the draft, per RFC 7942 conventions).
5. Public test suite URL: `test.open-membership.org`. Include a permalink to a specific commit of the test suite repo so a future reader can reproduce.
6. Certified implementation list (from the conformance registry): implementation name, version, repo URL, claimed conformance level, test suite run URL, date of last run.
7. Errata log: one markdown file enumerating every 0.4.1 through 0.4.x errata issued since SPEC.md was frozen at 0.4, with the reasoning and the diff.
8. External review attestation: the M14 reviewers' sign-off documents (short, one page each), showing which sections each reviewed.
9. The portability round-trip test report (§2.2).
10. A cover letter to the Independent Stream Editor naming the authors, the custodian, and the URL at which the spec, test suite, and registry are permanently available.

All ten artifacts are committed to the repo under `ietf-submission/2026-MM/` before the submission email goes.

#### Submission logistics

**Target:** the IETF Independent Stream Editor. **Current ISE (as of 2026):** Eliot Lear (ROADMAP.md M15). Verify this is still the seated ISE in M14 Week 4 — the seat rotates.

**Submission timing.** M15 Week 1: final package assembled. M15 Week 2: package reviewed internally one more time (protocol editor + paid coordinator + one working group member). M15 Week 2 Friday: submission email sent to the ISE with the package attached or linked.

**Cover letter contents:** one page, citing the RFC 4846 Independent Submissions process, stating that `om-rss-membership` has five production deployments, a neutral custodian, a running test suite, and three reference implementations. Attach the covers letter's short summary, link the draft, sign from the protocol editor with a CC to the working group.

**What happens next.** Typical ISE review: 6–12 months. Initial acknowledgement expected within 2 weeks ("received, assigned reviewer"). First substantive feedback expected 2–4 months in. The process can include a request for revision (-02, -03) before acceptance. The working group does not treat this as a blocker on 1.0 — 1.0 ships at the custodian URL on the M18 schedule regardless of ISE acceptance status. If the ISE accepts and publishes the RFC before M18, the spec gains an RFC number. If not, the custodian URL is still the canonical version (ROADMAP.md "What 1.0 ratifies, concretely": "A published RFC (or one in the final stages of IRSG review)").

#### Parallel work during the ISE review period (M15 Week 2 onward through M18)

**Errata-only mode.** Between submission and 1.0 release, no substantive spec changes are allowed unless the ISE requests them. Clarifications and typos via the normal errata process (0.4.x releases). Feature requests go into the 1.1 backlog.

**Implementer support.** Working group continues responding to issues filed against the reference implementations. The test suite continues accepting new self-certifications.

**Publisher onboarding.** ROADMAP.md Phase 4 targeted five production publishers; the "What 1.0 ratifies" list calls for ten. The gap is closed during M15–18 through ongoing outreach, case-study publication, and reduced hand-holding as the pattern gets proven. Target: ten publishers in production by M18.

### 2.5 Decision log for Phase 5

A file at `plans/decisions/PHASE-5.md` records every non-trivial decision made during the phase, in chronological order. Minimum entries expected:

- M13 W1: format tool choice (kramdown-rfc vs xml2rfc) — protocol editor.
- M13 W2: disposition of §G and §H (archive vs inline summary) — protocol editor, reviewed by one working group member.
- M13 W3: aggregator staging plan for round-trip matrix — portability harness owner.
- M13 W3: reviewer shortlist for M14 — paid coordinator.
- M13 W4: final cut of which publishers are in the round-trip matrix — portability harness owner.
- M14 W4: per-comment disposition index — protocol editor.
- M15 W1: final Implementation Status entries — protocol editor.
- M15 W2: confirm ISE seat is still Eliot Lear — paid coordinator.

Each entry: date, decision, decider, one-paragraph rationale, links to any issue or artifact. Append-only; decisions revised by later decisions rather than edited in place.

### 2.6 Phase 5 exit criteria

Phase 5 is done when **all** of the following are true:

1. `draft-om-rss-membership-01` submitted to the ISE with the full 10-item package.
2. ISE acknowledgement email received confirming the submission is in queue.
3. Subscriber portability round-trip report published at the custodian URL, with the 26-run matrix at 100% pass or documented exceptions.
4. ../spec/SPEC-PORTABILITY.md tagged as 1.0 (no "draft" marker) with any round-trip errata incorporated.
5. M14 reviewer sign-offs archived with the submission bundle.
6. Decision log `plans/decisions/PHASE-5.md` complete through M15 W2.

If any are missing at end of M15, Phase 6 does not start — the slip is in Phase 5 and the team finishes Phase 5 before convening the M16 event. See ROADMAP.md §"Critical path": Phase 5 is not on the critical path, so a slip of 2–4 weeks is survivable; a slip past M16 shifts the event.

---

## 3. Phase 6 execution plan (months 16–18)

### 3.1 Month 16 — first IndieWebCamp-style event

#### Logistics

**Venue.** ROADMAP.md §"Phase 6" specifies "probably Amsterdam or Berlin" based on NLnet and Sovereign Tech Fund proximity. Choice criteria, decided by end of M15 Week 3:

- If NLnet or Sovereign Tech is the custodian or major funder, their city gets first refusal (venue offering is ../docs/GOVERNANCE.md §"What the custodian actually does" — "Ideal but optional: Offer conference/event hosting if they have venues").
- Otherwise: Amsterdam by default (lower venue costs, better multi-modal travel for European attendees, an existing IndieWeb chapter for format precedent).

Venue shape: a single room for 15–25 people, projector, decent WiFi, tables for hackathon setups, one adjacent breakout room. Not a hotel conference center; a co-working space or a university room. The format comes from SPEC.md §G.5 (IndieWebCamp model).

**Dates.** A Saturday + Sunday, mid-M16 (second weekend). Weekends because attendees are paying their own travel and most are indie publishers with day jobs.

**Attendee cap.** 15–25. Invitation-only, not open registration. 25 is the hard upper bound — the IndieWebCamp tradition is small because small is where the conversation is possible.

**Invitation list** (target composition, prioritized):

- All five production publishers (one or two representatives each): 5–8 attendees.
- The three publisher reference maintainers (`om-ghost`, `om-wordpress`, `om-static`): 3 attendees.
- The two reader maintainers (Miniflux and second reader): 2 attendees.
- The protocol editor, paid coordinator, and 1–2 other working group members: 3–4 attendees.
- The ActivityPub co-existence co-authors (Ghost AP team + Automattic WP AP team) if the appendix is still open from M12: 2–3 attendees.
- Open invitations to 2–3 reviewers from M14 if they want to attend in person: 0–3 attendees.
- 1–2 slots deliberately kept open for adjacent-protocol visitors (Podcast Index, W3C VC WG, IndieWeb community, OpenID Foundation): 1–2 attendees.

Total band: 16–25. Comfortable.

**Invitations go out:** M15 Week 2 with "hold the date" informal asks, M15 Week 4 with formal invitations. The paid coordinator runs the invite list; the working group signs off.

#### Programme

Two days, each with the same three-slot shape per ROADMAP.md ("morning demos, afternoon hackathon, evening social"). The slot content:

**Saturday morning — demos (09:30–12:30).**

Each demo is 20 minutes (15 + 5 Q&A). Eight slots. Target subjects, curated by the paid coordinator:

1. `om-ghost` walk-through: a publisher running through their full stack on stage.
2. `om-wordpress`: same shape, different implementer.
3. `om-static` (Eleventy + Cloudflare Workers): same shape, edge-hosted.
4. Miniflux `om` fork: subscriber-side, full flow.
5. Second reader's `om` fork: subscriber-side.
6. A production publisher's migration story (Substack → Ghost+`om` or Patreon → `om-wordpress`).
7. The portability round-trip demo: live Reader A → Reader B → Reader A on stage.
8. Test suite walk-through: what it catches, what it doesn't, how to self-certify.

**Saturday afternoon — hackathon (14:00–18:00).**

Three parallel tracks. Attendees self-select.

- **Track A: ActivityPub appendix closing session.** If the M12 appendix is still open-ended, this is the forcing function. Co-authored drafting in the room with the Ghost AP and WP AP maintainers present. Exit: a draft section added to the 1.x errata backlog if consensus reached, or a formal "open question, see §X" block in the 1.0 text if not (ROADMAP.md risk register covers this).
- **Track B: errata candidate triage.** Whichever issues surfaced in M13 round-trip testing, M14 external review, or M15 ISE pre-submission review that weren't taken in -01 get re-examined in-room for 0.5/0.6 status. Exit: a prioritized list of errata to land before 1.0 (M17 input).
- **Track C: "what doesn't work yet" session.** Open-agenda working session on whatever publishers or readers in attendance are stuck on. May produce issues, may produce nothing. Either is fine. This is where the spec learns things the author never sees.

**Saturday evening — social (19:30 onward).**

A dinner at walking distance from the venue. Attendance optional; no agenda. Paid by the coordinator's grant-budget line for the event (../docs/FUNDING.md, not this document).

**Sunday morning — design discussions (09:30–12:30).**

Longer-form conversations, 45-minute slots. Subjects surface from Saturday; pre-planned subjects reserved:

- **1.0 checklist walkthrough** — the "What 1.0 ratifies, concretely" list from ROADMAP.md, read line by line, each item confirmed as green or flagged as blocker.
- **Governance review** — ../docs/GOVERNANCE.md is read together, any pre-1.0 gaps identified. Seating the first formal working group happens here if it hasn't already (../docs/GOVERNANCE.md §"Seating process").
- **Post-1.0 working group shape** — who continues, who rotates out (§3.3.3 below, the decision is made in-room).

**Sunday afternoon — wrap and commitments (14:00–17:00).**

Each attendee states what they'll commit to between M16 and 1.0 ship. Publishers commit to test-suite re-certification, reader maintainers to any remaining conformance gaps, working group members to their section of the RC work. These commitments go into the public notes.

**Sunday evening — close.** No social, people travel home.

#### Outputs

Three concrete artifacts from the event, owned by the paid coordinator:

1. **Errata candidates list.** Every issue identified in Track B or surfaced in design discussions, filed as GitHub issues, tagged `event-m16`. Expected volume: 15–40.
2. **ActivityPub appendix final-or-deferred decision.** If drafted: merged into the 1.0 text as a non-normative appendix. If deferred: explicit "open question" marker at the referenced section, with a pointer to the 1.x milestone. Recorded in the decision log.
3. **1.0 checklist agreed in-room.** The ROADMAP.md "What 1.0 ratifies" list, annotated per-line with current state and the M17–18 work to close any gap. Signed by the working group attendees. This is the gate that M17 RC work is measured against.

#### Documentation

Within seven days of the event (../docs/GOVERNANCE.md §"Transparency commitments" is 72 hours for routine meeting notes; the event's broader artifact is given one week):

- Session notes for all demo and hackathon slots, published at `custodian-url/events/2026-MM/`. Attendee consent for attribution collected at registration; anyone who opts out appears as "an attendee."
- Attendee list published (opt-in).
- Proposed changes from Track A and Track B merged into the issue tracker with `event-m16` tags.
- A 500-word write-up for the custodian's news page and cross-posted to the IndieWeb community wiki.

Effort budget: paid coordinator full-time M15 W3 → M16 W2 on event logistics, half-time M16 W3 on documentation. Working group attendees: their travel days plus the two event days. No code written during the event.

### 3.2 Month 17 — errata freeze and release candidate

#### Errata triage

The backlog going into M17 W1 comes from: M13 round-trip findings, M14 external review deferrals, M16 event Track B output, and whatever issues accumulated since submission.

Classification, done by the protocol editor with working-group sign-off:

**Must land before 1.0 (0.5 / 0.6 errata):**
- Any ambiguity that caused a cross-reader interop failure in the M13 matrix.
- Any Security Considerations or Privacy Considerations correction from the M14 reviewers.
- Any IETF editorial issue the ISE raised in their initial response.
- Any clarification whose absence would cause a new implementer to misbuild the spec.

**Defers to 1.x:**
- New features (by rule — 0.4 is feature-frozen, 1.0 adds no features).
- Additional PSP binding profiles beyond Stripe, Mollie, PayPal, Adyen, Paddle, Lightning, custom.
- Additional credential profiles beyond OM-VC 1.0 and OM-VC-SD 1.0.
- The ActivityPub appendix if it's still open at M17 W1 — ship the "open question" marker, close it properly in 1.1.
- Any platform-specific guidance that would narrow the spec to one reader's quirks.

**Triage cadence:** M17 W1 full triage session, protocol editor + working group. M17 W2 patches written. M17 W3 patches merged and the spec text is frozen as "1.0-rc1."

#### Release candidate publication

**Format.** `draft-om-rss-membership-02-rc1` at the IETF draft level (the in-flight ISE submission continues; the RC is the version the custodian publishes). Canonical hosting at the custodian URL as `spec/1.0-rc1/`. Rendered HTML and TXT artifacts alongside. The portability companion is published at the same level: `portability/1.0-rc1/` if any errata landed against it, or simply `portability/1.0/` frozen if none did.

**Where it lives.** Custodian URL. A pointer from the repo's README, from the test suite page, from every reference implementation's README. The Internet Archive's Wayback Machine is asked to crawl the page (manual snapshot submission) to ensure durability before any announcement.

**Announcement channels for the RC:**

- Mailing list (if the custodian hosts one per ../docs/GOVERNANCE.md) or a GitHub Discussions thread.
- Short blog post on the custodian's news page.
- Cross-posted link to IndieWeb community wiki and Mastodon (Ghost and Automattic instances reach the right audience).
- Ghost forum "Plugins" category.
- Podcast Index mailing list if enclosure-auth errata landed.
- A single tweet/toot from a neutral working-group account. Not a press push yet — the press push is the 1.0 release in M18, not the RC.

#### 30-day public comment period

Announced with the RC. Runs M17 W4 → M18 W4. Comments collected via a single GitHub Issues label (`rc1-comment`) and cross-filed from the mailing list if the custodian hosts one.

**Triage and disposition.** Each comment is triaged within 7 days of receipt. Three dispositions:

- **Accept and patch:** merged into 1.0 text before ship. Requires a clear editorial fix, not a design change. Expected volume: 5–15.
- **Defer to 1.x:** logged in the 1.x backlog with reasoning. Expected volume: most comments.
- **Decline:** a public response explaining why, on the issue. No comment is silently rejected (../docs/GOVERNANCE.md §"Transparency commitments"). Expected volume: 0–5.

The protocol editor handles triage; contested dispositions go to the working group for the majority-vote rule (../docs/GOVERNANCE.md §"Decision-making").

**Exit of the comment period.** M18 W4 Friday: the comment window closes. Any comment received after the deadline is 1.x work.

#### M17 weekly milestones

**Week 1.** Full triage session (3 hours, working group + protocol editor). Backlog classified. Editor owns the 0.5/0.6 errata patch set; one working group member double-checks the classification.
**Week 2.** Patches written against the IETF draft and against ../spec/SPEC-PORTABILITY.md if any landed there. Internal review.
**Week 3.** Patches merged. RC artifacts built (HTML, TXT, XML). Published at custodian URL. Internet Archive snapshot requested.
**Week 4.** Announcement goes out Monday. The 30-day clock starts.

Effort budget: protocol editor full-time M17. Working group attendees ~0.5 engineer-week each for triage + review. Paid coordinator ~1 engineer-week for the announcement coordination.

One-liner aside: if the ISE returns substantial requested changes during M17, those are treated as normal errata and roll into RC1 if they fit the timeline, or into a `rc2` cut if they don't. A second RC is acceptable; the 30-day clock restarts.

### 3.3 Month 18 — 1.0 release

#### Final publication

**Canonical URL.** The spec at `{custodian-url}/spec/1.0/`, the portability companion at `{custodian-url}/portability/1.0/`. Namespace URI `http://purl.org/rss/modules/membership/` **frozen**: from 1.0 onward, the URI means 1.0 semantics. Post-1.0 errata (1.0.1, 1.0.2) do not change the URI; 2.0 will (and that's years away).

**Archival copies.**
- Internet Archive Wayback Machine — manual snapshot submission for every URL under `{custodian-url}/spec/1.0/` and `/portability/1.0/` within 48 hours of publication.
- Software Heritage archive — submit a save-code-now request for the GitHub organization's `spec` repo at the tag `v1.0`.
- The custodian's own archival process (../docs/GOVERNANCE.md §"What the custodian actually does" — the custodian holds the canonical URL).

**Versioning and tagging.**
- The GitHub repo tags `v1.0` on the commit whose artifacts were published.
- The IETF draft, if still in ISE review, gets a -03 revision reflecting the 1.0 text (the -03 and the 1.0 are byte-equivalent except for the IETF front matter).
- The test suite tags its own `v1.0` release conformant to the spec 1.0 exit bar.
- ../spec/SPEC-PORTABILITY.md, if it had any RC-period errata, bumps to 1.0.1; otherwise stays at 1.0.

**Implementation registry.** The custodian's public registry page (../docs/GOVERNANCE.md §"Self-certification") gets a "1.0 certified" badge column. Every implementation that re-ran the test suite against the 1.0 artifacts gets the badge. The working group confirms at least:

- `om-ghost` — 1.0 certified.
- `om-wordpress` — 1.0 certified.
- `om-static` — 1.0 certified.
- Miniflux fork — 1.0 certified (Indie Reader profile minimum).
- Second reader — 1.0 certified (whatever profile matches their implementation).

If any of the five can't certify on release day, the 1.0 release does not wait — it ships. The lagging implementation gets the badge whenever they re-run (../docs/GOVERNANCE.md §"Self-certification" is permissionless).

#### Press

Announcement goes out simultaneously across channels on M18 W4 Monday. Single release, no staggered roll-out.

- **IndieWeb community.** Post on the community wiki; syndicate to Mastodon via the Ghost and Automattic instances; ask the IndieWeb chat community to share.
- **Ghost forum.** "Announcements" category, from the `om-ghost` maintainer's account.
- **Podcast Index community.** Post on their forum with specific framing: "paid RSS, co-exists with `podcast:value`, ships today" (SPEC.md §8 Podcasting 2.0 co-existence is the hook).
- **Hacker News.** A single submission, neutral title, from a working group member. No coordinated upvoting; HN is either interested or not.
- **NLnet announcement.** If NLnet funded any part of the work per ../docs/FUNDING.md, the grant report doubles as an announcement via their project page and NGI newsletter (../docs/GOVERNANCE.md §"What the custodian actually does" if NLnet is the custodian).
- **Sovereign Tech Fund report.** If STF funded any part, the 1.0 release is the reporting milestone that closes that grant's deliverable. STF publishes their own announcement.
- **Mailing list (if one exists under custodian hosting).** Formal announcement with the spec URL, portability URL, test suite URL, and registry URL.

The press post has the same content across channels, ~400 words: one paragraph on what ships, one on what's in the 1.0 stack (ten publishers, two readers, three references, test suite, registry, custodian, RFC in ISE review), one on what doesn't change post-1.0 (backward compatibility, feature-frozen), one on how to get involved (repo, issues, M24 event hold-the-date).

**What the post does not do.** No product marketing. No competitive framing against Substack or Patreon. No speculation about adoption numbers. ROADMAP.md "Indie ecosystem before incumbents" and SPEC.md §G.1 discipline: quiet, accurate, boring. The protocol's value is proved by what runs, not by what's said.

#### Post-1.0 working group shape

Decided at the M16 event (§3.1 Sunday morning slot), finalized by M18 W2. Shape going into post-1.0:

**Continuing:** the 5–8 seats described in ../docs/GOVERNANCE.md §"Composition", with at least the protocol editor and the paid coordinator rolling forward to M24. Publisher-side and reader-side implementer seats rotate as real implementation activity shifts — the 2-year term from ../docs/GOVERNANCE.md §"Seating process" starts now for everyone newly seated at the M16 event.

**Rotating out:** any original drafter who has been carrying the spec since 0.1 and wants to step back. The deliberate shape of "no one's voice is privileged by tenure" (../docs/GOVERNANCE.md §"Operating principles") means the 1.0 ship is a natural rotation point. Replacement per the majority-vote rule.

**M24 event planning** begins in M18 W4. The coordinator starts the date-and-venue conversation, targeting April–June 2027 (six months after 1.0). A second event is already baked into ROADMAP.md's 1.0 exit criteria ("Two events held (month 16, one tentatively scheduled for month 24)").

#### The 1.0 exit criteria — what `om` owns on M18 W4 Friday

Directly from ROADMAP.md §"What 1.0 ratifies, concretely", used as the literal exit gate for Phase 6:

1. **A frozen spec document at a canonical URL, held by a neutral custodian.** Check: `{custodian-url}/spec/1.0/` is live.
2. **A published RFC (or one in the final stages of IRSG review).** Check: either `draft-om-rss-membership` has an RFC number, or the ISE has acknowledged and is actively reviewing.
3. **An open-source publisher test suite + reader conformance harness, both in one repo, that any implementer can run.** Check: `test.open-membership.org` live, repo tagged `v1.0`.
4. **At least ten publishers in production across the three personas.** Check: count and verify in the registry.
5. **Three reference publisher implementations (Ghost, WordPress, Eleventy + edge).** Check: all three certified against 1.0.
6. **Two reference reader implementations (Miniflux, NetNewsWire or equivalent mobile).** Check: both certified.
7. **Non-normative appendices covering: Atom + JSON Feed mappings, Platform Adapter Profile, ActivityPub co-existence, subscriber portability format, enclosure auth, and a provisional anti-sharing primitive.** Check: each appendix published, each either complete or flagged as "open question" per the M17 disposition.
8. **A working group of 5–8 with at least one paid coordinator.** Check: ../docs/GOVERNANCE.md §"Composition" satisfied, paid coordinator funded through M24.
9. **Two events held (month 16, one tentatively scheduled for month 24).** Check: M16 event notes published; M24 save-the-date sent.
10. **A public record of errata, fixes, and negative results.** Check: `{custodian-url}/errata/` and `{custodian-url}/negative-results/` live.

Miss any one and 1.0 does not ship on M18. Each is a hard gate.

### 3.4 Decision log for Phase 6

`plans/decisions/PHASE-6.md`, same structure as Phase 5. Minimum entries:

- M15 W3: M16 venue choice (Amsterdam, Berlin, or custodian-offered).
- M15 W4: invitation list finalized.
- M16 event day: working group seating decisions.
- M16 event day: ActivityPub appendix ship-vs-defer.
- M16 event day: 1.0 checklist sign-off with per-item assignees for M17/M18.
- M17 W1: errata classification (must-land vs 1.x-defer) per issue.
- M17 W3: RC1-vs-RC2 decision (only relevant if ISE returned substantive requests).
- M18 W1: implementation certification list for release day.
- M18 W2: post-1.0 working group roster.
- M18 W4: 1.0 ship confirmation with archival checklist complete.

### 3.5 Phase 6 exit criteria (= 1.0 shipping criteria)

The ten items from §3.3.4 above, each green. If any red, 1.0 does not publish; the working group reconvenes on schedule-slip per the lazy-consensus rule (../docs/GOVERNANCE.md §"Decision-making").

The 1.0 release is not revocable. A shipped 1.0 with a broken gate is materially worse than a delayed 1.0 with all gates green. Delay is the correct behavior.

---

## 4. Post-1.0 handoff

What maintenance mode looks like in the months after 1.0, as scoped by this plan. Not the primary business of the working group described in ROADMAP.md §"What happens after 1.0", but worth enumerating so the transition is not vague.

**Errata cadence.** 1.0.x patch releases as needed, typically quarterly through the first year, slowing to twice-yearly afterward. Each patch release follows ../docs/GOVERNANCE.md §"Version management" rules: 2-week comment period for pre-1.1 errata; 6-week for anything borderline normative. Patches published at `{custodian-url}/spec/1.0.x/` alongside the canonical 1.0 URL.

**Community submissions pipeline.** New reference implementations (additional readers, additional CMS adapters), new PSP binding profiles, additional credential cryptosuites all flow through the normal GitHub issue + PR process. Working group reviews per the majority-vote rule. Anything large enough to be a "new feature" goes into the 1.1 backlog rather than getting back-ported.

**Custodian reporting.** The custodian receives an annual report per ../docs/GOVERNANCE.md §"Transparency commitments": working group composition, test suite health, registry status, financial flows. Shared publicly. Not operationally heavy — the coordinator drafts, the working group signs, the custodian archives.

**When the working group can start stepping back.** ROADMAP.md §"What happens after 1.0" frames this correctly: "step back slowly, not suddenly." Concretely: after M24 (second event held, first year of 1.0 errata landed, custodian report filed), original drafters who are ready can rotate out of their seats per ../docs/GOVERNANCE.md §"Seating process". The 2-year terms started at M16 run to M40; natural turnover happens there. Before M24, no original drafter rotates — continuity through the first year of production matters.

The measurable sign the step-back is working: by month 30, an implementer who joined after 1.0 can propose an errata, shepherd it through the normal process, and see it land without needing an original drafter's attention. That's when the protocol is no longer dependent on any one person — which is the stated goal in ROADMAP.md §"What 1.0 ratifies": "the protocol outlives every current participant by a decade."
