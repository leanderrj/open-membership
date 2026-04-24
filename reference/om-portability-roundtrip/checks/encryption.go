package checks

import (
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/open-membership-rss/om-portability-roundtrip/shared"
)

// EncryptionEnvelope exercises the envelope path end to end: the export is
// serialized, encrypted, decrypted, and re-parsed. A byte-level JCS mismatch
// between input and decrypted output is a fail.
func EncryptionEnvelope(e *shared.Export, envelope, passphrase string) Result {
	raw, err := json.Marshal(e)
	if err != nil {
		return Result{Name: "encryption-envelope-" + envelope, Pass: false, Message: err.Error(), SpecRef: "§9"}
	}
	var cipher, plain []byte
	switch envelope {
	case shared.EnvelopePlain:
		cipher = raw
		plain = raw
	case shared.EnvelopeAge:
		cipher, err = shared.EncryptAge(raw, passphrase)
		if err != nil {
			return Result{Name: "encryption-envelope-age", Pass: false, Message: err.Error(), SpecRef: "§9.1"}
		}
		plain, err = shared.DecryptAge(cipher, passphrase)
		if err != nil {
			return Result{Name: "encryption-envelope-age", Pass: false, Message: err.Error(), SpecRef: "§9.1"}
		}
	case shared.EnvelopeJWE:
		cipher, err = shared.EncryptJWE(raw, passphrase)
		if err != nil {
			return Result{Name: "encryption-envelope-jwe", Pass: false, Message: err.Error(), SpecRef: "§9.2"}
		}
		plain, err = shared.DecryptJWE(cipher, passphrase)
		if err != nil {
			return Result{Name: "encryption-envelope-jwe", Pass: false, Message: err.Error(), SpecRef: "§9.2"}
		}
	default:
		return Result{Name: "encryption-envelope", Pass: false, Message: "unknown envelope " + envelope, SpecRef: "§9"}
	}
	if !bytes.Equal(raw, plain) {
		return Result{
			Name:    "encryption-envelope-" + envelope,
			Pass:    false,
			Message: "decrypt(encrypt(x)) != x",
			SpecRef: "§9",
		}
	}
	return Result{
		Name:    "encryption-envelope-" + envelope,
		Pass:    true,
		Message: fmt.Sprintf("%s: %d bytes plaintext -> %d bytes ciphertext -> plaintext", envelope, len(raw), len(cipher)),
		SpecRef: "§9",
	}
}

// PlaintextAllowed enforces §9.3: plaintext envelopes are allowed ONLY when
// every membership is url-token and no bundles are present.
func PlaintextAllowed(e *shared.Export, envelope string) Result {
	if envelope != shared.EnvelopePlain {
		return Result{Name: "plaintext-allowed", Pass: true, Message: "non-plaintext envelope; §9.3 N/A", SpecRef: "§9.3"}
	}
	if shared.ContainsSensitive(e) {
		return Result{
			Name:    "plaintext-allowed",
			Pass:    false,
			Message: "plaintext export contains disallowed auth method or bundle",
			SpecRef: "§8 P3, §9.3",
		}
	}
	return Result{Name: "plaintext-allowed", Pass: true, Message: "url-token-only plaintext export permitted", SpecRef: "§9.3"}
}
