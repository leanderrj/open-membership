// Package harness is the reader-side flip of the suite: it serves
// deterministic fixture feeds, discovery documents, and commerce endpoints so
// a reader-under-test can run its own conformance assertions in CI.
package harness

import (
	"embed"
	"io/fs"
	"path"
	"sort"
	"strings"
)

// Embedded fixtures. The fixtures directory is bundled into the binary so
// `go install` and `docker run` both ship with a self-contained dataset;
// no external file mounts required.
//
//go:embed fixtures/*
var fixturesFS embed.FS

// FixtureSet lists what is available for a reader to select via path
// segment (e.g. /fixture/basic-paid/feed).
type FixtureSet struct {
	Name         string
	FeedPath     string
	DiscoveryPath string
}

// ListFixtures returns every fixture directory that contains both feed.xml
// and discovery.json. Readers can GET /fixtures to see what's available.
func ListFixtures() ([]FixtureSet, error) {
	entries, err := fs.ReadDir(fixturesFS, "fixtures")
	if err != nil {
		return nil, err
	}
	var out []FixtureSet
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		feed := path.Join("fixtures", e.Name(), "feed.xml")
		disc := path.Join("fixtures", e.Name(), "discovery.json")
		if _, err := fs.Stat(fixturesFS, feed); err != nil {
			continue
		}
		if _, err := fs.Stat(fixturesFS, disc); err != nil {
			continue
		}
		out = append(out, FixtureSet{
			Name:         e.Name(),
			FeedPath:     feed,
			DiscoveryPath: disc,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

// ReadFixture returns the bytes at fixtures/<name>/<file>. Used by handlers.
func ReadFixture(name, file string) ([]byte, error) {
	// Guard against directory traversal: only allow bare segments.
	if strings.ContainsAny(name, "/\\.") || strings.ContainsAny(file, "/\\") {
		return nil, fs.ErrNotExist
	}
	return fs.ReadFile(fixturesFS, path.Join("fixtures", name, file))
}
