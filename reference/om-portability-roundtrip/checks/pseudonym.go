package checks

import (
	"encoding/json"
	"fmt"

	"github.com/open-membership-rss/om-portability-roundtrip/shared"
)

// Pseudonym verifies §8 P2: OM-VC-SD per-publisher pseudonyms are byte-equal
// between the starting and ending exports. A difference here means the round
// trip silently reset the pseudonym, which presents the user as a new visitor
// to the publisher — the failure the spec exists to prevent.
func Pseudonym(start, end *shared.Export) Result {
	startMap := collectPseudonyms(start)
	endMap := collectPseudonyms(end)

	if len(startMap) == 0 && len(endMap) == 0 {
		return Result{
			Name:    "pseudonym-preservation",
			Pass:    true,
			Message: "no OM-VC-SD memberships; P2 vacuously satisfied",
			SpecRef: "§8 P2",
		}
	}
	if len(startMap) != len(endMap) {
		return Result{
			Name:    "pseudonym-preservation",
			Pass:    false,
			Message: fmt.Sprintf("pseudonym map count changed: %d -> %d", len(startMap), len(endMap)),
			SpecRef: "§8 P2",
		}
	}
	for publisher, ps := range startMap {
		if endMap[publisher] != ps {
			return Result{
				Name:    "pseudonym-preservation",
				Pass:    false,
				Message: fmt.Sprintf("pseudonym for %s drifted: %q -> %q", publisher, ps, endMap[publisher]),
				SpecRef: "§8 P2",
			}
		}
	}
	return Result{
		Name:    "pseudonym-preservation",
		Pass:    true,
		Message: fmt.Sprintf("%d per-publisher pseudonym(s) preserved byte-equal", len(startMap)),
		SpecRef: "§8 P2",
	}
}

func collectPseudonyms(e *shared.Export) map[string]string {
	out := map[string]string{}
	for _, m := range e.Memberships {
		if m.AuthMethod != shared.AuthVC || len(m.Credential) == 0 {
			continue
		}
		var probe struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(m.Credential, &probe); err != nil || probe.Type != shared.CredOMVCSD {
			continue
		}
		var cred shared.OMVCSDCredential
		if err := json.Unmarshal(m.Credential, &cred); err != nil {
			continue
		}
		for pub, ps := range cred.PerPublisherPseudonyms {
			out[pub] = ps
		}
	}
	return out
}
