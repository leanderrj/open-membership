package om

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCheckoutClient_StartAndOpen(t *testing.T) {
	var received CheckoutRequest
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if ct := r.Header.Get("Content-Type"); ct != "application/json" {
			t.Fatalf("content-type: got %q", ct)
		}
		body, _ := io.ReadAll(r.Body)
		if err := json.Unmarshal(body, &received); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"session_id":"cs_test_123","redirect_to":"https://checkout.stripe.com/pay/cs_test_123"}`))
	}))
	defer srv.Close()

	var opened string
	opener := func(_ context.Context, u string) error { opened = u; return nil }
	c := NewCheckoutClient(srv.Client(), opener)

	resp, err := c.StartAndOpen(context.Background(), srv.URL, CheckoutRequest{
		OfferID: "paid-monthly",
		PSP:     "stripe",
		PriceID: "price_TEST_paid_monthly",
	})
	if err != nil {
		t.Fatalf("StartAndOpen: %v", err)
	}
	if resp.SessionID != "cs_test_123" {
		t.Fatalf("session_id: got %q", resp.SessionID)
	}
	if received.OfferID != "paid-monthly" {
		t.Fatalf("forwarded offer: got %q", received.OfferID)
	}
	if !strings.HasPrefix(opened, "https://checkout.stripe.com/") {
		t.Fatalf("browser opener not called with checkout URL, got %q", opened)
	}
}

func TestCheckoutClient_Start_ErrorsOnNon2xx(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"bad_offer"}`, http.StatusBadRequest)
	}))
	defer srv.Close()

	c := NewCheckoutClient(srv.Client(), nil)
	_, err := c.Start(context.Background(), srv.URL, CheckoutRequest{OfferID: "x", PSP: "stripe"})
	if err == nil {
		t.Fatal("expected error on 400")
	}
}

func TestCheckoutClient_Start_ErrorsWhenRedirectMissing(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"session_id":"cs_test"}`))
	}))
	defer srv.Close()

	c := NewCheckoutClient(srv.Client(), nil)
	_, err := c.Start(context.Background(), srv.URL, CheckoutRequest{OfferID: "x", PSP: "stripe"})
	if err == nil {
		t.Fatal("expected error when redirect_to missing")
	}
}
