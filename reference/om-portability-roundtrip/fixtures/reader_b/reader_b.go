// Package reader_b is a fixture reader emulating a NetNewsWire-shape client:
// bearer/VC-preferring, stores credentials in a distinct credential cache
// keyed by provider, re-emits url-token feeds verbatim. Its internal shape
// diverges from reader_a on purpose so the harness can catch field drift.
package reader_b

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/open-membership-rss/om-portability-roundtrip/shared"
)

const (
	ReaderName    = "fixture-reader-b"
	ReaderVersion = "0.1.0"
)

// Entry is reader_b's per-provider record. It splits the membership body from
// the credential blob, mirroring how a keychain-backed reader stores them in
// different tables and then reassembles at export time.
type Entry struct {
	Header     shared.Membership
	Credential json.RawMessage
}

type Store struct {
	Subject      shared.Subject
	Entries      map[string]*Entry
	Bundles      map[string]shared.Bundle
	GiftsPending []shared.PendingGift
	Pseudonyms   map[string]map[string]string
	InstanceID   string
	Signer       *shared.SignatureKey
	DiscoveryOK  map[string]bool
}

func NewStore(instanceID string) *Store {
	return &Store{
		Entries:     map[string]*Entry{},
		Bundles:     map[string]shared.Bundle{},
		Pseudonyms:  map[string]map[string]string{},
		InstanceID:  instanceID,
		DiscoveryOK: map[string]bool{},
	}
}

func (s *Store) Import(e *shared.Export) error {
	s.Subject = e.Subject
	for _, m := range e.Memberships {
		s.DiscoveryOK[m.Discovery] = true
		entry := &Entry{
			Header:     m,
			Credential: append([]byte(nil), m.Credential...),
		}
		entry.Header.Credential = nil
		if m.AuthMethod == shared.AuthVC && len(m.Credential) > 0 {
			var probe struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(m.Credential, &probe); err == nil && probe.Type == shared.CredOMVCSD {
				var sd shared.OMVCSDCredential
				if err := json.Unmarshal(m.Credential, &sd); err != nil {
					return fmt.Errorf("decode om-vc-sd: %w", err)
				}
				cp := map[string]string{}
				for k, v := range sd.PerPublisherPseudonyms {
					cp[k] = v
				}
				s.Pseudonyms[m.Provider] = cp
			}
		}
		s.Entries[m.Provider] = entry
	}
	for _, b := range e.Bundles {
		s.Bundles[b.Aggregator+"#"+b.BundleID] = b
	}
	s.GiftsPending = append([]shared.PendingGift(nil), e.GiftsPending...)
	return nil
}

func (s *Store) Export(withSignature bool) (*shared.Export, error) {
	memberships := make([]shared.Membership, 0, len(s.Entries))
	for _, entry := range s.Entries {
		m := entry.Header
		if len(entry.Credential) > 0 {
			m.Credential = append([]byte(nil), entry.Credential...)
		}
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

func (s *Store) PreferredAuth() string { return shared.AuthBearer }

func (s *Store) VerifyDiscovery(url string) error {
	if !s.DiscoveryOK[url] {
		return errors.New("discovery url never verified: " + url)
	}
	return nil
}
