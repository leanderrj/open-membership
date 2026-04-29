# Security policy

## Scope

Security reports are accepted for:

1. **The specification itself.** A flaw in the protocol that an implementation cannot mitigate by configuration. Examples: a credential profile that permits replay across publishers, a discovery flow that allows downgrade to an unintended authentication method.
2. **The reference implementations** under `reference/`. Examples: token leakage, auth bypass, signature forgery, injection vectors in a CMS plugin.
3. **The openmembership.org site** under `site/`. Examples: stored XSS in a build artifact, mixed-content errors that downgrade integrity.

## Out of scope

- Vulnerabilities in upstream Ghost, WordPress, Miniflux, Eleventy, or other projects that the reference implementations depend on. Report those upstream.
- Vulnerabilities in third-party deployments of `om`. Contact the operator of that deployment.
- Speculative cryptanalysis of standard primitives (Ed25519, BBS+, etc.) without a concrete attack on this specification's use of them.

## Reporting

Email `leander@leme.nl` with the subject prefix `[om-security]`.

Please include:

- The artifact affected: specification section, file path in `reference/`, or URL on `openmembership.org`.
- A short reproduction or proof of concept.
- Whether the issue affects the published 0.4 draft, the working 0.5 branch, or a deployed reference implementation.

We will acknowledge receipt within 5 working days. If a coordinated disclosure timeline is appropriate, we will propose one.

## Disclosure

For specification-level issues, the path is:

1. Acknowledgement and triage.
2. Draft erratum or specification change in a private branch.
3. Coordinated disclosure with implementers known to be deploying the affected feature.
4. Public erratum, with credit to the reporter unless they request anonymity.

For reference-implementation issues, the path is the standard 90-day responsible-disclosure window unless a shorter or longer one is mutually agreed.

## Hall of thanks

People who have reported security issues are credited in the relevant erratum and in `docs/GOVERNANCE.md` upon their consent.
