package suite

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/open-membership-rss/om-test-suite/report"
)

// DiscoveryDoc is the subset of .well-known/open-membership the suite
// validates at Level 1. Additional fields (psps, offers, entitlements) are
// surfaced by their own category tests at higher levels.
type DiscoveryDoc struct {
	SpecVersion string            `json:"spec_version"`
	Provider    string            `json:"provider"`
	Discovery   string            `json:"discovery,omitempty"`
	AuthMethods []string          `json:"auth_methods,omitempty"`
	Revocation  *DiscoveryRevocation `json:"revocation,omitempty"`
	Privacy     *DiscoveryPrivacy `json:"privacy,omitempty"`
	Raw         map[string]any    `json:"-"`
}

type DiscoveryRevocation struct {
	Policy     string `json:"policy"`
	GraceHours int    `json:"grace_hours,omitempty"`
}

type DiscoveryPrivacy struct {
	Level string `json:"level"`
}

func init() {
	Register(Test{
		Category: "discovery",
		Name:     "discovery_resolves",
		Level:    report.Level1,
		SpecRef:  "SPEC.md §9; FEATURESET.md Level 1 (Canonical discovery)",
		Run:      runDiscoveryResolves,
	})
	Register(Test{
		Category: "discovery",
		Name:     "discovery_spec_version_present",
		Level:    report.Level1,
		SpecRef:  "SPEC.md §9",
		Run:      runDiscoverySpecVersion,
	})
	Register(Test{
		Category: "discovery",
		Name:     "discovery_matches_feed_provider",
		Level:    report.Level1,
		SpecRef:  "plans/PHASE-3-4.md §2.3.1 Discovery document",
		Run:      runDiscoveryMatchesProvider,
	})
	Register(Test{
		Category: "discovery",
		Name:     "discovery_revocation_policy_enum",
		Level:    report.Level1,
		SpecRef:  "SPEC.md §2.1",
		Run:      runDiscoveryRevocationEnum,
	})
}

func runDiscoveryResolves(ctx context.Context, env *Env, emit func(report.TestResult)) {
	if env.DiscoveryURL == "" {
		emit(report.TestResult{Status: report.StatusSkip, Message: "no --discovery URL provided"})
		return
	}
	body, status, transcript, err := env.FetchWithTranscript(ctx, env.DiscoveryURL)
	if err != nil || status != 200 {
		emit(report.TestResult{
			Status:   report.StatusError,
			Message:  fmt.Sprintf("discovery unreachable (status %d)", status),
			Artifact: transcript,
		})
		return
	}
	env.CachedDiscoveryBody = body
	emit(report.TestResult{
		Status:   report.StatusPass,
		Message:  fmt.Sprintf("discovery returned %d bytes", len(body)),
		Artifact: transcript,
	})
}

func runDiscoverySpecVersion(ctx context.Context, env *Env, emit func(report.TestResult)) {
	doc, ok := decodeDiscovery(env, emit)
	if !ok {
		return
	}
	if doc.SpecVersion == "" {
		emit(report.TestResult{Status: report.StatusFail, Message: "spec_version missing"})
		return
	}
	if !strings.HasPrefix(doc.SpecVersion, "0.") && doc.SpecVersion != "1.0" {
		emit(report.TestResult{
			Status:  report.StatusWarn,
			Message: fmt.Sprintf("unrecognised spec_version %q (expected 0.x or 1.0)", doc.SpecVersion),
		})
		return
	}
	emit(report.TestResult{Status: report.StatusPass, Message: "spec_version = " + doc.SpecVersion})
}

func runDiscoveryMatchesProvider(ctx context.Context, env *Env, emit func(report.TestResult)) {
	pf, okFeed := decodeCached(env, emit)
	doc, okDoc := decodeDiscovery(env, emit)
	if !okFeed || !okDoc {
		return
	}
	if pf.Channel.Provider == "" || doc.Provider == "" {
		emit(report.TestResult{Status: report.StatusSkip, Message: "provider value missing on one side"})
		return
	}
	if strings.TrimRight(pf.Channel.Provider, "/") != strings.TrimRight(doc.Provider, "/") {
		emit(report.TestResult{
			Status: report.StatusFail,
			Message: fmt.Sprintf("feed <om:provider>=%q vs discovery provider=%q",
				pf.Channel.Provider, doc.Provider),
		})
		return
	}
	emit(report.TestResult{Status: report.StatusPass, Message: "feed and discovery agree on provider"})
}

func runDiscoveryRevocationEnum(ctx context.Context, env *Env, emit func(report.TestResult)) {
	doc, ok := decodeDiscovery(env, emit)
	if !ok {
		return
	}
	if doc.Revocation == nil {
		emit(report.TestResult{Status: report.StatusSkip, Message: "no revocation block declared"})
		return
	}
	switch doc.Revocation.Policy {
	case "prospective-only", "chargeback-revocation", "full-revocation":
		emit(report.TestResult{Status: report.StatusPass, Message: "revocation.policy = " + doc.Revocation.Policy})
	default:
		emit(report.TestResult{
			Status:  report.StatusFail,
			Message: "revocation.policy not one of the three SPEC §2.1 enum values: " + doc.Revocation.Policy,
		})
	}
}

func decodeDiscovery(env *Env, emit func(report.TestResult)) (*DiscoveryDoc, bool) {
	if env.CachedDiscoveryBody == nil {
		emit(report.TestResult{Status: report.StatusSkip, Message: "discovery body not fetched"})
		return nil, false
	}
	var doc DiscoveryDoc
	if err := json.Unmarshal(env.CachedDiscoveryBody, &doc); err != nil {
		emit(report.TestResult{
			Status:   report.StatusError,
			Message:  "discovery JSON parse failed",
			Artifact: err.Error(),
		})
		return nil, false
	}
	_ = json.Unmarshal(env.CachedDiscoveryBody, &doc.Raw)
	return &doc, true
}
