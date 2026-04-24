package suite

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/open-membership-rss/om-test-suite/report"
)

// TestRunAgainstFixture boots the fixture files as a local HTTP server and
// runs the full registry against them. It asserts that Level 1 parse +
// discovery tests actually pass on a known-good fixture, which is the whole
// point of shipping fixtures with the suite: any drift between fixture and
// test is a real bug in one of them.
func TestRunAgainstFixture(t *testing.T) {
	repoRoot := findTestdata(t)

	mux := http.NewServeMux()
	mux.HandleFunc("/feed.xml", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		http.ServeFile(w, r, filepath.Join(repoRoot, "testdata", "basic-paid", "feed.xml"))
	})
	mux.HandleFunc("/.well-known/open-membership", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		http.ServeFile(w, r, filepath.Join(repoRoot, "testdata", "basic-paid", "discovery.json"))
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	env := &Env{
		FeedURL:      srv.URL + "/feed.xml",
		DiscoveryURL: srv.URL + "/.well-known/open-membership",
		HTTPClient:   srv.Client(),
		UserAgent:    "om-test-suite-test/0",
	}

	rep := Run(context.Background(), env, report.Subject{Kind: "test"}, "0.1.0-test", "0.4")

	level1 := rep.Summary.Levels[report.Level1]
	if level1.Fail > 0 || level1.Error > 0 {
		t.Errorf("Level 1 should pass on basic-paid fixture: pass=%d fail=%d warn=%d skip=%d error=%d",
			level1.Pass, level1.Fail, level1.Warn, level1.Skip, level1.Error)
		for _, r := range rep.Results {
			if r.Level == report.Level1 && (r.Status == report.StatusFail || r.Status == report.StatusError) {
				t.Logf("  %s/%s: %s — %s", r.Category, r.Name, r.Status, r.Message)
			}
		}
	}

	if !rep.Summary.Levels[report.Level1].Passed {
		t.Error("Level 1 summary should report Passed=true")
	}

	// Level 2 tests are Skip stubs; none should be Pass/Fail yet.
	for _, r := range rep.Results {
		if r.Level == report.Level2 && r.Status != report.StatusSkip {
			t.Errorf("Level 2 test %s/%s should still be Skip stub (got %s)",
				r.Category, r.Name, r.Status)
		}
	}
}

func TestParseFeedRecognisesNamespace(t *testing.T) {
	body, err := os.ReadFile(filepath.Join(findTestdata(t), "testdata", "basic-paid", "feed.xml"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	pf, nss, err := ParseFeed(body)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	found := false
	for _, ns := range nss {
		if ns == Namespace {
			found = true
		}
	}
	if !found {
		t.Errorf("expected %s among declared namespaces, got %v", Namespace, nss)
	}
	if pf.Channel.Provider == "" {
		t.Error("expected <om:provider> to be parsed")
	}
	if len(pf.Channel.Tiers) == 0 {
		t.Error("expected at least one <om:tier>")
	}
}

// findTestdata walks up from the test's working directory until it finds the
// testdata/ directory. Allows the test to be run from any subdirectory.
func findTestdata(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	dir := wd
	for i := 0; i < 5; i++ {
		if _, err := os.Stat(filepath.Join(dir, "testdata", "basic-paid", "feed.xml")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	// Fallback: treat wd as the suite dir.
	if strings.HasSuffix(wd, "suite") {
		return filepath.Dir(wd)
	}
	t.Fatalf("could not locate testdata from %s", wd)
	return ""
}
