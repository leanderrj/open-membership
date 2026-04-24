package om

import (
	"strings"
	"testing"
)

func TestRender_FullWhenGranted(t *testing.T) {
	item := ItemMembership{Access: AccessOpen}
	out := Render(item, "<p>full content</p>", &Entitlement{Active: true})
	if out != "<p>full content</p>" {
		t.Fatalf("expected full content, got %q", out)
	}
}

func TestRender_PreviewWhenDenied(t *testing.T) {
	item := ItemMembership{Access: AccessPreview, Tiers: []string{"paid"}, Preview: "teaser text"}
	out := Render(item, "<p>full content</p>", &Entitlement{Active: false})
	if !strings.Contains(out, "teaser text") {
		t.Fatalf("expected preview to contain teaser, got %q", out)
	}
	if strings.Contains(out, "<p>full content</p>") {
		t.Fatalf("full content should NOT appear when denied: %q", out)
	}
	if !strings.Contains(out, "om-preview") {
		t.Fatalf("expected om-preview marker, got %q", out)
	}
}

func TestRender_LockedPlaceholderWhenNoPreview(t *testing.T) {
	item := ItemMembership{Access: AccessLocked, Tiers: []string{"founder"}}
	out := Render(item, "<p>full content</p>", nil)
	if !strings.Contains(out, "om-locked") {
		t.Fatalf("expected locked marker, got %q", out)
	}
	if strings.Contains(out, "full content") {
		t.Fatalf("full content leaked: %q", out)
	}
}
