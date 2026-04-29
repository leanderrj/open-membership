package suite

import (
	"context"

	"github.com/open-membership-rss/om-test-suite/report"
)

// Level 5; entitlements polling and lifecycle.
//
// TODO(level-5): These tests are stubs. A maintainer filling them in needs to:
//   1. GET discovery.entitlements.endpoint?session_id=... before a simulated
//      subscription exists; assert the response shape documents "no active
//      subscription" in a structured way (not a 404 body of HTML).
//   2. Trigger a test-mode Stripe webhook (checkout.session.completed) via
//      stripe-mock and then re-poll; assert the entitlements block now lists
//      the expected tier + feature IDs within the publisher's declared
//      grace window.
//   3. Trigger customer.subscription.deleted and assert entitlement is
//      revoked within the declared grace_hours window.
//   4. Optionally: probe for <om:feature> IDs in a returned JWT's claims if
//      the publisher supports that binding.

func init() {
	Register(Test{
		Category: "entitlement",
		Name:     "entitlements_endpoint_reachable",
		Level:    report.Level5,
		SpecRef:  "plans/PHASE-3-4.md §2.3.1 Entitlements polling",
		Run:      runEntitlementsReachable,
	})
	Register(Test{
		Category: "entitlement",
		Name:     "entitlements_structured_response",
		Level:    report.Level5,
		SpecRef:  "plans/PHASE-3-4.md §2.3.1 Entitlements polling",
		Run:      runEntitlementsStructure,
	})
	Register(Test{
		Category: "entitlement",
		Name:     "entitlements_after_webhook",
		Level:    report.Level5,
		SpecRef:  "plans/PHASE-3-4.md §2.3.1 Webhook honoring",
		Run:      runEntitlementsAfterWebhook,
	})
}

func runEntitlementsReachable(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-5): GET entitlements endpoint from discovery doc with a dummy session id, assert 200 with JSON",
	})
}

func runEntitlementsStructure(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-5): validate response against the SPEC §9 entitlements schema (tier_id, features[], expires_at)",
	})
}

func runEntitlementsAfterWebhook(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-5): trigger stripe-mock checkout.session.completed, re-poll, assert entitlement surfaced within 60s",
	})
}
