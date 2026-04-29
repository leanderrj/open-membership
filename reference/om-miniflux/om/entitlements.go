// Package om; entitlements.go
//
// Polls the publisher's /api/om/entitlements endpoint after a checkout
// session is created and writes the resulting bearer token back into the
// AuthStore. Two scenarios from plans/PHASE-1-2.md §2.3 are in scope: Scenario
// 1 ("Subscribe") ends with Active=true and a bearer stored; Scenario 3
// ("Cancel") ends with Active=false, preserving grace window semantics that
// are enforced server-side via <om:revocation>.
package om

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// EntitlementClient is a thin wrapper around an http.Client configured for
// the /api/om/entitlements and /api/om/token endpoints.
type EntitlementClient struct {
	HTTP      *http.Client
	UserAgent string
}

// NewEntitlementClient returns a client with sensible defaults.
func NewEntitlementClient(h *http.Client) *EntitlementClient {
	if h == nil {
		h = http.DefaultClient
	}
	return &EntitlementClient{HTTP: h, UserAgent: "miniflux-om/0.1"}
}

// Status fetches entitlement state keyed by a checkout session ID. Returned
// Active=false indicates the session has not yet completed (or the user
// cancelled); callers poll until Active=true or a timeout.
//
// SPEC.md §Level 5; "Entitlement polling and token refresh".
func (c *EntitlementClient) Status(ctx context.Context, endpoint, sessionID string) (*Entitlement, error) {
	url := endpoint + "?session_id=" + sessionID
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("om: build entitlements request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	if c.UserAgent != "" {
		req.Header.Set("User-Agent", c.UserAgent)
	}

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, fmt.Errorf("om: entitlements http: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("om: read entitlements response: %w", err)
	}
	if resp.StatusCode == http.StatusNotFound {
		return &Entitlement{Active: false}, nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("om: entitlements %d: %s", resp.StatusCode, raw)
	}

	var out Entitlement
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("om: decode entitlements: %w", err)
	}
	return &out, nil
}

// ExchangeToken performs the /api/om/token exchange. The publisher returns a
// freshly-signed JWT bearer token, optionally with a refresh token and
// expires_in. The reader persists the returned values into FeedAuth.
func (c *EntitlementClient) ExchangeToken(ctx context.Context, endpoint, sessionID string) (*Entitlement, error) {
	body := map[string]string{"session_id": sessionID}
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("om: marshal token request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytesReader(raw))
	if err != nil {
		return nil, fmt.Errorf("om: build token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if c.UserAgent != "" {
		req.Header.Set("User-Agent", c.UserAgent)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, fmt.Errorf("om: token http: %w", err)
	}
	defer resp.Body.Close()
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("om: read token response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("om: token %d: %s", resp.StatusCode, bodyBytes)
	}
	var out Entitlement
	if err := json.Unmarshal(bodyBytes, &out); err != nil {
		return nil, fmt.Errorf("om: decode token response: %w", err)
	}
	return &out, nil
}

// Poll drives Status on a fixed interval until Active=true, the context is
// cancelled, or max elapsed time is reached. Returns the final state
// regardless; callers inspect Active to distinguish success from timeout.
//
// The polling cadence matches plans/PHASE-1-2.md §2.5 D3: 3s for the first
// minute, 10s thereafter, up to a total max.
func (c *EntitlementClient) Poll(ctx context.Context, endpoint, sessionID string, max time.Duration) (*Entitlement, error) {
	deadline := time.Now().Add(max)
	interval := 3 * time.Second
	fastUntil := time.Now().Add(60 * time.Second)

	for {
		if time.Now().After(deadline) {
			return &Entitlement{Active: false}, nil
		}
		st, err := c.Status(ctx, endpoint, sessionID)
		if err == nil && st.Active {
			return st, nil
		}
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		if time.Now().After(fastUntil) {
			interval = 10 * time.Second
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(interval):
		}
	}
}

// ApplyToAuth updates a FeedAuth with a successful Entitlement result, ready
// to be persisted via AuthStore.Put.
func ApplyToAuth(auth *FeedAuth, ent *Entitlement) {
	if auth == nil || ent == nil {
		return
	}
	auth.AuthMethod = AuthBearer
	if ent.Token != "" {
		auth.BearerToken = ent.Token
	}
	if ent.Refresh != "" {
		auth.RefreshToken = ent.Refresh
	}
	if ent.ExpiresIn > 0 {
		auth.BearerExpires = time.Now().Add(time.Duration(ent.ExpiresIn) * time.Second)
	}
	auth.UpdatedAt = time.Now()
}

// Granted reports whether the given channel auth + item membership combine
// to grant access to an item for the current entitlement set. Used by the
// rendering path to decide whether to show preview content or the full item.
//
// Logic follows SPEC.md §Foundational 0.1 and §Commercial 0.3:
//   - AccessOpen items are always granted.
//   - AccessPreview items are granted when the entitlement includes any of
//     the item's listed tiers (or any tier, if the item lists none and the
//     entitlement is active).
//   - AccessLocked and AccessMembersOnly require an active entitlement and
//     at least one matching tier when item.Tiers is non-empty.
func Granted(item ItemMembership, ent *Entitlement) bool {
	if item.Access == "" || item.Access == AccessOpen {
		return true
	}
	if ent == nil || !ent.Active {
		return false
	}
	if len(item.Tiers) == 0 {
		return true
	}
	for _, t := range item.Tiers {
		if t == ent.TierID {
			return true
		}
		for _, f := range ent.Features {
			if f == t {
				return true
			}
		}
	}
	return false
}

// bytesReader wraps a []byte as an io.Reader using a pointer receiver so the
// read offset advances correctly across calls.
func bytesReader(b []byte) io.Reader {
	return &byteSliceReader{b: b}
}

type byteSliceReader struct {
	b []byte
	i int
}

func (r *byteSliceReader) Read(p []byte) (int, error) {
	if r.i >= len(r.b) {
		return 0, io.EOF
	}
	n := copy(p, r.b[r.i:])
	r.i += n
	return n, nil
}
