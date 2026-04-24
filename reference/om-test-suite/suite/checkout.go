package suite

import (
	"context"

	"github.com/open-membership-rss/om-test-suite/report"
)

// Level 5 — in-reader checkout flow.
//
// TODO(level-5): These tests are stubs. A maintainer filling them in needs to:
//   1. Discover /api/checkout from the discovery document (checkout.endpoint).
//   2. POST a minimal valid body ({"offer_id": "...", "psp": "stripe"}) and
//      assert the response has a session URL that is HTTP(S) and Stripe-shaped.
//   3. Follow the session URL with a HEAD to confirm it returns 200/302.
//   4. Repeat with a deliberately malformed body and assert 4xx with a
//      structured error body.
//   5. Use stripe-mock (see plans/PHASE-3-4.md §2.3.4) in CI to avoid hitting
//      the real Stripe API; the publisher suite accepts --stripe-mock-url to
//      override the endpoint the publisher calls internally.
//
// The publisher-under-test does not need test-mode keys in its live config —
// the suite probes the declared endpoint only. How the publisher wires stripe-
// mock into its own CI is its concern.

func init() {
	Register(Test{
		Category: "checkout",
		Name:     "offer_references_known_tier",
		Level:    report.Level5,
		SpecRef:  "SPEC.md §0.3 Payments and Value / <om:offer>",
		Run:      runOfferReferencesKnownTier,
	})
	Register(Test{
		Category: "checkout",
		Name:     "checkout_endpoint_accepts_valid_post",
		Level:    report.Level5,
		SpecRef:  "plans/PHASE-3-4.md §2.3.1 Checkout initiation",
		Run:      runCheckoutValidPost,
	})
	Register(Test{
		Category: "checkout",
		Name:     "checkout_endpoint_rejects_invalid_post",
		Level:    report.Level5,
		SpecRef:  "plans/PHASE-3-4.md §2.3.1 Checkout initiation",
		Run:      runCheckoutInvalidPost,
	})
	Register(Test{
		Category: "checkout",
		Name:     "checkout_session_url_resolves",
		Level:    report.Level5,
		SpecRef:  "plans/PHASE-3-4.md §2.3.1 Checkout initiation",
		Run:      runCheckoutSessionURL,
	})
}

// runOfferReferencesKnownTier is a partial-real check: it can run against the
// cached feed without any further network I/O. Kept here rather than in
// parse.go because it's Level 5 semantics (commerce), not Level 1 parse.
func runOfferReferencesKnownTier(ctx context.Context, env *Env, emit func(report.TestResult)) {
	pf, ok := decodeCached(env, emit)
	if !ok {
		return
	}
	if len(pf.Channel.Offers) == 0 {
		emit(report.TestResult{Status: report.StatusSkip, Message: "no <om:offer> declared; Level 5 not asserted"})
		return
	}
	tierIDs := map[string]bool{}
	for _, t := range pf.Channel.Tiers {
		tierIDs[t.ID] = true
	}
	for _, o := range pf.Channel.Offers {
		if o.Tier != "" && !tierIDs[o.Tier] {
			emit(report.TestResult{
				Status:  report.StatusFail,
				Message: "offer " + o.ID + " references unknown tier " + o.Tier,
			})
			return
		}
	}
	emit(report.TestResult{
		Status:  report.StatusPass,
		Message: "every offer references a declared tier",
	})
}

func runCheckoutValidPost(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-5): POST to discovery.checkout.endpoint with a valid offer_id and assert session URL shape",
	})
}

func runCheckoutInvalidPost(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-5): POST with an unknown offer_id and assert 400 with a structured error body",
	})
}

func runCheckoutSessionURL(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-5): HEAD the returned session URL and assert 200/302",
	})
}
