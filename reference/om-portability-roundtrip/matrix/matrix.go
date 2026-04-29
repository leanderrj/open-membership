// Package matrix enumerates the 26 round-trip runs required by ROADMAP Phase 5
// M13. Each Run pairs a canonical input fixture with an envelope choice and an
// expected-pass profile; the orchestrator executes every Run and aggregates
// results into the report.
package matrix

import "github.com/open-membership-rss/om-portability-roundtrip/shared"

type Run struct {
	ID             string
	Description    string
	FixturePath    string
	CredentialKind string
	Envelope       string
	Direction      string
	ExpectedPass   bool
	// ExpectedSkipReason, when non-empty, means the Run is intentionally
	// not executed; e.g. plaintext envelope against a non-url-token fixture.
	ExpectedSkipReason string
	// EdgeCase flags runs that exist to exercise specific failure modes or
	// boundary conditions from the 26-run matrix beyond the 12 core runs.
	EdgeCase bool
	SpecRef  string
}

// Full returns the 26-run matrix:
//   - 12 core: 6 credential shapes × 2 envelopes (age, jwe)
//   - 2 plaintext: url-token in both directions
//   - 12 edge cases: see edgeCases()
func Full() []Run {
	var runs []Run
	runs = append(runs, core()...)
	runs = append(runs, plaintextRuns()...)
	runs = append(runs, edgeCases()...)
	return runs
}

func core() []Run {
	kinds := []struct {
		kind        string
		fixture     string
		description string
	}{
		{"url-token", "fixtures/memberships/url-token.json", "url-token single publisher"},
		{"bearer", "fixtures/memberships/bearer.json", "bearer access+refresh token"},
		{"dpop", "fixtures/memberships/dpop.json", "dpop-bound token with holder key"},
		{"OM-VC", "fixtures/memberships/om-vc.json", "OM-VC 1.0 verifiable credential"},
		{"OM-VC-SD", "fixtures/memberships/om-vc-sd.json", "OM-VC-SD selective disclosure + pseudonym"},
		{"bundle", "fixtures/memberships/bundle.json", "OM-VC issued by aggregator with audience"},
	}
	envelopes := []string{shared.EnvelopeAge, shared.EnvelopeJWE}

	var out []Run
	for _, k := range kinds {
		for _, env := range envelopes {
			out = append(out, Run{
				ID:             "core-" + k.kind + "-" + env,
				Description:    k.description + " through " + env + " envelope",
				FixturePath:    k.fixture,
				CredentialKind: k.kind,
				Envelope:       env,
				Direction:      "A->B->A",
				ExpectedPass:   true,
				SpecRef:        "SPEC-PORTABILITY.md §14.3",
			})
		}
	}
	return out
}

func plaintextRuns() []Run {
	return []Run{
		{
			ID:             "plain-url-token-ab",
			Description:    "url-token plaintext envelope A->B->A (allowed by §9.3)",
			FixturePath:    "fixtures/memberships/url-token.json",
			CredentialKind: "url-token",
			Envelope:       shared.EnvelopePlain,
			Direction:      "A->B->A",
			ExpectedPass:   true,
			SpecRef:        "SPEC-PORTABILITY.md §9.3",
		},
		{
			ID:             "plain-url-token-ba",
			Description:    "url-token plaintext envelope B->A->B (allowed by §9.3)",
			FixturePath:    "fixtures/memberships/url-token.json",
			CredentialKind: "url-token",
			Envelope:       shared.EnvelopePlain,
			Direction:      "B->A->B",
			ExpectedPass:   true,
			SpecRef:        "SPEC-PORTABILITY.md §9.3",
		},
	}
}

// edgeCases returns the 12 negative / boundary runs filling out the 26-run
// matrix. Each exercises a specific §8 / §9 / §11 invariant.
func edgeCases() []Run {
	return []Run{
		{
			ID:           "edge-bearer-plain-rejected",
			Description:  "bearer membership in plaintext envelope MUST be rejected (§9.3 / §8 P3)",
			FixturePath:  "fixtures/memberships/bearer.json",
			CredentialKind: "bearer",
			Envelope:     shared.EnvelopePlain,
			Direction:    "A->B->A",
			ExpectedPass: false,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §8 P3, §9.3",
		},
		{
			ID:           "edge-dpop-plain-rejected",
			Description:  "dpop key in plaintext envelope MUST be rejected",
			FixturePath:  "fixtures/memberships/dpop.json",
			CredentialKind: "dpop",
			Envelope:     shared.EnvelopePlain,
			Direction:    "A->B->A",
			ExpectedPass: false,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §8 P3",
		},
		{
			ID:           "edge-omvc-plain-rejected",
			Description:  "OM-VC holder key in plaintext envelope MUST be rejected",
			FixturePath:  "fixtures/memberships/om-vc.json",
			CredentialKind: "OM-VC",
			Envelope:     shared.EnvelopePlain,
			Direction:    "A->B->A",
			ExpectedPass: false,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §8 P3",
		},
		{
			ID:           "edge-omvcsd-plain-rejected",
			Description:  "OM-VC-SD pseudonym secret in plaintext envelope MUST be rejected",
			FixturePath:  "fixtures/memberships/om-vc-sd.json",
			CredentialKind: "OM-VC-SD",
			Envelope:     shared.EnvelopePlain,
			Direction:    "A->B->A",
			ExpectedPass: false,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §8 P3",
		},
		{
			ID:           "edge-omvcsd-pseudonym-preserved-age",
			Description:  "OM-VC-SD per-publisher pseudonyms survive A->B->A (age)",
			FixturePath:  "fixtures/memberships/om-vc-sd.json",
			CredentialKind: "OM-VC-SD",
			Envelope:     shared.EnvelopeAge,
			Direction:    "A->B->A",
			ExpectedPass: true,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §8 P2",
		},
		{
			ID:           "edge-omvcsd-pseudonym-preserved-jwe",
			Description:  "OM-VC-SD per-publisher pseudonyms survive A->B->A (jwe)",
			FixturePath:  "fixtures/memberships/om-vc-sd.json",
			CredentialKind: "OM-VC-SD",
			Envelope:     shared.EnvelopeJWE,
			Direction:    "A->B->A",
			ExpectedPass: true,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §8 P2",
		},
		{
			ID:           "edge-bundle-reverse-direction",
			Description:  "bundle credential survives B->A->B round trip",
			FixturePath:  "fixtures/memberships/bundle.json",
			CredentialKind: "bundle",
			Envelope:     shared.EnvelopeAge,
			Direction:    "B->A->B",
			ExpectedPass: true,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §5",
		},
		{
			ID:           "edge-checksum-tamper",
			Description:  "checksum mismatch on import is rejected (§7.1)",
			FixturePath:  "fixtures/memberships/url-token.json",
			CredentialKind: "url-token",
			Envelope:     shared.EnvelopeAge,
			Direction:    "A->B->A",
			ExpectedPass: true,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §7.1",
		},
		{
			ID:           "edge-collision-merge",
			Description:  "collision resolution: newer updated_at wins (§11.1)",
			FixturePath:  "fixtures/memberships/url-token.json",
			CredentialKind: "url-token",
			Envelope:     shared.EnvelopeAge,
			Direction:    "A->B->A",
			ExpectedPass: true,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §11.1",
		},
		{
			ID:           "edge-bearer-rotation-tolerated",
			Description:  "publisher-rotated bearer access_token does not fail round trip",
			FixturePath:  "fixtures/memberships/bearer.json",
			CredentialKind: "bearer",
			Envelope:     shared.EnvelopeAge,
			Direction:    "A->B->A",
			ExpectedPass: true,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §14.3",
		},
		{
			ID:           "edge-discovery-reverify",
			Description:  "importer re-fetches .well-known/open-membership (§11)",
			FixturePath:  "fixtures/memberships/url-token.json",
			CredentialKind: "url-token",
			Envelope:     shared.EnvelopeAge,
			Direction:    "A->B->A",
			ExpectedPass: true,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §11",
		},
		{
			ID:           "edge-no-cross-publisher-id",
			Description:  "§8 P1: no identifier other than local_id or pseudonym map appears twice",
			FixturePath:  "fixtures/memberships/url-token.json",
			CredentialKind: "url-token",
			Envelope:     shared.EnvelopeAge,
			Direction:    "A->B->A",
			ExpectedPass: true,
			EdgeCase:     true,
			SpecRef:      "SPEC-PORTABILITY.md §8 P1",
		},
	}
}

// Count returns the total number of runs, enforcing the 26-run invariant.
func Count() int { return len(Full()) }
