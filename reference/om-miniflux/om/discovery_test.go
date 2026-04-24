package om

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestParseDiscovery_Basic(t *testing.T) {
	f, err := os.Open("testdata/discovery-basic.json")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()
	d, err := ParseDiscovery(f)
	if err != nil {
		t.Fatalf("ParseDiscovery: %v", err)
	}
	if d.Provider != "https://fieldnotes.example" {
		t.Fatalf("provider: got %q", d.Provider)
	}
	if d.Endpoints.Checkout != "https://fieldnotes.example/api/om/checkout" {
		t.Fatalf("checkout endpoint: got %q", d.Endpoints.Checkout)
	}
	if d.Revocation == nil || d.Revocation.Policy != "prospective-only" {
		t.Fatalf("revocation: %+v", d.Revocation)
	}
}

func TestParseDiscovery_FullLevel5(t *testing.T) {
	f, err := os.Open("testdata/discovery-full.json")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()
	d, err := ParseDiscovery(f)
	if err != nil {
		t.Fatalf("ParseDiscovery: %v", err)
	}
	if len(d.AuthMethods) != 2 {
		t.Fatalf("auth_methods: got %v", d.AuthMethods)
	}
	if len(d.Tiers) != 2 {
		t.Fatalf("tiers: got %d", len(d.Tiers))
	}
	if len(d.Offers) != 2 {
		t.Fatalf("offers: got %d", len(d.Offers))
	}
	yearly := d.Offers[1]
	if yearly.ID != "paid-yearly" {
		t.Fatalf("yearly offer id: got %q", yearly.ID)
	}
	if len(yearly.Prices) == 0 || yearly.Prices[0].TaxInclusive == nil || !*yearly.Prices[0].TaxInclusive {
		t.Fatalf("yearly tax_inclusive not parsed: %+v", yearly.Prices)
	}
	if yearly.Prices[0].TaxJurisdiction != "NL" {
		t.Fatalf("tax_jurisdiction: got %q", yearly.Prices[0].TaxJurisdiction)
	}
}

func TestParseDiscovery_MissingProviderIsError(t *testing.T) {
	_, err := ParseDiscovery(strings.NewReader(`{"spec_version":"0.4"}`))
	if err == nil {
		t.Fatal("expected error when provider missing")
	}
}

func TestFetchDiscovery_OverHTTP(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/.well-known/open-membership" {
			t.Fatalf("path: got %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"spec_version":"0.4","provider":"https://fieldnotes.example","endpoints":{"checkout":"https://fieldnotes.example/api/om/checkout","entitlements":"https://fieldnotes.example/api/om/entitlements","token":"https://fieldnotes.example/api/om/token","portal":"https://fieldnotes.example/api/om/portal"},"auth_methods":["url-token"],"tiers":[],"features":[],"offers":[],"psps":[]}`))
	}))
	defer srv.Close()

	d, err := FetchDiscovery(context.Background(), srv.Client(), srv.URL)
	if err != nil {
		t.Fatalf("FetchDiscovery: %v", err)
	}
	if d.Provider != "https://fieldnotes.example" {
		t.Fatalf("provider: got %q", d.Provider)
	}
}
