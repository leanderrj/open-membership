// Package om — preview.go
//
// Substitutes <om:preview> content for the reader's rendering path when the
// reader lacks the entitlement needed to display the full item. SPEC.md
// §Foundational 0.1 "Publisher-curated previews". The substitution is a pure
// string operation; it does not fetch over the network.
package om

import (
	"fmt"
	"html"
)

// Render returns the HTML to display for an item given its membership state
// and the current entitlement. When access is granted, fullContent is
// returned verbatim. When access is not granted and the item declares a
// preview, the preview is returned wrapped in a minimal container that
// Miniflux's templates can style. When no preview is declared, a neutral
// lock notice is returned so the reader always has something to show.
func Render(item ItemMembership, fullContent string, ent *Entitlement) string {
	if Granted(item, ent) {
		return fullContent
	}
	if item.Preview != "" {
		return wrapPreview(item.Preview)
	}
	return lockedPlaceholder(item)
}

func wrapPreview(preview string) string {
	return fmt.Sprintf(
		`<div class="om-preview" data-om-access="preview">%s<div class="om-preview-cta" data-om-action="upgrade">%s</div></div>`,
		preview,
		html.EscapeString("Subscribe to read the rest."),
	)
}

func lockedPlaceholder(item ItemMembership) string {
	msg := "This item requires a subscription."
	if len(item.Tiers) > 0 {
		msg = fmt.Sprintf("This item requires the %q tier.", item.Tiers[0])
	}
	return fmt.Sprintf(
		`<div class="om-locked" data-om-access="%s">%s</div>`,
		html.EscapeString(string(item.Access)),
		html.EscapeString(msg),
	)
}
