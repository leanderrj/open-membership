// Package om — parser.go
//
// Parses the om 0.4 elements out of an RSS 2.0 or RSS 1.0/RDF feed using
// only Go's stdlib encoding/xml. The parser is tolerant: missing optional
// elements are not errors, unknown om elements are preserved in the Raw map
// on ChannelMembership for forward compatibility with 0.4.x errata. The
// parser intentionally does not touch RSS elements outside the om namespace;
// Miniflux's existing parser handles those.
package om

import (
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
)

// ErrEmptyFeed is returned when the input decodes to neither <rss> nor <RDF>.
var ErrEmptyFeed = errors.New("om: input is neither RSS 2.0 nor RSS 1.0/RDF")

// ParseResult is the full output of a single feed parse.
type ParseResult struct {
	Channel ChannelMembership
	Items   []ItemMembership
}

// Parse reads an RSS document and extracts the om 0.4 channel- and
// item-level elements. It returns a ParseResult even on a feed that
// declares the namespace but uses no om elements; callers can detect that
// case via len(Result.Channel.AuthMethods)==0 && Result.Channel.Provider=="".
//
// SPEC.md §Featureset Summary (Foundational 0.1) — namespace declaration,
// provider identification, auth method declaration, tiers, per-item access
// policy, preview, unlock.
func Parse(r io.Reader) (*ParseResult, error) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("om: read: %w", err)
	}
	if len(data) == 0 {
		return nil, ErrEmptyFeed
	}

	var rss xmlRSS
	if err := xml.Unmarshal(data, &rss); err == nil && rss.XMLName.Local == "rss" {
		return parseChannel(rss.Channel, rss.Channel.Items), nil
	}

	var rdf xmlRDF
	if err := xml.Unmarshal(data, &rdf); err == nil && rdf.XMLName.Local == "RDF" {
		items := rdf.Items
		if len(items) == 0 {
			items = rdf.Channel.Items
		}
		return parseChannel(rdf.Channel, items), nil
	}

	return nil, ErrEmptyFeed
}

func parseChannel(ch xmlChannel, items []xmlItem) *ParseResult {
	res := &ParseResult{
		Channel: ChannelMembership{Raw: map[string]string{}},
		Items:   make([]ItemMembership, 0, len(items)),
	}

	for _, el := range ch.Raw {
		if el.XMLName.Space != Namespace {
			continue
		}
		applyChannelElement(&res.Channel, el)
	}

	for _, it := range items {
		res.Items = append(res.Items, parseItem(it))
	}

	return res
}

func parseItem(it xmlItem) ItemMembership {
	item := ItemMembership{Access: AccessOpen}
	for _, el := range it.Raw {
		if el.XMLName.Space != Namespace {
			continue
		}
		switch el.XMLName.Local {
		case "access":
			item.Access = AccessPolicy(strings.TrimSpace(el.Chardata))
			for _, a := range el.Attrs {
				if a.Name.Local == "tier" {
					item.Tiers = strings.Fields(a.Value)
				}
			}
		case "preview":
			item.Preview = el.Chardata
		case "unlock":
			item.Unlock = &Unlock{
				Href:   attr(el, "href"),
				Method: attr(el, "method"),
			}
		case "window":
			item.Window = &Window{
				Start: attr(el, "start"),
				End:   attr(el, "end"),
			}
		case "tier":
			item.Tiers = append(item.Tiers, strings.TrimSpace(el.Chardata))
		}
	}
	return item
}

func applyChannelElement(c *ChannelMembership, el xmlAny) {
	switch el.XMLName.Local {
	case "provider":
		c.Provider = strings.TrimSpace(el.Chardata)
	case "discovery":
		c.Discovery = strings.TrimSpace(el.Chardata)
	case "authMethod":
		c.AuthMethods = append(c.AuthMethods, AuthMethod(strings.TrimSpace(el.Chardata)))
	case "license":
		c.License = strings.TrimSpace(el.Chardata)
	case "tier":
		c.Tiers = append(c.Tiers, parseTier(el))
	case "feature":
		c.Features = append(c.Features, Feature{
			ID:          attr(el, "id"),
			Description: strings.TrimSpace(el.Chardata),
		})
	case "psp":
		c.PSPs = append(c.PSPs, PSP{
			ID:      attr(el, "id"),
			Account: attr(el, "account"),
		})
	case "offer":
		c.Offers = append(c.Offers, parseOffer(el))
	case "revocation":
		gh, _ := strconv.Atoi(attr(el, "grace_hours"))
		c.Revocation = &Revocation{
			Policy:     RevocationPolicy(attr(el, "policy")),
			GraceHours: gh,
		}
	case "unlock":
		c.Unlock = &Unlock{
			Href:   attr(el, "href"),
			Method: attr(el, "method"),
		}
	default:
		c.Raw[el.XMLName.Local] = strings.TrimSpace(el.Chardata)
	}
}

func parseTier(el xmlAny) Tier {
	t := Tier{
		ID:          attr(el, "id"),
		Price:       attr(el, "price"),
		Period:      attr(el, "period"),
		Description: strings.TrimSpace(el.Chardata),
	}
	for _, inner := range el.Inner {
		if inner.XMLName.Space != Namespace {
			continue
		}
		if inner.XMLName.Local == "includes" {
			t.Includes = append(t.Includes, attr(inner, "feature"))
		}
	}
	return t
}

func parseOffer(el xmlAny) Offer {
	o := Offer{
		ID:     attr(el, "id"),
		TierID: attr(el, "tier"),
	}
	for _, inner := range el.Inner {
		if inner.XMLName.Space != Namespace {
			continue
		}
		switch inner.XMLName.Local {
		case "price":
			p := Price{
				Amount:          attr(inner, "amount"),
				Currency:        attr(inner, "currency"),
				Period:          attr(inner, "period"),
				TaxJurisdiction: attr(inner, "tax_jurisdiction"),
			}
			if raw := attr(inner, "tax_inclusive"); raw != "" {
				b := raw == "true" || raw == "1"
				p.TaxInclusive = &b
			}
			o.Prices = append(o.Prices, p)
		case "checkout":
			o.Checkouts = append(o.Checkouts, Checkout{
				PSP:     attr(inner, "psp"),
				PriceID: attr(inner, "price_id"),
			})
		case "trial":
			days, _ := strconv.Atoi(attr(inner, "days"))
			o.Trial = &Trial{Days: days}
		case "proration":
			o.Proration = strings.TrimSpace(inner.Chardata)
		}
	}
	return o
}

func attr(el xmlAny, name string) string {
	for _, a := range el.Attrs {
		if a.Name.Local == name {
			return a.Value
		}
	}
	return ""
}
