// Package om; discovery.go
//
// Fetches and parses the .well-known/open-membership JSON document. The
// reader consults this document to resolve endpoint URLs (checkout,
// entitlements, token, portal) that are not carried in the feed itself,
// and to surface publisher-level policy (revocation, privacy) to the user
// at checkout time. SPEC.md §9 "Updated Discovery Document".
package om

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// FetchDiscovery loads the document at the given URL. The URL may be either
// the full .well-known URL (as emitted by <om:discovery>) or a provider
// base URL in which case the /.well-known/open-membership suffix is added.
func FetchDiscovery(ctx context.Context, client *http.Client, ref string) (*Discovery, error) {
	if client == nil {
		client = http.DefaultClient
	}
	u, err := normalizeDiscoveryURL(ref)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, fmt.Errorf("om: build discovery request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("om: discovery http: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("om: discovery %d", resp.StatusCode)
	}
	return ParseDiscovery(resp.Body)
}

// ParseDiscovery decodes a discovery document from an io.Reader. Unknown
// fields are tolerated so that 0.4.x errata additions do not break Level 1
// readers. Provider is the only required field; others default to zero.
func ParseDiscovery(r io.Reader) (*Discovery, error) {
	raw, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("om: read discovery: %w", err)
	}
	var d Discovery
	if err := json.Unmarshal(raw, &d); err != nil {
		return nil, fmt.Errorf("om: decode discovery: %w", err)
	}
	if d.Provider == "" {
		return nil, fmt.Errorf("om: discovery missing provider")
	}
	return &d, nil
}

func normalizeDiscoveryURL(ref string) (string, error) {
	if ref == "" {
		return "", fmt.Errorf("om: empty discovery reference")
	}
	u, err := url.Parse(ref)
	if err != nil {
		return "", fmt.Errorf("om: parse discovery url: %w", err)
	}
	if u.Scheme == "" || u.Host == "" {
		return "", fmt.Errorf("om: discovery url missing scheme/host: %s", ref)
	}
	if strings.HasSuffix(u.Path, "/.well-known/open-membership") {
		return u.String(), nil
	}
	if u.Path == "" || u.Path == "/" {
		u.Path = "/.well-known/open-membership"
		return u.String(), nil
	}
	return u.String(), nil
}

// DiscoveryFromReader is a convenience alias for ParseDiscovery kept for
// symmetry with Parse / ParseDiscovery in doc-comment references.
func DiscoveryFromReader(r io.Reader) (*Discovery, error) { return ParseDiscovery(r) }
