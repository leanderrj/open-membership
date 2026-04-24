package shared

import (
	"encoding/json"
	"fmt"

	"github.com/gowebpki/jcs"
)

// Canonicalize returns the RFC 8785 JCS-canonical form of the export body with
// integrity stripped. Per SPEC-PORTABILITY.md §7.1, the checksum is computed
// over the body *excluding* the integrity object itself.
func Canonicalize(e *Export) ([]byte, error) {
	body, err := json.Marshal(e)
	if err != nil {
		return nil, fmt.Errorf("marshal export: %w", err)
	}

	var generic map[string]interface{}
	if err := json.Unmarshal(body, &generic); err != nil {
		return nil, fmt.Errorf("unmarshal for strip: %w", err)
	}
	delete(generic, "integrity")

	stripped, err := json.Marshal(generic)
	if err != nil {
		return nil, fmt.Errorf("marshal stripped: %w", err)
	}

	canon, err := jcs.Transform(stripped)
	if err != nil {
		return nil, fmt.Errorf("jcs transform: %w", err)
	}
	return canon, nil
}

// CanonicalizeFull canonicalizes the whole document including integrity.
// Used by callers that need byte-stable serialization of a complete object.
func CanonicalizeFull(v interface{}) ([]byte, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	return jcs.Transform(raw)
}
