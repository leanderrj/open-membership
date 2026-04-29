# Contributing

Thanks for considering a contribution. This repository holds the specification text, companion documents, reference implementations, and the openmembership.org site.

## Where things live

- `SPEC.md`: the canonical specification.
- `spec/`: companion specifications (portability, ActivityPub coexistence, adapter profile, syndication mappings, sharing policy, errata).
- `docs/`: non-normative project documents (featureset, governance, reader architecture, related work).
- `internal/`: project planning and rationale; not part of the published specification.
- `reference/`: working reference implementations (Ghost, WordPress, Miniflux, Eleventy, test suite, portability round-trip).
- `ietf/`: kramdown-rfc draft for IETF Independent Submission.
- `site/`: the openmembership.org Astro site.
- `references/`: verbatim copies of upstream specifications.

## What we accept

| Change kind | Branch / PR style |
|---|---|
| Editorial fix in any document (typo, broken link, em or en dash) | small PR, single concern, no issue required |
| Clarification of existing normative text | PR referencing the ambiguity it resolves; cite implementer feedback if any |
| New normative element or attribute | open an issue first; major-version material |
| New companion specification | open an issue first; requires working-group discussion |
| Reference implementation feature or bug fix | PR scoped to one `reference/<impl>/` subdirectory |
| Site / documentation site change | PR scoped to `site/` |

## House style

- No em-dashes (`—`) or en-dashes (`–`) anywhere. Use `;`, `:`, `,`, parens, or split sentences.
- Prefer terse, direct prose. Avoid marketing voice, triadic constructions, and slop closures.
- Comparative material lives only in `docs/RELATED-WORK.md`; do not duplicate elsewhere.
- Project strategy and rationale belong in `internal/`, not in `SPEC.md` or under `docs/`.
- Code comments: explain *why*, not *what*. Default to no comment.

## Commit and PR

- One concern per PR. Editorial changes can batch within a single document.
- Commit message subject in imperative voice, body explains why if non-obvious.
- Do not skip pre-commit hooks unless an explicit reason is in the PR description.
- The CI link checker, build, and spec-example validators must pass before merge.

## Reference implementations

Each implementation under `reference/` follows its own language conventions:

- Go (Miniflux fork, test suite, portability round-trip): `gofmt`, `go vet`, table-driven tests.
- TypeScript (Ghost plugin, Eleventy plugin): `tsc --strict`, Vitest.
- PHP (WordPress plugin): PSR-12 via `phpcs`, PHPUnit.

A change to one implementation should not require a change to another. If it does, the underlying spec is probably ambiguous; open an issue against the spec instead.

## Asking questions

For specification clarifications, open a discussion under "spec-clarification" in the issue tracker. For implementer support, open an issue under the relevant `reference/<impl>/` subdirectory. For a private security report, follow `SECURITY.md`.
