// Package reader_a is a fixture reader emulating a Miniflux-shape client:
// url-token-preferring, stores memberships in a flat list keyed by provider,
// re-emits bearer credentials verbatim but regenerates the reader_instance_id
// on every export (the behavior a self-hosted reader has on re-install).
package reader_a

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/open-membership-rss/om-portability-roundtrip/shared"
)

const (
	ReaderName    = "fixture-reader-a"
	ReaderVersion = "0.1.0"
)

// Store is the reader's internal representation after import. The export path
// re-serializes from this representation, so any lossy round-trip shows up as
// a field-preservation failure in the harness.
type Store struct {
	Subject      shared.Subject
	Memberships  map[string]shared.Membership
	Bundles      map[string]shared.Bundle
	GiftsPending []shared.PendingGift
	// Pseudonyms is extracted from OM-VC-SD memberships into the reader's own
	// per-publisher pseudonym table; the export path merges it back in. This
	// mirrors how a real reader stores pseudonyms outside the credential blob.
	Pseudonyms      map[string]map[string]string
	InstanceID      string
	Signer          *shared.SignatureKey
	LastDiscoveryOK map[string]bool
}

func NewStore(instanceID string) *Store {
	return &Store{
		Memberships:     map[string]shared.Membership{},
		Bundles:         map[string]shared.Bundle{},
		Pseudonyms:      map[string]map[string]string{},
		InstanceID:      instanceID,
		LastDiscoveryOK: map[string]bool{},
	}
}

// Import hydrates the store from a verified Export. It expects checksum
// verification and envelope decryption to have already happened upstream.
func (s *Store) Import(e *shared.Export) error {
	s.Subject = shared.Subject{
		LocalID:     e.Subject.LocalID,
		DisplayName: e.Subject.DisplayName,
	}
	for _, m := range e.Memberships {
		s.LastDiscoveryOK[m.Discovery] = true
		if m.AuthMethod == shared.AuthVC && len(m.Credential) > 0 {
			var probe struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(m.Credential, &probe); err == nil && probe.Type == shared.CredOMVCSD {
				var sd shared.OMVCSDCredential
				if err := json.Unmarshal(m.Credential, &sd); err != nil {
					return fmt.Errorf("decode om-vc-sd: %w", err)
				}
				s.Pseudonyms[m.Provider] = map[string]string{}
				for pub, ps := range sd.PerPublisherPseudonyms {
					s.Pseudonyms[m.Provider][pub] = ps
				}
			}
		}
		s.Memberships[m.Provider] = m
	}
	for _, b := range e.Bundles {
		s.Bundles[b.Aggregator+"#"+b.BundleID] = b
	}
	s.GiftsPending = append([]shared.PendingGift(nil), e.GiftsPending...)
	return nil
}

// Export re-serializes the store into a new Export. Reader A preserves every
// field verbatim except: reader_instance_id (reassigned to this reader), and
// exported_at (set to now). updated_at on each membership is preserved; §11
// "Do not extend the updated_at timestamp on import".
func (s *Store) Export(withSignature bool) (*shared.Export, error) {
	memberships := make([]shared.Membership, 0, len(s.Memberships))
	for _, m := range s.Memberships {
		if m.AuthMethod == shared.AuthVC && len(m.Credential) > 0 {
			var probe struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(m.Credential, &probe); err == nil && probe.Type == shared.CredOMVCSD {
				merged, err := mergePseudonyms(m.Credential, s.Pseudonyms[m.Provider])
				if err != nil {
					return nil, err
				}
				m.Credential = merged
			}
		}
		memberships = append(memberships, m)
	}
	// Deterministic ordering so A->B->A output is byte-comparable.
	sortMembershipsByProvider(memberships)

	bundles := make([]shared.Bundle, 0, len(s.Bundles))
	for _, b := range s.Bundles {
		bundles = append(bundles, b)
	}
	sortBundlesByKey(bundles)

	exp := &shared.Export{
		Context:     shared.DefaultContext(),
		Type:        shared.TypeExport,
		SpecVersion: shared.SpecVersion,
		ExportedAt:  time.Now().UTC(),
		ExportedBy: shared.ExportedBy{
			Reader:           ReaderName,
			ReaderVersion:    ReaderVersion,
			ReaderInstanceID: s.InstanceID,
		},
		Subject:      s.Subject,
		Memberships:  memberships,
		Bundles:      bundles,
		GiftsPending: s.GiftsPending,
	}
	sum, err := shared.ComputeChecksum(exp)
	if err != nil {
		return nil, err
	}
	exp.Integrity.Checksum = sum
	if withSignature {
		if s.Signer == nil {
			k, err := shared.NewSignatureKey()
			if err != nil {
				return nil, err
			}
			s.Signer = k
		}
		sig, err := s.Signer.Sign(exp)
		if err != nil {
			return nil, err
		}
		exp.Integrity.Signature = &sig
	}
	return exp, nil
}

func mergePseudonyms(raw []byte, overrides map[string]string) ([]byte, error) {
	var cred shared.OMVCSDCredential
	if err := json.Unmarshal(raw, &cred); err != nil {
		return nil, err
	}
	if overrides != nil {
		if cred.PerPublisherPseudonyms == nil {
			cred.PerPublisherPseudonyms = map[string]string{}
		}
		for k, v := range overrides {
			cred.PerPublisherPseudonyms[k] = v
		}
	}
	return json.Marshal(cred)
}

// PreferredAuth reports the reader's auth preference. Reader A prefers
// url-token; the harness uses this to exercise publisher-side preference
// resolution. Not currently load-bearing for round-trip conformance, but the
// hook exists for when real readers plug in.
func (s *Store) PreferredAuth() string { return shared.AuthURLToken }

func (s *Store) VerifyDiscovery(url string) error {
	if !s.LastDiscoveryOK[url] {
		return errors.New("discovery url never verified: " + url)
	}
	return nil
}
