package checks

import (
	"encoding/json"
	"fmt"
	"reflect"

	"github.com/open-membership-rss/om-portability-roundtrip/shared"
)

// FieldPreservation compares two exports modulo fields the spec permits to
// drift during a round trip:
//   - integrity block (checksum recomputed per body, signature per reader)
//   - exported_at (timestamped at each hop)
//   - exported_by (each reader identifies itself)
//   - memberships[].updated_at (importer SHOULD NOT bump it, but publisher
//     rotation is out of the harness's control — we check it separately)
//   - bearer access_token (spec calls out publisher rotation explicitly)
func FieldPreservation(start, end *shared.Export) Result {
	startC := stripDriftFields(start)
	endC := stripDriftFields(end)

	startJ, err := json.Marshal(startC)
	if err != nil {
		return Result{Name: "field-preservation", Pass: false, Message: err.Error(), SpecRef: "§14.3"}
	}
	endJ, err := json.Marshal(endC)
	if err != nil {
		return Result{Name: "field-preservation", Pass: false, Message: err.Error(), SpecRef: "§14.3"}
	}
	if !reflect.DeepEqual(startC, endC) {
		return Result{
			Name:    "field-preservation",
			Pass:    false,
			Message: fmt.Sprintf("round-trip diverged:\nstart: %s\nend:   %s", string(startJ), string(endJ)),
			SpecRef: "§14.3",
		}
	}
	return Result{
		Name:    "field-preservation",
		Pass:    true,
		Message: "round-trip body byte-equivalent modulo permitted drift",
		SpecRef: "§14.3",
	}
}

type comparable struct {
	SpecVersion  string                 `json:"spec_version"`
	Subject      shared.Subject         `json:"subject"`
	Memberships  []normalizedMembership `json:"memberships"`
	Bundles      []shared.Bundle        `json:"bundles"`
	GiftsPending []shared.PendingGift   `json:"gifts_pending"`
}

type normalizedMembership struct {
	Provider     string                 `json:"provider"`
	Discovery    string                 `json:"discovery"`
	FeedURL      string                 `json:"feed_url"`
	AuthMethod   string                 `json:"auth_method"`
	PrivacyMode  string                 `json:"privacy_mode"`
	AddedAt      string                 `json:"added_at"`
	Entitlements *shared.Entitlements   `json:"entitlements"`
	Credential   map[string]interface{} `json:"credential"`
}

func stripDriftFields(e *shared.Export) *comparable {
	c := &comparable{
		SpecVersion:  e.SpecVersion,
		Subject:      e.Subject,
		Memberships:  []normalizedMembership{},
		Bundles:      []shared.Bundle{},
		GiftsPending: []shared.PendingGift{},
	}
	c.Bundles = append(c.Bundles, e.Bundles...)
	c.GiftsPending = append(c.GiftsPending, e.GiftsPending...)
	for _, m := range e.Memberships {
		nm := normalizedMembership{
			Provider:     m.Provider,
			Discovery:    m.Discovery,
			FeedURL:      m.FeedURL,
			AuthMethod:   m.AuthMethod,
			PrivacyMode:  m.PrivacyMode,
			AddedAt:      m.AddedAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
			Entitlements: m.Entitlements,
		}
		if len(m.Credential) > 0 {
			var generic map[string]interface{}
			_ = json.Unmarshal(m.Credential, &generic)
			// access_token is rotatable per SPEC-PORTABILITY.md §4.5; scrub for
			// comparison so a publisher-side rotation does not fail the check.
			delete(generic, "access_token")
			nm.Credential = generic
		}
		c.Memberships = append(c.Memberships, nm)
	}
	return c
}
