package checks

import (
	"fmt"

	"github.com/open-membership-rss/om-portability-roundtrip/shared"
)

type Result struct {
	Name    string `json:"name"`
	Pass    bool   `json:"pass"`
	Message string `json:"message,omitempty"`
	SpecRef string `json:"spec_ref,omitempty"`
}

func Integrity(e *shared.Export, stage string) Result {
	if err := shared.VerifyChecksum(e); err != nil {
		return Result{
			Name:    "integrity-checksum-" + stage,
			Pass:    false,
			Message: err.Error(),
			SpecRef: "§7.1",
		}
	}
	if e.Integrity.Signature != nil {
		if err := shared.VerifySignature(e); err != nil {
			return Result{
				Name:    "integrity-signature-" + stage,
				Pass:    false,
				Message: err.Error(),
				SpecRef: "§7.2",
			}
		}
	}
	return Result{
		Name:    "integrity-" + stage,
		Pass:    true,
		Message: fmt.Sprintf("checksum %s verified", e.Integrity.Checksum.Value[:12]),
		SpecRef: "§7.1 §7.2",
	}
}
