package harness

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Server wraps the mux so tests (and the main binary) can share construction.
type Server struct {
	Addr    string
	reports []ReaderReport
	mu      sync.Mutex
}

// ReaderReport is the shape a reader-under-test POSTs to /report. It carries
// the reader's own claim of what it parsed, plus a per-test log of what the
// reader believes it observed. The harness validates the claim against the
// fixture it was served and replies with the confirmed/refuted result.
type ReaderReport struct {
	Reader      string                 `json:"reader"`
	Version     string                 `json:"version"`
	Fixture     string                 `json:"fixture"`
	Profile     string                 `json:"profile"`
	Claims      []ReaderClaim          `json:"claims"`
	Metadata    map[string]any         `json:"metadata,omitempty"`
	SubmittedAt time.Time              `json:"submitted_at"`
}

type ReaderClaim struct {
	Level    int    `json:"level"`
	Category string `json:"category"`
	Name     string `json:"name"`
	Passed   bool   `json:"passed"`
	Detail   string `json:"detail,omitempty"`
}

// NewServer builds a Server ready to be passed to http.ListenAndServe.
func NewServer(addr string) *Server {
	return &Server{Addr: addr}
}

// Mux returns an http.Handler wired with all harness routes. Exposed so a
// reader's own Go integration tests can mount the harness in-process.
func (s *Server) Mux() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/", s.handleIndex)
	mux.HandleFunc("/fixtures", s.handleListFixtures)
	mux.HandleFunc("/fixture/", s.handleFixture)
	mux.HandleFunc("/report", s.handleReport)
	mux.HandleFunc("/reports", s.handleListReports)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	return mux
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	fmt.Fprintln(w, "om-test-suite reader harness")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Endpoints:")
	fmt.Fprintln(w, "  GET  /fixtures                             ; list available fixtures")
	fmt.Fprintln(w, "  GET  /fixture/:name/feed                   ; fixture RSS feed")
	fmt.Fprintln(w, "  GET  /fixture/:name/.well-known/open-membership; fixture discovery")
	fmt.Fprintln(w, "  POST /fixture/:name/api/checkout           ; mock checkout session")
	fmt.Fprintln(w, "  GET  /fixture/:name/api/entitlements       ; mock entitlements")
	fmt.Fprintln(w, "  POST /report                               ; reader posts conformance claim")
	fmt.Fprintln(w, "  GET  /reports                              ; recent reader reports (debug)")
	fmt.Fprintln(w, "  GET  /healthz                              ; liveness")
}

func (s *Server) handleListFixtures(w http.ResponseWriter, r *http.Request) {
	list, err := ListFixtures()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

// handleFixture dispatches /fixture/<name>/<rest...> to the right per-fixture
// resource. Split out here so the routing stays a single net/http ServeMux -
// no third-party router dependency.
func (s *Server) handleFixture(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/fixture/")
	slash := strings.Index(path, "/")
	if slash < 0 {
		http.NotFound(w, r)
		return
	}
	name := path[:slash]
	rest := path[slash:]

	switch rest {
	case "/feed":
		s.serveFixtureFile(w, r, name, "feed.xml", "application/rss+xml; charset=utf-8")
	case "/.well-known/open-membership":
		s.serveFixtureFile(w, r, name, "discovery.json", "application/json; charset=utf-8")
	case "/api/checkout":
		s.handleMockCheckout(w, r, name)
	case "/api/entitlements":
		s.handleMockEntitlements(w, r, name)
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) serveFixtureFile(w http.ResponseWriter, r *http.Request, name, file, contentType string) {
	body, err := ReadFixture(name, file)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "no-store")
	w.Write(body)
}

// handleMockCheckout returns a deterministic Stripe-shaped session URL. The
// shape matches what real Stripe returns from checkout.sessions.create so a
// reader that consumes this can exercise the post-checkout redirect path
// without a live Stripe account.
func (s *Server) handleMockCheckout(w http.ResponseWriter, r *http.Request, name string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body map[string]any
	if err := json.NewDecoder(io.LimitReader(r.Body, 64<<10)).Decode(&body); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	offerID, _ := body["offer_id"].(string)
	if offerID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "offer_id is required",
		})
		return
	}
	// Deterministic: same offer_id → same session id. Readers can pin this.
	sessionID := "cs_test_" + name + "_" + offerID
	writeJSON(w, http.StatusOK, map[string]any{
		"session_id":  sessionID,
		"session_url": "https://mock-checkout.invalid/pay/" + sessionID,
		"psp":         "stripe",
		"fixture":     name,
	})
}

func (s *Server) handleMockEntitlements(w http.ResponseWriter, r *http.Request, name string) {
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "session_id is required",
		})
		return
	}
	// Deterministic entitlement: session ids of the form cs_test_<fixture>_<offer>
	// yield a paid tier; anything else yields "pending". No PSP roundtrip; the
	// harness is not a Stripe implementation.
	status := "pending"
	tier := ""
	if strings.HasPrefix(sessionID, "cs_test_"+name+"_") {
		status = "active"
		tier = "paid"
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":      status,
		"tier_id":     tier,
		"features":    []string{},
		"expires_at":  time.Now().UTC().Add(30 * 24 * time.Hour).Format(time.RFC3339),
		"fixture":     name,
	})
}

func (s *Server) handleReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var rep ReaderReport
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&rep); err != nil {
		http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}
	rep.SubmittedAt = time.Now().UTC()
	validation := s.validateReport(rep)

	s.mu.Lock()
	s.reports = append(s.reports, rep)
	if len(s.reports) > 200 {
		s.reports = s.reports[len(s.reports)-200:]
	}
	s.mu.Unlock()

	writeJSON(w, http.StatusOK, map[string]any{
		"accepted":   true,
		"validation": validation,
		"submitted":  rep.SubmittedAt,
	})
}

func (s *Server) handleListReports(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	writeJSON(w, http.StatusOK, s.reports)
}

// validateReport cross-checks each claim against what the harness actually
// served. For v0 the check is structural; the reader claims are recorded
// verbatim and tagged with "harness_agrees": true/false per claim.
//
// TODO(harness): fill in per-claim validators as Level 2 and Level 5 tests
// are fleshed out in suite/. The shape is already stable.
func (s *Server) validateReport(rep ReaderReport) map[string]any {
	found := false
	fixtures, _ := ListFixtures()
	for _, f := range fixtures {
		if f.Name == rep.Fixture {
			found = true
			break
		}
	}
	return map[string]any{
		"fixture_known": found,
		"claim_count":   len(rep.Claims),
		// TODO(harness): per-claim verdicts. For now we accept the reader's
		// self-assessment and record it; certification (GOVERNANCE.md §"Self-
		// certification") depends on these verdicts once implemented.
		"verdicts": nil,
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(v)
}
