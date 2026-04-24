package shared

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"errors"
)

// SignatureKey pairs an Ed25519 key with a synthetic multibase-looking public
// encoding. Real implementations use did:key multibase; for the harness we use
// "z" + base64url since full did:key is out of scope for round-trip validation.
type SignatureKey struct {
	Private ed25519.PrivateKey
	Public  ed25519.PublicKey
}

func NewSignatureKey() (*SignatureKey, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	return &SignatureKey{Private: priv, Public: pub}, nil
}

func (k *SignatureKey) PublicKeyMultibase() string {
	return "z" + base64.RawURLEncoding.EncodeToString(k.Public)
}

func (k *SignatureKey) Sign(e *Export) (Signature, error) {
	canon, err := Canonicalize(e)
	if err != nil {
		return Signature{}, err
	}
	sig := ed25519.Sign(k.Private, canon)
	return Signature{
		Alg:                "EdDSA",
		PublicKeyMultibase: k.PublicKeyMultibase(),
		SignatureValue:     "z" + base64.RawURLEncoding.EncodeToString(sig),
	}, nil
}

func VerifySignature(e *Export) error {
	if e.Integrity.Signature == nil {
		return nil
	}
	sig := e.Integrity.Signature
	if sig.Alg != "EdDSA" {
		return errors.New("unsupported signature alg: " + sig.Alg)
	}
	if len(sig.PublicKeyMultibase) < 2 || sig.PublicKeyMultibase[0] != 'z' {
		return errors.New("malformed publicKeyMultibase")
	}
	pubBytes, err := base64.RawURLEncoding.DecodeString(sig.PublicKeyMultibase[1:])
	if err != nil {
		return err
	}
	if len(pubBytes) != ed25519.PublicKeySize {
		return errors.New("malformed public key length")
	}
	if len(sig.SignatureValue) < 2 || sig.SignatureValue[0] != 'z' {
		return errors.New("malformed signatureValue")
	}
	sigBytes, err := base64.RawURLEncoding.DecodeString(sig.SignatureValue[1:])
	if err != nil {
		return err
	}
	canon, err := Canonicalize(e)
	if err != nil {
		return err
	}
	if !ed25519.Verify(pubBytes, canon, sigBytes) {
		return errors.New("signature verify failed")
	}
	return nil
}
