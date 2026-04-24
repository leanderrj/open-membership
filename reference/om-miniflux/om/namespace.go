// Package om implements the Open Membership RSS 0.4 reader-side module for
// Miniflux. Scope is the Indie Reader profile (conformance Levels 1, 2, 5) as
// defined in FEATURESET.md: feed parsing, url-token and bearer authentication,
// and the in-reader checkout flow driven by <om:offer>. Higher levels
// (VC presentation, selective disclosure, bundles) are intentionally excluded
// at v0.1 and documented as known limitations in the package README.
package om

// Namespace is the canonical URI for the Open Membership RSS module, declared
// as xmlns:om on a channel. SPEC.md §Featureset Summary / 0.1 Foundational.
const Namespace = "http://purl.org/rss/modules/membership/"

// Prefix is the suggested prefix; feeds MAY use any prefix but the module MUST
// bind the same URI. The parser is prefix-agnostic and matches by namespace.
const Prefix = "om"

// PortabilityNamespace is reserved for the companion Subscriber Portability
// Format 1.0 companion spec. Level 5 readers are required to round-trip
// portability artifacts at 1.0 of the parent spec.
const PortabilityNamespace = "http://purl.org/rss/modules/membership/portability/1.0"
