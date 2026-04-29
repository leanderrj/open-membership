// Command om-test-harness runs the reader-side conformance harness. It serves
// deterministic fixture feeds and mock commerce endpoints so a reader-under-
// test can exercise its full happy-path without depending on a live publisher
// or a Stripe test account.
//
// Usage:
//
//	om-test-harness --addr :8080
//
// A reader's CI typically:
//  1. Boots the harness (via `docker run` or `go run`).
//  2. Points the reader at http://127.0.0.1:8080/fixture/basic-paid/feed.
//  3. Runs its own assertions on what it parsed / displayed / unlocked.
//  4. POSTs a ReaderReport JSON blob to /report summarising those claims.
//
// Step 4 is optional but is how a reader fork earns a listing in the
// conformance registry; see docs/harness-integration.md.
package main

import (
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/open-membership-rss/om-test-suite/harness"
)

func main() {
	addr := flag.String("addr", ":8080", "Address to listen on")
	flag.Parse()

	srv := harness.NewServer(*addr)

	logger := log.New(os.Stdout, "om-harness ", log.LstdFlags|log.Lmicroseconds)
	httpSrv := &http.Server{
		Addr:              *addr,
		Handler:           withLogging(logger, srv.Mux()),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	logger.Printf("listening on %s", *addr)
	if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Fatalf("listen error: %v", err)
	}
}

func withLogging(l *log.Logger, h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &statusRecorder{ResponseWriter: w, status: 200}
		h.ServeHTTP(rw, r)
		l.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, rw.status, time.Since(start))
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}
