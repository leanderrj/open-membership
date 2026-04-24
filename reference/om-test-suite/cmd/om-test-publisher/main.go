// Command om-test-publisher runs the conformance suite against a live
// publisher's feed + discovery document and emits a pass/fail report.
//
// Usage:
//
//	om-test-publisher \
//	    --feed https://pub.example/feed/om/TOKEN \
//	    --discovery https://pub.example/.well-known/open-membership \
//	    [--html-out report.html] \
//	    [--timeout 30s]
//
// The JSON report is written to stdout so the tool composes with shell
// pipelines (`om-test-publisher ... | jq '.summary'`). Non-zero exit is
// reserved for transport-level errors when the report could not be produced.
// A publisher that fails conformance still exits 0 — the failure is in the
// report, not in the tool's own result.
package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/open-membership-rss/om-test-suite/report"
	"github.com/open-membership-rss/om-test-suite/suite"
)

const (
	suiteVersion = "0.1.0"
	specVersion  = "0.4"
)

func main() {
	var (
		feed      = flag.String("feed", "", "Feed URL to test (required)")
		discovery = flag.String("discovery", "", "Discovery document URL to test")
		htmlOut   = flag.String("html-out", "", "Optional path to also write an HTML report")
		timeout   = flag.Duration("timeout", 30*time.Second, "Per-request HTTP timeout")
		listTests = flag.Bool("list", false, "List registered tests and exit")
	)
	flag.Parse()

	if *listTests {
		for _, t := range suite.Registered() {
			fmt.Printf("Level %d  %-12s %s  (%s)\n", t.Level, t.Category, t.Name, t.SpecRef)
		}
		return
	}

	if *feed == "" {
		fmt.Fprintln(os.Stderr, "error: --feed is required")
		flag.Usage()
		os.Exit(2)
	}

	env := &suite.Env{
		FeedURL:      *feed,
		DiscoveryURL: *discovery,
		HTTPClient: &http.Client{
			Timeout: *timeout,
		},
		UserAgent: "om-test-suite/" + suiteVersion + " (+https://open-membership-rss.org)",
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	rep := suite.Run(ctx, env, report.Subject{
		Kind:         "publisher",
		FeedURL:      *feed,
		DiscoveryURL: *discovery,
	}, suiteVersion, specVersion)

	if err := rep.WriteJSON(os.Stdout); err != nil {
		fmt.Fprintf(os.Stderr, "error writing JSON: %v\n", err)
		os.Exit(1)
	}

	if *htmlOut != "" {
		f, err := os.Create(*htmlOut)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error creating html-out: %v\n", err)
			os.Exit(1)
		}
		defer f.Close()
		if err := rep.WriteHTML(f); err != nil {
			fmt.Fprintf(os.Stderr, "error writing HTML: %v\n", err)
			os.Exit(1)
		}
	}
}
