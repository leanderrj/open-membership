// Package om; auth.go
//
// Auth-state abstraction for the Indie Reader profile. Two methods are
// implemented: url-token (SPEC.md §0.1 Foundational, Level 2) which appends
// a token to the feed URL, and bearer (Level 5 after checkout) which attaches
// an Authorization: Bearer header. The module exposes an AuthStore interface
// so that the fork's Miniflux-specific persistence layer (PostgreSQL,
// keyed by (feed_id, user_id) per reader-ARCHITECTURE.md §"Per-user vs
// per-instance auth") can be plugged in without changing the om package.
package om

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// FeedAuth is the per-(feed, user) auth record persisted in Miniflux.
type FeedAuth struct {
	FeedID        int64
	UserID        int64
	Provider      string
	AuthMethod    AuthMethod
	URLToken      string
	BearerToken   string
	BearerExpires time.Time
	RefreshToken  string
	UpdatedAt     time.Time
}

// Valid reports whether the bearer token is present and not yet expired.
// A zero BearerExpires is treated as "not expired" because some publishers
// issue non-expiring tokens in v0.
func (a *FeedAuth) Valid() bool {
	if a == nil || a.BearerToken == "" {
		return false
	}
	if a.BearerExpires.IsZero() {
		return true
	}
	return time.Now().Before(a.BearerExpires)
}

// AuthStore persists FeedAuth rows. The fork's storage package satisfies
// this interface with its PostgreSQL-backed implementation.
type AuthStore interface {
	Get(feedID, userID int64) (*FeedAuth, error)
	Put(a *FeedAuth) error
	Delete(feedID, userID int64) error
}

// ApplyRequest mutates an outbound feed-fetch request to carry the configured
// auth. SPEC.md §Foundational 0.1: url-token is a URL query parameter; bearer
// is an Authorization header. ApplyRequest is a no-op when auth is nil so
// that non-om feeds and first-fetch previews pass through unchanged.
func ApplyRequest(req *http.Request, auth *FeedAuth) error {
	if auth == nil {
		return nil
	}
	switch auth.AuthMethod {
	case AuthURLToken:
		if auth.URLToken == "" {
			return nil
		}
		return applyURLToken(req, auth.URLToken)
	case AuthBearer:
		if !auth.Valid() {
			return fmt.Errorf("om: bearer token missing or expired")
		}
		req.Header.Set("Authorization", "Bearer "+auth.BearerToken)
		return nil
	case AuthHTTPBasic, AuthDPoP, AuthVCPresentation:
		return fmt.Errorf("om: auth method %q not supported by Indie Reader profile", auth.AuthMethod)
	}
	return nil
}

// applyURLToken appends or replaces a token query parameter on the request
// URL. Publishers vary in the parameter name they accept; the reader uses
// "token" by default and follows the URL the publisher emits verbatim if
// the feed URL already contains a token parameter.
func applyURLToken(req *http.Request, token string) error {
	if req.URL == nil {
		return fmt.Errorf("om: request URL is nil")
	}
	q := req.URL.Query()
	if strings.TrimSpace(token) == "" {
		return nil
	}
	q.Set("token", token)
	req.URL.RawQuery = q.Encode()
	return nil
}

// BuildTokenizedURL returns a new URL with the given token applied as a
// query parameter. Used when persisting a feed URL for the first time after
// a checkout completes.
func BuildTokenizedURL(feedURL, token string) (string, error) {
	u, err := url.Parse(feedURL)
	if err != nil {
		return "", fmt.Errorf("om: parse feed url: %w", err)
	}
	q := u.Query()
	q.Set("token", token)
	u.RawQuery = q.Encode()
	return u.String(), nil
}

// IsUnauthorized reports whether an HTTP response should trigger a
// token-refresh path. 401 and 403 both qualify because publishers split
// their enforcement across both status codes in practice.
func IsUnauthorized(resp *http.Response) bool {
	if resp == nil {
		return false
	}
	return resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden
}
