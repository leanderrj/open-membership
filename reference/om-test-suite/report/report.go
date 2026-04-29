// Package report defines the result taxonomy shared by the publisher suite and
// the reader harness. A Report is the root artifact a test-suite run produces;
// it is JSON-serialised to stdout by the CLI and consumed by the HTML renderer.
package report

import (
	"encoding/json"
	"io"
	"sort"
	"time"
)

// Status is the taxonomy from plans/PHASE-3-4.md §2.3.1 "Pass/fail taxonomy".
// Any test result must be exactly one of these values.
type Status string

const (
	// StatusPass; the test ran and output matched expectation.
	StatusPass Status = "pass"
	// StatusFail; the test ran and output did not match. A human-readable diff
	// SHOULD appear in Artifact so failures can be triaged without re-running.
	StatusFail Status = "fail"
	// StatusWarn; output was correct but a non-normative SHOULD was violated.
	// A Warn never fails overall-level conformance; it surfaces in the report
	// so publishers can tighten voluntarily.
	StatusWarn Status = "warn"
	// StatusSkip; the test does not apply to this subject (e.g. Level 5 tests
	// on a feed without <om:offer>). Skips do not count against conformance.
	StatusSkip Status = "skip"
	// StatusError; the test harness itself could not complete: the endpoint
	// was unreachable, the response was malformed at the transport layer, or
	// an assertion threw. Distinct from Fail because the spec was not probed.
	StatusError Status = "error"
)

// Level is a conformance level from FEATURESET.md §"Conformance levels".
// v0.1 of this suite covers 1, 2, and 5; the Indie Reader profile.
type Level int

const (
	LevelUnspecified Level = 0
	Level1           Level = 1
	Level2           Level = 2
	Level5           Level = 5
)

// TestResult is the unit of output. One per registered test, always present
// (even when Skipped, so the report shape is stable across runs).
type TestResult struct {
	Category string    `json:"category"`
	Name     string    `json:"name"`
	Level    Level     `json:"level"`
	Status   Status    `json:"status"`
	Message  string    `json:"message,omitempty"`
	// SpecRef is the pointer back into SPEC.md / FEATURESET.md that the test
	// is validating. Required so a failure links to the authoritative rule.
	SpecRef string `json:"spec_ref,omitempty"`
	// Artifact is the per-test evidence blob: HTTP transcript, parser log,
	// validation diff. Opaque string so renderers can treat it as preformatted.
	Artifact string    `json:"artifact,omitempty"`
	Duration string    `json:"duration,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// Report aggregates TestResults and computes per-level roll-ups.
type Report struct {
	SuiteVersion string       `json:"suite_version"`
	SpecVersion  string       `json:"spec_version"`
	Subject      Subject      `json:"subject"`
	StartedAt    time.Time    `json:"started_at"`
	FinishedAt   time.Time    `json:"finished_at"`
	Results      []TestResult `json:"results"`
	Summary      Summary      `json:"summary"`
}

// Subject captures what was tested. For the publisher suite this is the feed
// URL + discovery URL; for the reader harness it is the reader's self-report.
type Subject struct {
	Kind        string `json:"kind"`
	FeedURL     string `json:"feed_url,omitempty"`
	DiscoveryURL string `json:"discovery_url,omitempty"`
	ReaderName  string `json:"reader_name,omitempty"`
	ReaderVersion string `json:"reader_version,omitempty"`
}

// Summary is the per-level roll-up rule from PHASE-3-4.md §2.3.1:
// "A publisher passes Level N if every test at every level <= N is Pass or Skip."
type Summary struct {
	Levels map[Level]LevelSummary `json:"levels"`
	Overall LevelSummary          `json:"overall"`
}

type LevelSummary struct {
	Pass  int  `json:"pass"`
	Fail  int  `json:"fail"`
	Warn  int  `json:"warn"`
	Skip  int  `json:"skip"`
	Error int  `json:"error"`
	Passed bool `json:"passed"`
}

// NewReport seeds a report; Finalize populates Summary.
func NewReport(suiteVersion, specVersion string, subject Subject) *Report {
	return &Report{
		SuiteVersion: suiteVersion,
		SpecVersion:  specVersion,
		Subject:      subject,
		StartedAt:    time.Now().UTC(),
		Results:      []TestResult{},
	}
}

// Add appends a result. The renderer guarantees stable ordering in Finalize.
func (r *Report) Add(result TestResult) {
	if result.Timestamp.IsZero() {
		result.Timestamp = time.Now().UTC()
	}
	r.Results = append(r.Results, result)
}

// Finalize sorts results deterministically and computes summaries. Called once
// after all tests have run.
func (r *Report) Finalize() {
	r.FinishedAt = time.Now().UTC()

	sort.SliceStable(r.Results, func(i, j int) bool {
		if r.Results[i].Level != r.Results[j].Level {
			return r.Results[i].Level < r.Results[j].Level
		}
		if r.Results[i].Category != r.Results[j].Category {
			return r.Results[i].Category < r.Results[j].Category
		}
		return r.Results[i].Name < r.Results[j].Name
	})

	r.Summary = Summary{Levels: map[Level]LevelSummary{}}
	for _, res := range r.Results {
		ls := r.Summary.Levels[res.Level]
		switch res.Status {
		case StatusPass:
			ls.Pass++
			r.Summary.Overall.Pass++
		case StatusFail:
			ls.Fail++
			r.Summary.Overall.Fail++
		case StatusWarn:
			ls.Warn++
			r.Summary.Overall.Warn++
		case StatusSkip:
			ls.Skip++
			r.Summary.Overall.Skip++
		case StatusError:
			ls.Error++
			r.Summary.Overall.Error++
		}
		r.Summary.Levels[res.Level] = ls
	}

	for lvl, ls := range r.Summary.Levels {
		ls.Passed = ls.Fail == 0 && ls.Error == 0
		r.Summary.Levels[lvl] = ls
	}
	r.Summary.Overall.Passed = r.Summary.Overall.Fail == 0 && r.Summary.Overall.Error == 0
}

// WriteJSON emits the report as indented JSON for stdout / file output.
func (r *Report) WriteJSON(w io.Writer) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(r)
}
