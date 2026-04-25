# Governance

How the Open Membership RSS project makes decisions, who holds the spec, and what changes as the project grows.

## Operating principles

Before specifying structures, the non-negotiable principles these structures must enforce:

1. **Open-by-default.** All specification work happens in public. Private Slack channels, private email threads, and off-the-record decisions are not how decisions are made. They're how rumors of decisions are made. If a conversation matters, it goes in a GitHub issue.
2. **Working-code vote.** In a disagreement, the person shipping the implementation gets the final say within their area. The person drafting the specification can override only by demonstrating a reasonable alternative implementation.
3. **Backward compatibility is paramount.** Once an element is canonized in a frozen spec version, it does not change meaning. Adding elements is acceptable; mutating elements is not. This is the Podcast Index rule and it's the right one.
4. **Negative results are published.** When a PSP binding breaks, when a publisher drops the spec, when a feature doesn't work as designed — this gets written up and published. Open protocols accumulate trust by being honest about failures.
5. **No one's voice is privileged by tenure.** A new implementer's first PR reviewed on its merits, not on whether they were "around for 0.2." This is how mailing lists die.

## The custodian

### Shortlist and order of asks

Four candidates, in the order to ask. Don't simultaneous-ask; one at a time, a week apart, adapting the pitch based on each response.

**1. Internet Archive** — lowest procedural overhead, high probability of yes
- The Internet Archive has historically hosted specifications and preservation efforts
- Mission-aligned: the Archive's core commitment to open standards and digital commons fits the spec's ethos
- Contact: Brewster Kahle's team; informal first approach via existing professional contacts if possible
- What they'd do: host the canonical spec URL at `archive.org/open-membership-rss` or equivalent, hold domain registration of `purl.org/rss/modules/membership/`, provide a stable institutional point of escalation
- Estimated answer time: 2–4 weeks if a warm intro; 6–8 weeks cold

**2. Sovereign Tech Fund / Sovereign Tech Agency** — both funder and custodian candidate
- If the Sovereign Tech Fund grant is approved (see [FUNDING.md](FUNDING.md)), asking them to also hold the spec custodianship is natural
- They already do this for other infrastructure they fund
- Estimated answer: 2 weeks after grant approval

**3. NLnet Foundation** — best institutional fit, most procedural
- NLnet's formal governance structure means the custodian role involves actual board decisions
- Their existing role as NGI coordinator means they have the staff and infrastructure for long-term stewardship
- Estimated answer time: 4–6 weeks

**4. Software Freedom Conservancy** — safe US-based fallback
- Most established institutional credibility
- Biggest procedural overhead; formal project membership requires a proper application
- Estimated answer time: 2–3 months

### What the custodian actually does

Narrow role. Don't over-scope.

**Required:**
- Hold the canonical URL where the frozen spec lives (`purl.org/rss/modules/membership/` ideally, or equivalent)
- Hold domain registration or DNS control of that URL
- Sign the spec as "published under the stewardship of [custodian]"
- Serve as a legal entity of last resort if the working group dissolves

**Not required:**
- Host the GitHub organization (working group handles that)
- Fund development (that's what grants are for)
- Review individual PRs (that's working group work)
- Arbitrate technical disputes (escalation only, not routine)

**Ideal but optional:**
- Host the test suite at a `.org` domain under their control
- Provide a neutral mailing list service
- Offer conference/event hosting if they have venues

### The minimum custodian agreement

One page. Written, signed by the custodian and one or two working-group leads. Key clauses:

1. Custodian holds canonical spec URL at a domain they control.
2. Custodian commits to not unilaterally modify the spec; any changes go through the working group.
3. If the working group dissolves or becomes inactive for 12+ months, custodian may appoint successor stewards or transfer to another custodian.
4. Custodian can terminate the relationship with 6 months' notice, during which time they help transfer to a replacement.
5. No financial obligations on either side.

Any more complex agreement is probably over-engineered.

## The working group

### Composition

5–8 people, roughly these shapes:

- **Two publisher-side implementers** — people actually running `om`-emitting feeds
- **Two reader-side implementers** — people shipping code that consumes `om`
- **One protocol editor** — responsible for the spec document itself, errata management
- **One community/documentation lead** — handles the non-code artifacts (website, guides, outreach)
- **One paid coordinator** — part-time role covered by grant funding, handles logistics and governance
- **Optional: one W3C VC liaison** — coordinates with the VC working group as OM-VC-SD evolves
- **Optional: one Podcasting 2.0 liaison** — coordinates with the Podcast Index team

Diversity of implementer base matters more than diversity of credentials. A working group with four people from the same company is worse than one with four people from four companies. Four nationalities is better than one. Mix of commercial and non-commercial backgrounds is better than all one or all the other.

### Seating process

The first working group is appointed by the initial authors of the spec, ideally at the first IndieWebCamp-style event (month 16 in the roadmap). Before that, governance is informal — the spec authors and the first few implementers, working via GitHub.

Going forward:
- Members commit to a 2-year term, renewable once
- Replacement of a departing member is decided by simple majority of remaining members, with public nomination and discussion
- New members get added to fill roles, not to grow the group indefinitely; 8 is the cap

### Decision-making

**Lazy consensus for routine work.** Most decisions happen by rough consensus on GitHub issues. If no one objects within a week, the proposal moves forward. This works for 95% of what the group actually does.

**Simple majority for hard decisions.** When consensus isn't reachable (e.g., "should we add PSP X as a canonical binding?"), the working group votes. Simple majority of seated members wins. Ties are broken by the protocol editor.

**Unanimity for spec-breaking changes.** Any change that alters the semantics of an already-canonized element requires unanimous working group agreement. This is the Podcast Index rule. It's what makes "this version of the spec means exactly this thing" reliable.

**Escalation to custodian.** Only if the working group deadlocks catastrophically. Custodian's role is to break ties, not to rule on technical merit.

### Transparency commitments

- All meeting notes published within 72 hours
- All decisions recorded in a public ledger (simple markdown file in the governance repo)
- All changes to the spec carry an attribution to the motivating issue/PR
- All financial flows (grants, expenses) published annually

## Version management

### Numbering

Semantic versioning for the spec document:

- **Major versions (1.0, 2.0)** reserved for breaking changes. Only issued after a full community review cycle. Expected frequency: every 3–5 years at most.
- **Minor versions (1.1, 1.2)** for backward-compatible feature additions. Expected frequency: annually.
- **Patch versions (1.1.1, 1.1.2)** for errata, clarifications, typo fixes. Expected frequency: as needed.

### The 1.0 boundary

Before 1.0, the spec can change in breaking ways with a version bump. After 1.0, it cannot without a major version change, which requires much heavier process.

Pre-1.0 (current state through 0.9):
- Any working group member can propose changes
- 2-week comment period, then lazy consensus
- No custodian involvement for routine changes

Post-1.0:
- Changes require an RFC-style proposal document
- 6-week comment period minimum
- Working group vote required for any normative change
- Custodian notified of every change

The deliberate friction post-1.0 is what makes 1.0 mean something.

### Backward compatibility policy

An implementation claiming conformance to spec version N MUST continue to conform if the spec advances to N+1 or N+2 (same major version) without code changes. Minor version upgrades CAN add new optional features that implementations can choose to support, but cannot mutate existing features.

Example: a Level 5 reader built for 1.0 must still work against a 1.4 feed. It may not understand new Level 6 features added in 1.2, but it must still correctly handle all Level 1–5 features from the original 1.0 spec.

### Deprecation

Features deprecated in version N can be removed no earlier than the next major version (N+1 where N+1's first digit is different). A feature deprecated in 1.3 cannot be removed until 2.0 at the earliest. This gives implementers multi-year runway to update.

## Conformance claims

### Self-certification

Implementations self-certify by running the `om-test-suite` and publishing the results. There is no "official certification" process; the test suite is the arbiter.

A public registry at the custodian's URL lists implementations that have submitted test results. Each entry shows:
- Implementation name, version, licensed, repo URL
- Claimed conformance level (1–8)
- Test suite version used
- Date of last certification run
- Pass/fail details

This is a Wikipedia-shaped registry: low barriers to entry, transparent history, relies on public scrutiny to catch misrepresentation.

### Disputes

If two parties disagree on whether an implementation conforms, the arbitration path:

1. Run `om-test-suite` against the implementation. Publish results.
2. If the suite result contradicts a claim, the claim is wrong.
3. If the suite itself is in dispute, the working group arbitrates via normal decision-making.
4. If the working group is in dispute, the custodian breaks the tie.

This is not a courtroom. It's a reputation system. An implementer who repeatedly overclaims gets quietly removed from the public registry. That's the harshest sanction the governance system can impose, and it's sufficient for a protocol at this scale.

## Financial governance

### Fiscal sponsor

The working group is not a legal entity. Grants and donations flow through a fiscal sponsor, ideally the same entity as the custodian (Internet Archive, NLnet, Sovereign Tech Fund — they all can host fiscal sponsorship).

If that's not workable, use Open Collective Europe as a neutral fiscal sponsor. Standard arrangement, well-understood, low overhead.

### Budget approval

Annual budget drafted by the paid coordinator, reviewed by the working group, approved by simple majority. Published publicly.

Any single expense over €5,000 requires working group notification in advance. Any over €10,000 requires working group vote.

### Contributor compensation

Paid work — test suite maintenance, reference implementation development, coordinator time — is compensated at market rates from grant funds. Volunteer work is acknowledged in the spec and the public registry but not compensated.

The paid coordinator is explicitly paid; working group members are explicitly not (unless they're simultaneously doing paid implementation work under a grant).

## What happens when the working group breaks down

This will happen eventually. Every protocol's original working group eventually dissolves or loses momentum. The question is whether the protocol survives it.

Designed-in mitigations:

- **Spec is held by custodian, not working group.** If the WG disappears, the spec doesn't.
- **Test suite is held by custodian, not working group.** Same principle.
- **Reference implementations are under their own maintainers' control.** They don't depend on the WG continuing.
- **Custodian has power to appoint successor stewards.** If the WG is inactive for 12+ months, the custodian can solicit a new working group.

This is the Swartz/Winer model applied proactively. RSS survived UserLand's collapse because Harvard held the spec. `om` should survive its first working group's dissolution because the custodian holds the spec.

## Code of conduct

The working group adopts the [Contributor Covenant](https://www.contributor-covenant.org/) for its repositories and events. The paid coordinator handles enforcement. Escalation path: coordinator → working group → custodian.

This is unglamorous infrastructure but it matters. An open protocol without a CoC is a ticking bomb.
