package shared

import (
	"crypto/sha256"
	"encoding/hex"
)

func ComputeChecksum(e *Export) (Checksum, error) {
	canon, err := Canonicalize(e)
	if err != nil {
		return Checksum{}, err
	}
	sum := sha256.Sum256(canon)
	return Checksum{
		Alg:              "sha-256",
		Canonicalization: "jcs",
		Value:            hex.EncodeToString(sum[:]),
	}, nil
}

func VerifyChecksum(e *Export) error {
	got, err := ComputeChecksum(e)
	if err != nil {
		return err
	}
	if got.Value != e.Integrity.Checksum.Value {
		return &ChecksumMismatch{Want: e.Integrity.Checksum.Value, Got: got.Value}
	}
	if e.Integrity.Checksum.Alg != "sha-256" {
		return &ChecksumAlgUnsupported{Alg: e.Integrity.Checksum.Alg}
	}
	if e.Integrity.Checksum.Canonicalization != "jcs" {
		return &ChecksumAlgUnsupported{Alg: e.Integrity.Checksum.Canonicalization}
	}
	return nil
}

type ChecksumMismatch struct{ Want, Got string }

func (c *ChecksumMismatch) Error() string {
	return "checksum mismatch: want " + c.Want + " got " + c.Got
}

type ChecksumAlgUnsupported struct{ Alg string }

func (c *ChecksumAlgUnsupported) Error() string { return "unsupported checksum alg: " + c.Alg }
