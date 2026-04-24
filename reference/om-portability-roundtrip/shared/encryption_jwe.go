package shared

import (
	"fmt"

	"github.com/go-jose/go-jose/v4"
)

func EncryptJWE(plaintext []byte, passphrase string) ([]byte, error) {
	rcp := jose.Recipient{
		Algorithm:  jose.PBES2_HS512_A256KW,
		Key:        []byte(passphrase),
		PBES2Count: 4096,
	}
	opts := (&jose.EncrypterOptions{}).WithType("JWT").WithContentType("application/vnd.om-membership-export+json")
	enc, err := jose.NewEncrypter(jose.A256GCM, rcp, opts)
	if err != nil {
		return nil, fmt.Errorf("jose encrypter: %w", err)
	}
	obj, err := enc.Encrypt(plaintext)
	if err != nil {
		return nil, err
	}
	compact, err := obj.CompactSerialize()
	if err != nil {
		return nil, err
	}
	return []byte(compact), nil
}

func DecryptJWE(ciphertext []byte, passphrase string) ([]byte, error) {
	obj, err := jose.ParseEncrypted(
		string(ciphertext),
		[]jose.KeyAlgorithm{jose.PBES2_HS512_A256KW},
		[]jose.ContentEncryption{jose.A256GCM},
	)
	if err != nil {
		return nil, fmt.Errorf("parse jwe: %w", err)
	}
	return obj.Decrypt([]byte(passphrase))
}
