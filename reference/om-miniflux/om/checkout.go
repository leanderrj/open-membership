// Package om; checkout.go
//
// Drives the in-reader checkout flow defined in SPEC.md §Level 5. The reader
// POSTs an offer selection to the publisher's /api/om/checkout endpoint,
// receives a redirect URL (typically a Stripe Checkout Session URL), and
// hands that URL to the user's browser. The browser-open step is injected
// through a function pointer so unit tests can assert it without spawning a
// real browser process.
package om

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// BrowserOpener is the function the fork calls to open a URL in the user's
// system browser after a checkout session is created. Miniflux's web UI
// satisfies this by returning the URL to the browser tab that initiated the
// flow and letting JavaScript window.open it; the signature is kept server-
// side-neutral so a future native reader can wire it to `open`/`xdg-open`.
type BrowserOpener func(ctx context.Context, sessionURL string) error

// NoopOpener is the default BrowserOpener; it discards the URL. Production
// callers replace this with a UI-specific opener.
func NoopOpener(ctx context.Context, sessionURL string) error { return nil }

// CheckoutClient performs the checkout POST. The zero value is not usable;
// construct via NewCheckoutClient.
type CheckoutClient struct {
	HTTP        *http.Client
	Opener      BrowserOpener
	UserAgent   string
}

// NewCheckoutClient returns a CheckoutClient backed by the given HTTP client
// and browser opener. Passing nil for either uses a sane default.
func NewCheckoutClient(h *http.Client, opener BrowserOpener) *CheckoutClient {
	if h == nil {
		h = http.DefaultClient
	}
	if opener == nil {
		opener = NoopOpener
	}
	return &CheckoutClient{HTTP: h, Opener: opener, UserAgent: "miniflux-om/0.1"}
}

// Start creates a checkout session against the publisher's endpoint and
// returns the typed response. The caller is responsible for calling
// c.Opener(ctx, resp.RedirectTo) once the session is in hand and for
// subsequent entitlement polling via the entitlements package.
//
// endpoint is the absolute URL of the publisher's /api/om/checkout as
// declared in the discovery document.
//
// SPEC.md §Level 5 (Commerce).
func (c *CheckoutClient) Start(ctx context.Context, endpoint string, body CheckoutRequest) (*CheckoutResponse, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("om: marshal checkout request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("om: build checkout request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if c.UserAgent != "" {
		req.Header.Set("User-Agent", c.UserAgent)
	}

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, fmt.Errorf("om: checkout http: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("om: read checkout response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("om: checkout %d: %s", resp.StatusCode, bytes.TrimSpace(raw))
	}

	var out CheckoutResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("om: decode checkout response: %w", err)
	}
	if out.RedirectTo == "" {
		return nil, fmt.Errorf("om: checkout response missing redirect_to")
	}
	return &out, nil
}

// StartAndOpen combines Start with a call to the configured BrowserOpener.
// It is the convenience entry point used by Miniflux's /om/subscribe handler.
func (c *CheckoutClient) StartAndOpen(ctx context.Context, endpoint string, body CheckoutRequest) (*CheckoutResponse, error) {
	resp, err := c.Start(ctx, endpoint, body)
	if err != nil {
		return nil, err
	}
	if err := c.Opener(ctx, resp.RedirectTo); err != nil {
		return resp, fmt.Errorf("om: open browser: %w", err)
	}
	return resp, nil
}
