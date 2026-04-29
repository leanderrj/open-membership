package suite

import (
	"context"
	"strings"

	"github.com/open-membership-rss/om-test-suite/report"
)

// Level 5; revocation policy declaration + honoring.
//
// The declaration half is runnable now: the feed should carry
// <om:revocation policy="..."> or the discovery doc should carry a revocation
// block, and the policy value must be one of the three SPEC §2.1 enum values.
//
// TODO(level-5): The honoring half is a stub. A maintainer filling it in must:
//   1. Trigger a stripe-mock charge.dispute.created event for a test customer
//      whose entitlement the suite previously verified.
//   2. Poll the entitlements endpoint; under chargeback-revocation or
//      full-revocation, assert the entitlement is revoked within 1 hour per
//      SPEC §2.3 (shorter in practice for the suite; e.g. 60s with
//      webhook-delivery-time bounds documented).
//   3. Under prospective-only, assert the entitlement is NOT revoked.

func init() {
	Register(Test{
		Category: "revocation",
		Name:     "revocation_declared_on_channel_or_discovery",
		Level:    report.Level5,
		SpecRef:  "SPEC.md §2.1; FEATURESET.md Level 5 (Revocation policy)",
		Run:      runRevocationDeclared,
	})
	Register(Test{
		Category: "revocation",
		Name:     "revocation_policy_honored_on_chargeback",
		Level:    report.Level5,
		SpecRef:  "SPEC.md §2.3",
		Run:      runRevocationHonored,
	})
}

func runRevocationDeclared(ctx context.Context, env *Env, emit func(report.TestResult)) {
	pf, ok := decodeCached(env, emit)
	if !ok {
		return
	}
	var policy string
	if pf.Channel.Revocation != nil {
		policy = pf.Channel.Revocation.Policy
	}
	if policy == "" {
		doc, okDoc := decodeDiscovery(env, emit)
		if okDoc && doc.Revocation != nil {
			policy = doc.Revocation.Policy
		}
	}
	if policy == "" {
		emit(report.TestResult{
			Status:  report.StatusWarn,
			Message: "no <om:revocation> or discovery.revocation declared; default is prospective-only but publishers SHOULD state this explicitly",
		})
		return
	}
	policy = strings.TrimSpace(policy)
	switch policy {
	case "prospective-only", "chargeback-revocation", "full-revocation":
		emit(report.TestResult{Status: report.StatusPass, Message: "policy = " + policy})
	default:
		emit(report.TestResult{
			Status:  report.StatusFail,
			Message: "revocation policy value not in SPEC §2.1 enum: " + policy,
		})
	}
}

func runRevocationHonored(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-5): trigger stripe-mock charge.dispute.created and assert the declared policy is honored",
	})
}
