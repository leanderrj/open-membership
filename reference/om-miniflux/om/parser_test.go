package om

import (
	"os"
	"strings"
	"testing"
)

func loadFixture(t *testing.T, name string) *ParseResult {
	t.Helper()
	f, err := os.Open("testdata/" + name)
	if err != nil {
		t.Fatalf("open fixture %s: %v", name, err)
	}
	defer f.Close()
	res, err := Parse(f)
	if err != nil {
		t.Fatalf("parse %s: %v", name, err)
	}
	return res
}

func TestParseBasic_NamespaceAndProvider(t *testing.T) {
	res := loadFixture(t, "basic.xml")
	if got, want := res.Channel.Provider, "https://fieldnotes.example"; got != want {
		t.Fatalf("provider: got %q want %q", got, want)
	}
	if got, want := res.Channel.License, "https://creativecommons.org/licenses/by/4.0/"; got != want {
		t.Fatalf("license: got %q want %q", got, want)
	}
	if len(res.Channel.AuthMethods) != 0 {
		t.Fatalf("expected no auth methods on basic feed, got %v", res.Channel.AuthMethods)
	}
	if len(res.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(res.Items))
	}
	if res.Items[0].Access != AccessOpen {
		t.Fatalf("item 0 access: got %q want %q", res.Items[0].Access, AccessOpen)
	}
	if res.Items[1].Access != AccessOpen {
		t.Fatalf("item 1 access (default): got %q want %q", res.Items[1].Access, AccessOpen)
	}
}

func TestParseURLToken_ExtractsAuthAndTier(t *testing.T) {
	res := loadFixture(t, "url-token.xml")
	if len(res.Channel.AuthMethods) != 1 || res.Channel.AuthMethods[0] != AuthURLToken {
		t.Fatalf("auth methods: got %v", res.Channel.AuthMethods)
	}
	if len(res.Channel.Tiers) != 1 || res.Channel.Tiers[0].ID != "paid" {
		t.Fatalf("tiers: got %+v", res.Channel.Tiers)
	}
	if res.Channel.Unlock == nil || res.Channel.Unlock.Href == "" {
		t.Fatalf("expected channel-level unlock endpoint, got %+v", res.Channel.Unlock)
	}
	if res.Channel.Revocation == nil {
		t.Fatal("expected revocation present")
	}
	if res.Channel.Revocation.Policy != RevocationProspective {
		t.Fatalf("revocation policy: got %q", res.Channel.Revocation.Policy)
	}
	if res.Channel.Revocation.GraceHours != 48 {
		t.Fatalf("grace_hours: got %d", res.Channel.Revocation.GraceHours)
	}

	// Preview item with tier attribute
	found := false
	for _, it := range res.Items {
		if it.Access == AccessPreview {
			found = true
			if it.Preview == "" {
				t.Fatal("preview content missing")
			}
			if len(it.Tiers) != 1 || it.Tiers[0] != "paid" {
				t.Fatalf("tiers on preview item: got %v", it.Tiers)
			}
		}
	}
	if !found {
		t.Fatal("expected at least one preview item")
	}
}

func TestParseBearerPaid_OffersAndFeatures(t *testing.T) {
	res := loadFixture(t, "bearer-paid.xml")
	if len(res.Channel.AuthMethods) != 1 || res.Channel.AuthMethods[0] != AuthBearer {
		t.Fatalf("auth methods: got %v", res.Channel.AuthMethods)
	}
	if len(res.Channel.Tiers) != 3 {
		t.Fatalf("tiers: got %d", len(res.Channel.Tiers))
	}
	if len(res.Channel.Features) != 2 {
		t.Fatalf("features: got %d", len(res.Channel.Features))
	}
	if len(res.Channel.Offers) != 3 {
		t.Fatalf("offers: got %d", len(res.Channel.Offers))
	}

	var monthly *Offer
	for i := range res.Channel.Offers {
		if res.Channel.Offers[i].ID == "paid-monthly" {
			monthly = &res.Channel.Offers[i]
		}
	}
	if monthly == nil {
		t.Fatal("paid-monthly offer missing")
	}
	if monthly.TierID != "paid" {
		t.Fatalf("paid-monthly tier: got %q", monthly.TierID)
	}
	if len(monthly.Prices) != 1 || monthly.Prices[0].Amount != "8.00" {
		t.Fatalf("paid-monthly price: %+v", monthly.Prices)
	}
	if len(monthly.Checkouts) != 1 || monthly.Checkouts[0].PSP != "stripe" {
		t.Fatalf("paid-monthly checkout: %+v", monthly.Checkouts)
	}
	if monthly.Trial == nil || monthly.Trial.Days != 7 {
		t.Fatalf("paid-monthly trial: %+v", monthly.Trial)
	}
	if monthly.Proration != "daily" {
		t.Fatalf("paid-monthly proration: %q", monthly.Proration)
	}

	if res.Channel.Revocation == nil || res.Channel.Revocation.Policy != RevocationOnChargeback {
		t.Fatalf("revocation: %+v", res.Channel.Revocation)
	}
}

func TestParseInvalidDocument_ReturnsError(t *testing.T) {
	_, err := Parse(strings.NewReader("not xml at all"))
	if err == nil {
		t.Fatal("expected error on non-xml input")
	}
}

func TestParseEmptyReader_ReturnsError(t *testing.T) {
	_, err := Parse(strings.NewReader(""))
	if err == nil {
		t.Fatal("expected error on empty input")
	}
}

func TestParseNonOMFeed_NoPanic(t *testing.T) {
	feed := `<?xml version="1.0"?><rss version="2.0"><channel><title>No OM</title><item><title>x</title></item></channel></rss>`
	res, err := Parse(strings.NewReader(feed))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if res.Channel.Provider != "" {
		t.Fatalf("expected empty provider on non-om feed")
	}
	if len(res.Items) != 1 {
		t.Fatalf("expected one item, got %d", len(res.Items))
	}
	if res.Items[0].Access != AccessOpen {
		t.Fatalf("default access should be open, got %q", res.Items[0].Access)
	}
}
