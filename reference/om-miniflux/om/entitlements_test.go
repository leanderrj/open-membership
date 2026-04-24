package om

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestEntitlementClient_Status_Active(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("session_id") != "cs_test" {
			t.Fatalf("session_id: got %q", r.URL.Query().Get("session_id"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"active":true,"tier_id":"paid","token":"eyJ.x.y","expires_in":3600}`))
	}))
	defer srv.Close()

	c := NewEntitlementClient(srv.Client())
	ent, err := c.Status(context.Background(), srv.URL, "cs_test")
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if !ent.Active {
		t.Fatal("expected active")
	}
	if ent.Token != "eyJ.x.y" {
		t.Fatalf("token: got %q", ent.Token)
	}
	if ent.TierID != "paid" {
		t.Fatalf("tier: got %q", ent.TierID)
	}
}

func TestEntitlementClient_Status_NotFoundIsPending(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	}))
	defer srv.Close()
	c := NewEntitlementClient(srv.Client())
	ent, err := c.Status(context.Background(), srv.URL, "cs_test")
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if ent.Active {
		t.Fatal("expected not active")
	}
}

func TestApplyToAuth_StoresBearer(t *testing.T) {
	a := &FeedAuth{FeedID: 1, UserID: 2, AuthMethod: AuthURLToken}
	e := &Entitlement{Active: true, Token: "eyJ.x.y", Refresh: "rtok", ExpiresIn: 1800, TierID: "paid"}
	ApplyToAuth(a, e)
	if a.AuthMethod != AuthBearer {
		t.Fatalf("method: got %q", a.AuthMethod)
	}
	if a.BearerToken != "eyJ.x.y" {
		t.Fatalf("bearer: got %q", a.BearerToken)
	}
	if a.RefreshToken != "rtok" {
		t.Fatalf("refresh: got %q", a.RefreshToken)
	}
	if a.BearerExpires.Before(time.Now().Add(25 * time.Minute)) {
		t.Fatalf("expires too soon: %v", a.BearerExpires)
	}
	if !a.Valid() {
		t.Fatal("expected auth.Valid() to be true after ApplyToAuth")
	}
}

func TestGranted_OpenAlways(t *testing.T) {
	item := ItemMembership{Access: AccessOpen}
	if !Granted(item, nil) {
		t.Fatal("open items should always be granted")
	}
}

func TestGranted_PreviewDeniedWhenInactive(t *testing.T) {
	item := ItemMembership{Access: AccessPreview, Tiers: []string{"paid"}}
	if Granted(item, nil) {
		t.Fatal("preview item should not be granted with nil entitlement")
	}
	if Granted(item, &Entitlement{Active: false}) {
		t.Fatal("preview item should not be granted with inactive entitlement")
	}
}

func TestGranted_MatchesTierOrFeature(t *testing.T) {
	item := ItemMembership{Access: AccessPreview, Tiers: []string{"paid"}}
	if !Granted(item, &Entitlement{Active: true, TierID: "paid"}) {
		t.Fatal("expected granted when tier matches")
	}
	item2 := ItemMembership{Access: AccessMembersOnly, Tiers: []string{"long-form"}}
	if !Granted(item2, &Entitlement{Active: true, TierID: "paid", Features: []string{"long-form"}}) {
		t.Fatal("expected granted when feature matches")
	}
	if Granted(item2, &Entitlement{Active: true, TierID: "paid", Features: []string{"audio"}}) {
		t.Fatal("expected denied when neither tier nor feature matches")
	}
}
