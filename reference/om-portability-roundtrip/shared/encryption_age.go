package shared

import (
	"bytes"
	"fmt"
	"io"

	"filippo.io/age"
)

func EncryptAge(plaintext []byte, passphrase string) ([]byte, error) {
	recip, err := age.NewScryptRecipient(passphrase)
	if err != nil {
		return nil, fmt.Errorf("age recipient: %w", err)
	}
	// WORK_FACTOR: the harness runs 26 encrypts; the default scrypt cost is
	// tuned for an interactive prompt. Dialing down avoids a multi-minute run
	// while still exercising the envelope code path end to end.
	recip.SetWorkFactor(10)

	var out bytes.Buffer
	w, err := age.Encrypt(&out, recip)
	if err != nil {
		return nil, err
	}
	if _, err := w.Write(plaintext); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func DecryptAge(ciphertext []byte, passphrase string) ([]byte, error) {
	id, err := age.NewScryptIdentity(passphrase)
	if err != nil {
		return nil, err
	}
	r, err := age.Decrypt(bytes.NewReader(ciphertext), id)
	if err != nil {
		return nil, err
	}
	return io.ReadAll(r)
}
