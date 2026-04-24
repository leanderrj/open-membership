package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/open-membership-rss/om-portability-roundtrip/fixtures/reader_a"
	"github.com/open-membership-rss/om-portability-roundtrip/fixtures/reader_b"
	"github.com/open-membership-rss/om-portability-roundtrip/matrix"
)

const harnessVersion = "0.1.0"
const specVersion = "1.0-draft-2026-04-24"

func main() {
	matrixMode := flag.String("matrix", "full", "which runs to execute: full | core | edge | <run-id-prefix>")
	repoRoot := flag.String("root", defaultRoot(), "path to om-portability-roundtrip repo root")
	jsonOut := flag.String("json", "", "write report JSON to this path (default: reports/run-<timestamp>.json)")
	htmlOut := flag.String("html", "", "write report HTML to this path (default: reports/run-<timestamp>.html)")
	quiet := flag.Bool("quiet", false, "suppress per-run stdout summary")
	flag.Parse()

	runs := selectRuns(*matrixMode)
	if len(runs) == 0 {
		fmt.Fprintln(os.Stderr, "no runs selected")
		os.Exit(2)
	}

	started := time.Now().UTC()
	results, err := runMatrix(*repoRoot, runs)
	if err != nil {
		fmt.Fprintf(os.Stderr, "matrix error: %v\n", err)
		os.Exit(2)
	}

	rep := &Report{
		HarnessVersion: harnessVersion,
		SpecVersion:    specVersion,
		StartedAt:      started,
		FinishedAt:     time.Now().UTC(),
		ReaderA: ReaderInfo{
			Name:    reader_a.ReaderName,
			Version: reader_a.ReaderVersion,
			Kind:    "Miniflux-shape (url-token preference)",
			Notes:   "fixture stub; replace per contract.md for production readers",
		},
		ReaderB: ReaderInfo{
			Name:    reader_b.ReaderName,
			Version: reader_b.ReaderVersion,
			Kind:    "NetNewsWire-shape (bearer/VC preference)",
			Notes:   "fixture stub; replace per contract.md for production readers",
		},
		Runs:    results,
		Summary: summarize(results),
	}

	stamp := started.Format("20060102-150405")
	if *jsonOut == "" {
		*jsonOut = filepath.Join(*repoRoot, "reports", "run-"+stamp+".json")
	}
	if *htmlOut == "" {
		*htmlOut = filepath.Join(*repoRoot, "reports", "run-"+stamp+".html")
	}
	if err := os.MkdirAll(filepath.Dir(*jsonOut), 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "mkdir reports: %v\n", err)
		os.Exit(2)
	}
	if err := writeJSONFile(rep, *jsonOut); err != nil {
		fmt.Fprintf(os.Stderr, "write json: %v\n", err)
		os.Exit(2)
	}
	if err := writeHTMLFile(rep, *htmlOut); err != nil {
		fmt.Fprintf(os.Stderr, "write html: %v\n", err)
		os.Exit(2)
	}

	if !*quiet {
		printSummary(rep, os.Stdout)
		fmt.Printf("\njson: %s\nhtml: %s\n", *jsonOut, *htmlOut)
	}

	if rep.Summary.Fail > 0 {
		os.Exit(1)
	}
}

func selectRuns(mode string) []matrix.Run {
	all := matrix.Full()
	switch mode {
	case "full":
		return all
	case "core":
		out := []matrix.Run{}
		for _, r := range all {
			if !r.EdgeCase {
				out = append(out, r)
			}
		}
		return out
	case "edge":
		out := []matrix.Run{}
		for _, r := range all {
			if r.EdgeCase {
				out = append(out, r)
			}
		}
		return out
	default:
		out := []matrix.Run{}
		for _, r := range all {
			if strings.HasPrefix(r.ID, mode) {
				out = append(out, r)
			}
		}
		return out
	}
}

func defaultRoot() string {
	if root := os.Getenv("OM_ROUNDTRIP_ROOT"); root != "" {
		return root
	}
	wd, err := os.Getwd()
	if err != nil {
		return "."
	}
	return wd
}
