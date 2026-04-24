package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/open-membership-rss/om-portability-roundtrip/checks"
	"github.com/open-membership-rss/om-portability-roundtrip/fixtures/reader_a"
	"github.com/open-membership-rss/om-portability-roundtrip/fixtures/reader_b"
	"github.com/open-membership-rss/om-portability-roundtrip/matrix"
	"github.com/open-membership-rss/om-portability-roundtrip/shared"
)

type reader interface {
	Import(*shared.Export) error
	Export(bool) (*shared.Export, error)
}

type RunResult struct {
	ID           string         `json:"id"`
	Description  string         `json:"description"`
	SpecRef      string         `json:"spec_ref"`
	Envelope     string         `json:"envelope"`
	Direction    string         `json:"direction"`
	ExpectedPass bool           `json:"expected_pass"`
	Pass         bool           `json:"pass"`
	Skipped      bool           `json:"skipped,omitempty"`
	SkipReason   string         `json:"skip_reason,omitempty"`
	Duration     string         `json:"duration"`
	Checks       []checks.Result `json:"checks"`
	Error        string         `json:"error,omitempty"`
}

const passphrase = "roundtrip-harness-fixed-passphrase-not-secret"

func runMatrix(repoRoot string, runs []matrix.Run) ([]RunResult, error) {
	out := make([]RunResult, 0, len(runs))
	for _, r := range runs {
		res := runOne(repoRoot, r)
		out = append(out, res)
	}
	return out, nil
}

func runOne(repoRoot string, r matrix.Run) RunResult {
	start := time.Now()
	res := RunResult{
		ID:           r.ID,
		Description:  r.Description,
		SpecRef:      r.SpecRef,
		Envelope:     r.Envelope,
		Direction:    r.Direction,
		ExpectedPass: r.ExpectedPass,
	}
	defer func() {
		res.Duration = time.Since(start).Truncate(time.Millisecond).String()
	}()

	fixturePath := filepath.Join(repoRoot, r.FixturePath)
	initial, err := loadFixture(fixturePath)
	if err != nil {
		res.Error = fmt.Sprintf("load fixture: %v", err)
		return res
	}

	// §9.3 gate: if envelope is plaintext and body contains sensitive content,
	// the spec forbids the combination. Edge-case runs that expect a fail here
	// pass when the guard fires.
	if r.Envelope == shared.EnvelopePlain && shared.ContainsSensitive(initial) {
		c := checks.PlaintextAllowed(initial, r.Envelope)
		res.Checks = append(res.Checks, c)
		// If the fixture is sensitive, this check returns Pass=false. The run
		// is "expected to fail", so the overall run passes when the check
		// correctly rejected.
		res.Pass = !c.Pass == !r.ExpectedPass
		return res
	}

	res.Checks = append(res.Checks, checks.PlaintextAllowed(initial, r.Envelope))

	a := reader_a.NewStore("urn:uuid:reader-a-instance")
	b := reader_b.NewStore("urn:uuid:reader-b-instance")

	var first, second reader
	if r.Direction == "B->A->B" {
		first, second = b, a
	} else {
		first, second = a, b
	}

	res.Checks = append(res.Checks, checks.Integrity(initial, "input"))
	res.Checks = append(res.Checks, checks.NoCrossPublisherID(initial))
	res.Checks = append(res.Checks, checks.DiscoveryReverify(initial))

	hop1, err := hop(initial, first, r.Envelope)
	if err != nil {
		res.Error = fmt.Sprintf("hop1: %v", err)
		res.Pass = !r.ExpectedPass
		return res
	}
	res.Checks = append(res.Checks, checks.Integrity(hop1, "hop1"))
	res.Checks = append(res.Checks, checks.EncryptionEnvelope(hop1, r.Envelope, passphrase))

	hop2, err := hop(hop1, second, r.Envelope)
	if err != nil {
		res.Error = fmt.Sprintf("hop2: %v", err)
		res.Pass = !r.ExpectedPass
		return res
	}
	res.Checks = append(res.Checks, checks.Integrity(hop2, "hop2"))
	res.Checks = append(res.Checks, checks.EncryptionEnvelope(hop2, r.Envelope, passphrase))

	hop3, err := hop(hop2, first, r.Envelope)
	if err != nil {
		res.Error = fmt.Sprintf("hop3: %v", err)
		res.Pass = !r.ExpectedPass
		return res
	}
	res.Checks = append(res.Checks, checks.Integrity(hop3, "hop3-final"))
	res.Checks = append(res.Checks, checks.Pseudonym(initial, hop3))
	res.Checks = append(res.Checks, checks.FieldPreservation(initial, hop3))

	if r.ID == "edge-collision-merge" {
		older := cloneShiftedTime(initial, -24*time.Hour)
		newer := cloneShiftedTime(initial, 24*time.Hour)
		res.Checks = append(res.Checks, checks.Collision(older, newer))
	}
	if r.ID == "edge-checksum-tamper" {
		tampered := *initial
		tampered.Integrity.Checksum.Value = "deadbeef" + tampered.Integrity.Checksum.Value[8:]
		tamperCheck := checks.Integrity(&tampered, "tamper")
		inverted := checks.Result{
			Name:    "checksum-tamper-detected",
			Pass:    !tamperCheck.Pass,
			Message: "tampered checksum detected on import",
			SpecRef: "§7.1",
		}
		res.Checks = append(res.Checks, inverted)
	}

	allPass := true
	for _, c := range res.Checks {
		if !c.Pass {
			allPass = false
			break
		}
	}
	res.Pass = allPass == r.ExpectedPass
	return res
}

func hop(e *shared.Export, r reader, envelope string) (*shared.Export, error) {
	raw, err := json.Marshal(e)
	if err != nil {
		return nil, err
	}
	var transmitted []byte
	switch envelope {
	case shared.EnvelopePlain:
		transmitted = raw
	case shared.EnvelopeAge:
		cipher, err := shared.EncryptAge(raw, passphrase)
		if err != nil {
			return nil, err
		}
		transmitted, err = shared.DecryptAge(cipher, passphrase)
		if err != nil {
			return nil, err
		}
	case shared.EnvelopeJWE:
		cipher, err := shared.EncryptJWE(raw, passphrase)
		if err != nil {
			return nil, err
		}
		transmitted, err = shared.DecryptJWE(cipher, passphrase)
		if err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unknown envelope %s", envelope)
	}
	var parsed shared.Export
	if err := json.Unmarshal(transmitted, &parsed); err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}
	if err := shared.VerifyChecksum(&parsed); err != nil {
		return nil, fmt.Errorf("verify before import: %w", err)
	}
	if err := r.Import(&parsed); err != nil {
		return nil, fmt.Errorf("import: %w", err)
	}
	return r.Export(false)
}

func loadFixture(path string) (*shared.Export, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var e shared.Export
	if err := json.Unmarshal(raw, &e); err != nil {
		return nil, err
	}
	sum, err := shared.ComputeChecksum(&e)
	if err != nil {
		return nil, err
	}
	e.Integrity.Checksum = sum
	return &e, nil
}

func cloneShiftedTime(e *shared.Export, delta time.Duration) *shared.Export {
	raw, _ := json.Marshal(e)
	var clone shared.Export
	_ = json.Unmarshal(raw, &clone)
	for i := range clone.Memberships {
		clone.Memberships[i].UpdatedAt = clone.Memberships[i].UpdatedAt.Add(delta)
	}
	sum, _ := shared.ComputeChecksum(&clone)
	clone.Integrity.Checksum = sum
	return &clone
}
