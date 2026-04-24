package om

import (
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestApplyRequest_URLToken_AppendsParam(t *testing.T) {
	req, _ := http.NewRequest(http.MethodGet, "https://fieldnotes.example/feed/om/", nil)
	auth := &FeedAuth{AuthMethod: AuthURLToken, URLToken: "abc123"}
	if err := ApplyRequest(req, auth); err != nil {
		t.Fatalf("ApplyRequest: %v", err)
	}
	if got := req.URL.Query().Get("token"); got != "abc123" {
		t.Fatalf("token query: got %q want abc123", got)
	}
}

func TestApplyRequest_URLToken_OverridesExisting(t *testing.T) {
	req, _ := http.NewRequest(http.MethodGet, "https://fieldnotes.example/feed?token=old&page=2", nil)
	auth := &FeedAuth{AuthMethod: AuthURLToken, URLToken: "new"}
	if err := ApplyRequest(req, auth); err != nil {
		t.Fatalf("ApplyRequest: %v", err)
	}
	if got := req.URL.Query().Get("token"); got != "new" {
		t.Fatalf("token replaced: got %q", got)
	}
	if got := req.URL.Query().Get("page"); got != "2" {
		t.Fatalf("other params preserved: page=%q", got)
	}
}

func TestApplyRequest_Bearer_SetsHeader(t *testing.T) {
	req, _ := http.NewRequest(http.MethodGet, "https://fieldnotes.example/feed", nil)
	auth := &FeedAuth{AuthMethod: AuthBearer, BearerToken: "eyJ.payload.sig", BearerExpires: time.Now().Add(time.Hour)}
	if err := ApplyRequest(req, auth); err != nil {
		t.Fatalf("ApplyRequest: %v", err)
	}
	if got := req.Header.Get("Authorization"); got != "Bearer eyJ.payload.sig" {
		t.Fatalf("authorization header: got %q", got)
	}
}

func TestApplyRequest_Bearer_ExpiredErrors(t *testing.T) {
	req, _ := http.NewRequest(http.MethodGet, "https://fieldnotes.example/feed", nil)
	auth := &FeedAuth{AuthMethod: AuthBearer, BearerToken: "stale", BearerExpires: time.Now().Add(-time.Minute)}
	if err := ApplyRequest(req, auth); err == nil {
		t.Fatal("expected error on expired bearer")
	}
}

func TestApplyRequest_UnsupportedMethod_Errors(t *testing.T) {
	req, _ := http.NewRequest(http.MethodGet, "https://fieldnotes.example/feed", nil)
	auth := &FeedAuth{AuthMethod: AuthDPoP, BearerToken: "x"}
	if err := ApplyRequest(req, auth); err == nil {
		t.Fatal("expected error on dpop method")
	}
}

func TestApplyRequest_NilAuth_NoOp(t *testing.T) {
	req, _ := http.NewRequest(http.MethodGet, "https://fieldnotes.example/feed", nil)
	if err := ApplyRequest(req, nil); err != nil {
		t.Fatalf("nil auth should be no-op, got %v", err)
	}
	if req.URL.RawQuery != "" {
		t.Fatalf("query unexpectedly set: %q", req.URL.RawQuery)
	}
	if req.Header.Get("Authorization") != "" {
		t.Fatal("authorization header unexpectedly set")
	}
}

func TestBuildTokenizedURL(t *testing.T) {
	out, err := BuildTokenizedURL("https://fieldnotes.example/feed/om/", "abc")
	if err != nil {
		t.Fatalf("BuildTokenizedURL: %v", err)
	}
	if !strings.Contains(out, "token=abc") {
		t.Fatalf("expected token in url, got %q", out)
	}
}

func TestIsUnauthorized(t *testing.T) {
	for code, want := range map[int]bool{
		200: false,
		401: true,
		403: true,
		404: false,
		500: false,
	} {
		got := IsUnauthorized(&http.Response{StatusCode: code})
		if got != want {
			t.Fatalf("IsUnauthorized(%d): got %v want %v", code, got, want)
		}
	}
}
