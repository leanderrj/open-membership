package suite

import (
	"context"
	"encoding/xml"
	"fmt"
	"net/url"
	"strings"

	"github.com/open-membership-rss/om-test-suite/report"
)

// Namespace is the canonical URI for the Open Membership module. Any prefix
// binding this URI is accepted.
const Namespace = "http://purl.org/rss/modules/membership/"

// ParsedFeed is the subset of RSS + om: the suite inspects. Deliberately
// permissive: unknown elements pass through so a future level's tests can
// extend the struct without breaking.
type ParsedFeed struct {
	XMLName xml.Name
	Channel Channel `xml:"channel"`
}

type Channel struct {
	Title       string   `xml:"title"`
	Link        string   `xml:"link"`
	Description string   `xml:"description"`

	// om:* elements. Binding is by namespace URI, not prefix.
	Provider    string   `xml:"http://purl.org/rss/modules/membership/ provider"`
	Discovery   string   `xml:"http://purl.org/rss/modules/membership/ discovery"`
	AuthMethods []string `xml:"http://purl.org/rss/modules/membership/ authMethod"`
	Privacy     string   `xml:"http://purl.org/rss/modules/membership/ privacy"`

	Tiers []Tier `xml:"http://purl.org/rss/modules/membership/ tier"`
	Offers []Offer `xml:"http://purl.org/rss/modules/membership/ offer"`
	Revocation *Revocation `xml:"http://purl.org/rss/modules/membership/ revocation"`

	Items []Item `xml:"item"`
}

type Tier struct {
	ID     string `xml:"id,attr"`
	Price  string `xml:"price,attr"`
	Period string `xml:"period,attr"`
	Label  string `xml:",chardata"`
}

type Offer struct {
	ID   string `xml:"id,attr"`
	Tier string `xml:"tier,attr"`
}

type Revocation struct {
	Policy     string `xml:"policy,attr"`
	GraceHours string `xml:"grace_hours,attr"`
}

type Item struct {
	Title   string `xml:"title"`
	GUID    string `xml:"guid"`
	Access  string `xml:"http://purl.org/rss/modules/membership/ access"`
	Preview string `xml:"http://purl.org/rss/modules/membership/ preview"`
	Unlock  string `xml:"http://purl.org/rss/modules/membership/ unlock"`
}

// ParseFeed unmarshals an RSS 2.0 feed, returning a ParsedFeed plus the set of
// namespaces declared on the root. Namespaces are recovered from the raw XML
// because encoding/xml discards them after resolution.
func ParseFeed(body []byte) (*ParsedFeed, []string, error) {
	var pf ParsedFeed
	if err := xml.Unmarshal(body, &pf); err != nil {
		return nil, nil, fmt.Errorf("xml parse: %w", err)
	}
	return &pf, extractRootNamespaces(body), nil
}

// extractRootNamespaces scans the first element of the document for xmlns:*
// attribute values. This is a deliberate minimal scanner: a full XML parser
// would work but we only need the root declarations and this keeps the
// dependency surface stdlib-only.
func extractRootNamespaces(body []byte) []string {
	dec := xml.NewDecoder(strings.NewReader(string(body)))
	var out []string
	for {
		tok, err := dec.Token()
		if err != nil {
			return out
		}
		if se, ok := tok.(xml.StartElement); ok {
			for _, attr := range se.Attr {
				if attr.Name.Space == "xmlns" || attr.Name.Local == "xmlns" {
					out = append(out, attr.Value)
				}
			}
			return out
		}
	}
}

// init registers Level 1 parsing tests. Every check here probes "is the feed
// structurally well-formed by the SPEC's Foundational rules" — no network
// beyond the initial fetch, no interpretation of access policy.
func init() {
	Register(Test{
		Category: "parse",
		Name:     "feed_fetchable",
		Level:    report.Level1,
		SpecRef:  "SPEC.md §Featureset Summary / 0.1 Foundational",
		Run:      runFeedFetchable,
	})
	Register(Test{
		Category: "parse",
		Name:     "namespace_declared",
		Level:    report.Level1,
		SpecRef:  "SPEC.md §Featureset Summary; FEATURESET.md Level 1",
		Run:      runNamespaceDeclared,
	})
	Register(Test{
		Category: "parse",
		Name:     "provider_present",
		Level:    report.Level1,
		SpecRef:  "SPEC.md §Featureset Summary / 0.1 Foundational",
		Run:      runProviderPresent,
	})
	Register(Test{
		Category: "parse",
		Name:     "provider_is_url",
		Level:    report.Level1,
		SpecRef:  "SPEC.md §Appendix A",
		Run:      runProviderIsURL,
	})
	Register(Test{
		Category: "parse",
		Name:     "at_least_one_tier",
		Level:    report.Level1,
		SpecRef:  "FEATURESET.md Level 1",
		Run:      runAtLeastOneTier,
	})
	Register(Test{
		Category: "parse",
		Name:     "access_values_valid",
		Level:    report.Level1,
		SpecRef:  "SPEC.md §Featureset Summary / 0.1 Foundational",
		Run:      runAccessValuesValid,
	})
	Register(Test{
		Category: "parse",
		Name:     "locked_item_has_preview",
		Level:    report.Level1,
		SpecRef:  "plans/PHASE-3-4.md §2.3.1 Preview semantics",
		Run:      runLockedItemHasPreview,
	})
}

func runFeedFetchable(ctx context.Context, env *Env, emit func(report.TestResult)) {
	if env.FeedURL == "" {
		emit(report.TestResult{Status: report.StatusError, Message: "no feed URL provided"})
		return
	}
	body, status, transcript, err := env.FetchWithTranscript(ctx, env.FeedURL)
	if err != nil || status != 200 {
		emit(report.TestResult{
			Status:   report.StatusError,
			Message:  fmt.Sprintf("feed unreachable (status %d)", status),
			Artifact: transcript,
		})
		return
	}
	env.CachedFeedBody = body
	emit(report.TestResult{
		Status:   report.StatusPass,
		Message:  fmt.Sprintf("feed returned %d bytes", len(body)),
		Artifact: transcript,
	})
}

func runNamespaceDeclared(ctx context.Context, env *Env, emit func(report.TestResult)) {
	if env.CachedFeedBody == nil {
		emit(report.TestResult{Status: report.StatusSkip, Message: "feed body unavailable"})
		return
	}
	_, nss, err := ParseFeed(env.CachedFeedBody)
	if err != nil {
		emit(report.TestResult{
			Status:   report.StatusError,
			Message:  "feed not valid XML",
			Artifact: err.Error(),
		})
		return
	}
	for _, ns := range nss {
		if ns == Namespace {
			emit(report.TestResult{Status: report.StatusPass, Message: "xmlns:om bound to canonical URI"})
			return
		}
	}
	emit(report.TestResult{
		Status:   report.StatusFail,
		Message:  fmt.Sprintf("%s not declared on channel element; saw %v", Namespace, nss),
	})
}

func runProviderPresent(ctx context.Context, env *Env, emit func(report.TestResult)) {
	pf, ok := decodeCached(env, emit)
	if !ok {
		return
	}
	if strings.TrimSpace(pf.Channel.Provider) == "" {
		emit(report.TestResult{Status: report.StatusFail, Message: "<om:provider> missing or empty"})
		return
	}
	emit(report.TestResult{Status: report.StatusPass, Message: "<om:provider> = " + pf.Channel.Provider})
}

func runProviderIsURL(ctx context.Context, env *Env, emit func(report.TestResult)) {
	pf, ok := decodeCached(env, emit)
	if !ok {
		return
	}
	u, err := url.Parse(strings.TrimSpace(pf.Channel.Provider))
	if err != nil || u.Scheme == "" || u.Host == "" {
		emit(report.TestResult{
			Status:  report.StatusFail,
			Message: fmt.Sprintf("<om:provider> is not an absolute URL: %q", pf.Channel.Provider),
		})
		return
	}
	if u.Scheme != "https" {
		emit(report.TestResult{
			Status:  report.StatusWarn,
			Message: "<om:provider> SHOULD be https; got " + u.Scheme,
		})
		return
	}
	emit(report.TestResult{Status: report.StatusPass, Message: "provider is a valid https URL"})
}

func runAtLeastOneTier(ctx context.Context, env *Env, emit func(report.TestResult)) {
	pf, ok := decodeCached(env, emit)
	if !ok {
		return
	}
	if len(pf.Channel.Tiers) == 0 {
		emit(report.TestResult{Status: report.StatusFail, Message: "no <om:tier> declared"})
		return
	}
	for _, t := range pf.Channel.Tiers {
		if t.ID == "" {
			emit(report.TestResult{
				Status:  report.StatusFail,
				Message: "<om:tier> missing required id attribute",
			})
			return
		}
	}
	emit(report.TestResult{
		Status:  report.StatusPass,
		Message: fmt.Sprintf("found %d tier(s)", len(pf.Channel.Tiers)),
	})
}

func runAccessValuesValid(ctx context.Context, env *Env, emit func(report.TestResult)) {
	pf, ok := decodeCached(env, emit)
	if !ok {
		return
	}
	allowed := map[string]bool{
		"open": true, "preview": true, "locked": true, "members-only": true,
	}
	var bad []string
	for _, it := range pf.Channel.Items {
		v := strings.TrimSpace(it.Access)
		if v == "" {
			continue
		}
		if !allowed[v] {
			bad = append(bad, fmt.Sprintf("%q on item %q", v, it.GUID))
		}
	}
	if len(bad) > 0 {
		emit(report.TestResult{
			Status:  report.StatusFail,
			Message: "unknown <om:access> values: " + strings.Join(bad, ", "),
		})
		return
	}
	emit(report.TestResult{Status: report.StatusPass, Message: "all <om:access> values are within the spec enum"})
}

func runLockedItemHasPreview(ctx context.Context, env *Env, emit func(report.TestResult)) {
	pf, ok := decodeCached(env, emit)
	if !ok {
		return
	}
	var missing []string
	var checked int
	for _, it := range pf.Channel.Items {
		if strings.TrimSpace(it.Access) != "locked" {
			continue
		}
		checked++
		if strings.TrimSpace(it.Preview) == "" {
			missing = append(missing, it.GUID)
		}
	}
	if checked == 0 {
		emit(report.TestResult{Status: report.StatusSkip, Message: "no locked items in feed"})
		return
	}
	if len(missing) > 0 {
		emit(report.TestResult{
			Status:  report.StatusWarn,
			Message: fmt.Sprintf("%d locked item(s) without <om:preview>: %v", len(missing), missing),
		})
		return
	}
	emit(report.TestResult{
		Status:  report.StatusPass,
		Message: fmt.Sprintf("all %d locked items carry a preview", checked),
	})
}

// decodeCached parses the cached feed body and emits StatusError if the feed
// was not previously fetched. Shared helper; keeps every category terse.
func decodeCached(env *Env, emit func(report.TestResult)) (*ParsedFeed, bool) {
	if env.CachedFeedBody == nil {
		emit(report.TestResult{Status: report.StatusSkip, Message: "feed body not fetched"})
		return nil, false
	}
	pf, _, err := ParseFeed(env.CachedFeedBody)
	if err != nil {
		emit(report.TestResult{
			Status:   report.StatusError,
			Message:  "feed parse failed",
			Artifact: err.Error(),
		})
		return nil, false
	}
	return pf, true
}
