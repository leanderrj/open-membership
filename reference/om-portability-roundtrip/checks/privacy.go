package checks

import (
	"encoding/json"
	"fmt"

	"github.com/open-membership-rss/om-portability-roundtrip/shared"
)

// NoCrossPublisherID enforces §8 P1: no identifier other than subject.local_id,
// bundle audience entries, or per-publisher pseudonym maps may appear under
// two distinct publisher providers.
//
// The check walks every string value inside every membership credential and
// indexes it by provider; any repeat across providers is a P1 violation.
func NoCrossPublisherID(e *shared.Export) Result {
	byProvider := map[string]map[string]bool{}
	for _, m := range e.Memberships {
		seen := map[string]bool{}
		if len(m.Credential) > 0 {
			var generic map[string]interface{}
			if err := json.Unmarshal(m.Credential, &generic); err == nil {
				collectStrings(generic, seen, filterCredential(m))
			}
		}
		seen[m.FeedURL] = true
		byProvider[m.Provider] = seen
	}
	conflicts := map[string][]string{}
	for prov, set := range byProvider {
		for other, otherSet := range byProvider {
			if prov >= other {
				continue
			}
			for v := range set {
				if otherSet[v] {
					conflicts[v] = append(conflicts[v], prov, other)
				}
			}
		}
	}
	if len(conflicts) > 0 {
		return Result{
			Name:    "no-cross-publisher-id",
			Pass:    false,
			Message: fmt.Sprintf("identifier(s) appear under multiple providers: %v", keys(conflicts)),
			SpecRef: "§8 P1",
		}
	}
	return Result{
		Name:    "no-cross-publisher-id",
		Pass:    true,
		Message: "no identifier repeats across providers (modulo allowed exceptions)",
		SpecRef: "§8 P1",
	}
}

// filterCredential returns the keys within this membership's credential that
// should NOT count toward the cross-publisher identifier check; they are
// either intentionally stable per the spec or cannot leak cross-publisher
// state by their nature.
func filterCredential(m shared.Membership) map[string]bool {
	// Pseudonym maps are listed per-publisher and MUST differ per publisher
	// (§8 P1 "individually per publisher and MUST NOT share values") -
	// verified by Pseudonym() and covered here by not indexing the map keys.
	return map[string]bool{
		"per_publisher_pseudonyms": true,
		// JWK curve / kty strings repeat across all VC memberships by design
		// (every Ed25519 holder key has "crv": "Ed25519"); those are not
		// subscriber identifiers.
		"kty":     true,
		"crv":     true,
		"alg":     true,
		"type":    true,
		"profile": true,
	}
}

func collectStrings(v interface{}, out map[string]bool, skip map[string]bool) {
	switch t := v.(type) {
	case map[string]interface{}:
		for k, child := range t {
			if skip[k] {
				continue
			}
			collectStrings(child, out, skip)
		}
	case []interface{}:
		for _, child := range t {
			collectStrings(child, out, skip)
		}
	case string:
		if len(t) >= 12 {
			out[t] = true
		}
	}
}

func keys(m map[string][]string) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}
