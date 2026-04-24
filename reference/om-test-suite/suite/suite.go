// Package suite registers and runs publisher-side conformance checks. A
// category file (parse.go, discovery.go, ...) declares its tests via Register;
// main invokes Run which fans out to every registered category in level order.
package suite

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"sort"
	"time"

	"github.com/open-membership-rss/om-test-suite/report"
)

// Test is one registered conformance check. The convention: Run emits
// TestResults via the provided callback and does not panic. Transport-level
// failures surface as StatusError; spec-level failures surface as StatusFail.
type Test struct {
	Category string
	Name     string
	Level    report.Level
	SpecRef  string
	Run      func(ctx context.Context, env *Env, emit func(report.TestResult))
}

// Env is the shared environment passed to every test. Carries the feed URL,
// the discovery URL, and utilities for making HTTP requests whose transcripts
// become the artifact of any failing test.
type Env struct {
	FeedURL      string
	DiscoveryURL string
	HTTPClient   *http.Client
	UserAgent    string
	// CachedFeedBody and CachedDiscoveryBody are populated lazily by the parse
	// tests and reused by discovery/auth tests so the suite only fetches each
	// resource once.
	CachedFeedBody      []byte
	CachedDiscoveryBody []byte
}

var registry []Test

// Register appends a test to the global registry. Called from init() of every
// category file. Order within a level is alphabetical by name.
func Register(t Test) {
	registry = append(registry, t)
}

// Registered returns a copy of the registry for inspection or listing.
func Registered() []Test {
	out := make([]Test, len(registry))
	copy(out, registry)
	return out
}

// Run executes every registered test against the given Env and returns a
// finalised Report. Tests run in Level → Category → Name order; the parse
// category's feed_fetchable runs first at Level 1 so later tests can reuse
// the cached feed body rather than re-fetching it.
func Run(ctx context.Context, env *Env, subject report.Subject, suiteVersion, specVersion string) *report.Report {
	r := report.NewReport(suiteVersion, specVersion, subject)

	ordered := make([]Test, len(registry))
	copy(ordered, registry)
	sort.SliceStable(ordered, func(i, j int) bool {
		if ordered[i].Level != ordered[j].Level {
			return ordered[i].Level < ordered[j].Level
		}
		// Within a level, run parse before discovery before the rest so the
		// feed body is in the cache before discovery tests reference it.
		if catRank(ordered[i].Category) != catRank(ordered[j].Category) {
			return catRank(ordered[i].Category) < catRank(ordered[j].Category)
		}
		// Within a category, run "_fetchable" / "_resolves" first so cache
		// population precedes cache consumption.
		if fetchPriority(ordered[i].Name) != fetchPriority(ordered[j].Name) {
			return fetchPriority(ordered[i].Name) < fetchPriority(ordered[j].Name)
		}
		return ordered[i].Name < ordered[j].Name
	})

	for _, t := range ordered {
		start := time.Now()
		func() {
			// Isolate each test's panics so one buggy check never halts the run.
			defer func() {
				if rec := recover(); rec != nil {
					r.Add(report.TestResult{
						Category: t.Category,
						Name:     t.Name,
						Level:    t.Level,
						SpecRef:  t.SpecRef,
						Status:   report.StatusError,
						Message:  fmt.Sprintf("test panicked: %v", rec),
						Duration: time.Since(start).String(),
					})
				}
			}()
			t.Run(ctx, env, func(res report.TestResult) {
				if res.Category == "" {
					res.Category = t.Category
				}
				if res.Name == "" {
					res.Name = t.Name
				}
				if res.Level == report.LevelUnspecified {
					res.Level = t.Level
				}
				if res.SpecRef == "" {
					res.SpecRef = t.SpecRef
				}
				if res.Duration == "" {
					res.Duration = time.Since(start).String()
				}
				r.Add(res)
			})
		}()
	}
	r.Finalize()
	return r
}

// catRank orders categories so the ones that populate caches run first.
func catRank(cat string) int {
	switch cat {
	case "parse":
		return 0
	case "discovery":
		return 1
	case "auth":
		return 2
	case "checkout":
		return 3
	case "entitlement":
		return 4
	case "revocation":
		return 5
	}
	return 100
}

// fetchPriority ranks the feed/discovery "fetch" tests ahead of their peers
// in the same category, so cache population precedes cache consumption.
func fetchPriority(name string) int {
	switch name {
	case "feed_fetchable", "discovery_resolves":
		return 0
	}
	return 1
}

// FetchWithTranscript makes a GET request and returns the body plus a
// human-readable transcript suitable as TestResult.Artifact. Errors are
// surfaced as a transcript too, never as Go errors — we want the failure to
// appear in the report, not abort the run.
func (e *Env) FetchWithTranscript(ctx context.Context, url string) (body []byte, status int, transcript string, err error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, 0, fmt.Sprintf("request construction failed: %v", err), err
	}
	req.Header.Set("User-Agent", e.UserAgent)
	req.Header.Set("Accept", "application/rss+xml, application/xml, application/json;q=0.9, */*;q=0.1")

	resp, err := e.HTTPClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Sprintf("GET %s\n\nerror: %v", url, err), err
	}
	defer resp.Body.Close()

	body, err = io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return nil, resp.StatusCode, fmt.Sprintf("GET %s -> %d\n\nbody read error: %v", url, resp.StatusCode, err), err
	}

	transcript = fmt.Sprintf("GET %s\n-> %d %s\nContent-Type: %s\nContent-Length: %d",
		url, resp.StatusCode, http.StatusText(resp.StatusCode),
		resp.Header.Get("Content-Type"), len(body))
	return body, resp.StatusCode, transcript, nil
}
