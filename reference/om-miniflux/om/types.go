// Package om — types.go
//
// Typed Go representation of every om 0.4 element the Indie Reader profile
// (Levels 1, 2, 5) consumes. XML struct tags use the full namespace URI so
// that the parser is prefix-agnostic: a feed that declares xmlns:om="..." or
// xmlns:openmembership="..." parses identically as long as the URI matches.
//
// Every optional element is represented as a pointer or a zero-valued
// collection so that "missing" is distinguishable from "present but empty".
package om

import "encoding/xml"

// AccessPolicy enumerates the values of <om:access>. SPEC.md §Foundational 0.1.
type AccessPolicy string

const (
	AccessOpen        AccessPolicy = "open"
	AccessPreview     AccessPolicy = "preview"
	AccessLocked      AccessPolicy = "locked"
	AccessMembersOnly AccessPolicy = "members-only"
)

// AuthMethod enumerates the values of <om:authMethod>. The Indie Reader
// profile handles url-token and bearer; dpop and vc-presentation are parsed
// but surfaced as unsupported-auth errors at fetch time.
type AuthMethod string

const (
	AuthURLToken       AuthMethod = "url-token"
	AuthHTTPBasic      AuthMethod = "http-basic"
	AuthBearer         AuthMethod = "bearer"
	AuthDPoP           AuthMethod = "dpop"
	AuthVCPresentation AuthMethod = "vc-presentation"
)

// RevocationPolicy enumerates the values of <om:revocation policy="...">.
// A reader at Level 5 or above MUST surface non-prospective policies on the
// checkout screen per SPEC.md §2.2.
type RevocationPolicy string

const (
	RevocationProspective   RevocationPolicy = "prospective-only"
	RevocationOnChargeback  RevocationPolicy = "chargeback-revocation"
	RevocationFull          RevocationPolicy = "full-revocation"
	RevocationUnknown       RevocationPolicy = ""
)

// ChannelMembership is the parsed form of the channel-level om elements on an
// RSS 2.0 or RSS 1.0/RDF feed. It is populated by Parse and consumed by the
// fetcher, the UI, and the checkout controller.
type ChannelMembership struct {
	Provider    string
	Discovery   string
	AuthMethods []AuthMethod
	License     string

	Tiers    []Tier
	Features []Feature
	PSPs     []PSP
	Offers   []Offer

	Revocation *Revocation
	Unlock     *Unlock

	// Raw preserves the original element values (trimmed) so downstream code
	// can inspect unrecognized or forward-compatible additions without a
	// second parse.
	Raw map[string]string
}

// ItemMembership is the parsed form of the per-item om elements on an RSS
// entry. Access defaults to AccessOpen when absent, matching SPEC.md §0.1.
type ItemMembership struct {
	Access  AccessPolicy
	Tiers   []string
	Preview string
	Unlock  *Unlock
	Window  *Window
}

// Tier is <om:tier id="..." price="..." period="...">...</om:tier>.
type Tier struct {
	ID          string
	Price       string
	Period      string
	Description string
	Includes    []string
}

// Feature is <om:feature id="...">...</om:feature>. Level 5 readers evaluate
// feature ids against JWT claims from the publisher. SPEC.md §0.3.
type Feature struct {
	ID          string
	Description string
}

// PSP is <om:psp id="..." account="..." />.
type PSP struct {
	ID      string
	Account string
}

// Offer is <om:offer id="..." tier="...">. At least one <om:checkout> is
// required; the first with psp="stripe" is the v0.1 preferred path.
type Offer struct {
	ID        string
	TierID    string
	Prices    []Price
	Checkouts []Checkout
	Trial     *Trial
	Proration string
}

// Price is <om:price amount="..." currency="..." period="..." />.
// The tax_inclusive and tax_jurisdiction fields are forward-compatible with
// the 0.4.1 errata tracked in plans/PHASE-1-2.md §3.1 Track E.
type Price struct {
	Amount          string
	Currency        string
	Period          string
	TaxInclusive    *bool
	TaxJurisdiction string
}

// Checkout is <om:checkout psp="..." price_id="..." />.
type Checkout struct {
	PSP     string
	PriceID string
}

// Trial is <om:trial days="..." />.
type Trial struct {
	Days int
}

// Unlock is <om:unlock href="..." method="..." />. At the channel level it
// provides the publisher's global unlock endpoint; at the item level it
// overrides for that item only.
type Unlock struct {
	Href   string
	Method string
}

// Window is <om:window start="..." end="..." />. Parsed but not evaluated at
// Level 1, 2, or 5; evaluation is a Level 3 concern and out of scope here.
type Window struct {
	Start string
	End   string
}

// Revocation is <om:revocation policy="..." grace_hours="..." />.
type Revocation struct {
	Policy     RevocationPolicy
	GraceHours int
}

// Discovery is the parsed form of a .well-known/open-membership document.
// It is loaded via discovery.Fetch(ctx, url) and consumed alongside the feed
// to populate fields the feed doesn't carry (PSP endpoint URLs, JWKS URIs).
type Discovery struct {
	SpecVersion string            `json:"spec_version"`
	Provider    string            `json:"provider"`
	Endpoints   DiscoveryEndpoint `json:"endpoints"`
	AuthMethods []string          `json:"auth_methods"`
	Tiers       []DiscoveryTier   `json:"tiers"`
	Features    []DiscoveryFeature `json:"features"`
	Offers      []DiscoveryOffer  `json:"offers"`
	Revocation  *DiscoveryRevocation `json:"revocation,omitempty"`
	PSPs        []DiscoveryPSP    `json:"psps"`
}

type DiscoveryEndpoint struct {
	Checkout     string `json:"checkout"`
	Entitlements string `json:"entitlements"`
	Token        string `json:"token"`
	Portal       string `json:"portal"`
	Unlock       string `json:"unlock,omitempty"`
	TokenEndpoint string `json:"token_endpoint,omitempty"`
}

type DiscoveryTier struct {
	ID          string   `json:"id"`
	Price       string   `json:"price"`
	Period      string   `json:"period"`
	Description string   `json:"description"`
	Includes    []string `json:"includes,omitempty"`
}

type DiscoveryFeature struct {
	ID          string `json:"id"`
	Description string `json:"description"`
}

type DiscoveryOffer struct {
	ID       string               `json:"id"`
	TierID   string               `json:"tier"`
	Prices   []DiscoveryOfferPrice `json:"prices"`
	Checkout DiscoveryOfferCheckout `json:"checkout"`
}

type DiscoveryOfferPrice struct {
	Amount          string `json:"amount"`
	Currency        string `json:"currency"`
	Period          string `json:"period"`
	TaxInclusive    *bool  `json:"tax_inclusive,omitempty"`
	TaxJurisdiction string `json:"tax_jurisdiction,omitempty"`
}

type DiscoveryOfferCheckout struct {
	PSP     string `json:"psp"`
	PriceID string `json:"price_id"`
}

type DiscoveryRevocation struct {
	Policy     string `json:"policy"`
	GraceHours int    `json:"grace_hours"`
}

type DiscoveryPSP struct {
	ID      string `json:"id"`
	Account string `json:"account,omitempty"`
}

// Entitlement is the parsed form of a /api/om/entitlements response.
// Fields named to match the publisher reference (om-ghost) response shape.
type Entitlement struct {
	Active    bool     `json:"active"`
	TierID    string   `json:"tier_id,omitempty"`
	Features  []string `json:"features,omitempty"`
	ValidFrom string   `json:"valid_from,omitempty"`
	ValidTo   string   `json:"valid_to,omitempty"`
	Token     string   `json:"token,omitempty"`
	Refresh   string   `json:"refresh_token,omitempty"`
	ExpiresIn int      `json:"expires_in,omitempty"`
}

// CheckoutRequest is the body POSTed to the publisher's /api/om/checkout.
type CheckoutRequest struct {
	OfferID   string `json:"offer_id"`
	PSP       string `json:"psp"`
	PriceID   string `json:"price_id"`
	ReturnURL string `json:"return_url,omitempty"`
}

// CheckoutResponse is the typed response from /api/om/checkout.
type CheckoutResponse struct {
	SessionID  string `json:"session_id"`
	RedirectTo string `json:"redirect_to"`
	ExpiresAt  string `json:"expires_at,omitempty"`
}

// xmlChannel is the minimal envelope used by the parser for RSS 2.0. It
// intentionally ignores non-om elements other than the one or two needed to
// tie items to their channel.
type xmlChannel struct {
	XMLName xml.Name  `xml:"channel"`
	Items   []xmlItem `xml:"item"`
	Raw     []xmlAny  `xml:",any"`
}

type xmlRSS struct {
	XMLName xml.Name   `xml:"rss"`
	Channel xmlChannel `xml:"channel"`
}

// xmlRDF matches the RSS 1.0/RDF shape where items are siblings of channel
// rather than children. SPEC.md notes both shapes MUST be supported.
type xmlRDF struct {
	XMLName xml.Name  `xml:"RDF"`
	Channel xmlChannel `xml:"channel"`
	Items   []xmlItem `xml:"item"`
}

type xmlItem struct {
	Raw []xmlAny `xml:",any"`
}

// xmlAny captures an unknown element with its namespace, name, attributes,
// and chardata so that the parser can walk om: elements by URI without
// pre-declaring every possibility in a struct tag.
type xmlAny struct {
	XMLName  xml.Name
	Attrs    []xml.Attr `xml:",any,attr"`
	Chardata string     `xml:",chardata"`
	Inner    []xmlAny   `xml:",any"`
}
