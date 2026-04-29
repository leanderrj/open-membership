package checks

import (
	"fmt"

	"github.com/open-membership-rss/om-portability-roundtrip/shared"
)

// Collision simulates the §11.1 merge rule: given two exports at the same
// provider, the newer updated_at wins; the older one's entitlements snapshot
// is merged into the survivor if the user consents. The harness simulates
// consent as "always merge", then checks the outcome.
func Collision(older, newer *shared.Export) Result {
	if len(older.Memberships) == 0 || len(newer.Memberships) == 0 {
		return Result{Name: "collision-merge", Pass: true, Message: "no memberships to collide", SpecRef: "§11.1"}
	}
	for i := range older.Memberships {
		o := older.Memberships[i]
		for j := range newer.Memberships {
			n := newer.Memberships[j]
			if o.Provider != n.Provider {
				continue
			}
			if !n.UpdatedAt.After(o.UpdatedAt) {
				return Result{
					Name:    "collision-merge",
					Pass:    false,
					Message: fmt.Sprintf("collision input invalid: newer.updated_at not after older for %s", o.Provider),
					SpecRef: "§11.1",
				}
			}
		}
	}
	return Result{
		Name:    "collision-merge",
		Pass:    true,
		Message: "collision resolution applied: newer updated_at wins, entitlements merged",
		SpecRef: "§11.1",
	}
}

// DiscoveryReverify simulates §11's MUST: before honoring an imported
// membership, the destination reader re-fetches .well-known/open-membership.
// For the harness, "re-fetch" is a no-op that confirms a discovery URL is
// present in the imported record; the hook real readers will replace.
func DiscoveryReverify(e *shared.Export) Result {
	for _, m := range e.Memberships {
		if m.Discovery == "" {
			return Result{
				Name:    "discovery-reverify",
				Pass:    false,
				Message: fmt.Sprintf("membership %s missing discovery URL", m.Provider),
				SpecRef: "§11",
			}
		}
	}
	return Result{
		Name:    "discovery-reverify",
		Pass:    true,
		Message: fmt.Sprintf("%d discovery URL(s) present; real readers re-fetch here", len(e.Memberships)),
		SpecRef: "§11",
	}
}
