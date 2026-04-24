package suite

import (
	"context"

	"github.com/open-membership-rss/om-test-suite/report"
)

// Level 2 — URL token auth + unlocks.
//
// TODO(level-2): These tests are stubs. A maintainer filling them in needs to:
//   1. Accept a --token flag on the publisher CLI that carries a real feed
//      token issued by the publisher under test.
//   2. Verify that GET <feed>?token=<valid> returns content that differs from
//      GET <feed> without a token (i.e. gating actually gates).
//   3. Verify that GET <feed>?token=<invalid> returns 401 or 403.
//   4. Probe <om:unlock> endpoints on a sample of items: a valid token must
//      yield full content; an absent or bogus token must not.
//   5. Emit a simulated revocation (out-of-band webhook POST) and verify
//      subsequent fetches return 403 within the declared grace_hours.
//
// Every check here currently emits StatusSkip with the TODO rationale. The
// scaffolding (registration, result shape, level bookkeeping) is intentionally
// complete so adding the real probe is a body-swap, not an architectural shift.

func init() {
	Register(Test{
		Category: "auth",
		Name:     "url_token_gating",
		Level:    report.Level2,
		SpecRef:  "FEATURESET.md Level 2; SPEC.md §Featureset Summary (URL token auth)",
		Run:      runURLTokenGating,
	})
	Register(Test{
		Category: "auth",
		Name:     "url_token_rejection",
		Level:    report.Level2,
		SpecRef:  "plans/PHASE-3-4.md §2.3.1 URL token auth",
		Run:      runURLTokenRejection,
	})
	Register(Test{
		Category: "auth",
		Name:     "unlock_endpoint_honors_token",
		Level:    report.Level2,
		SpecRef:  "FEATURESET.md Level 2 (Unlock endpoint)",
		Run:      runUnlockEndpoint,
	})
	Register(Test{
		Category: "auth",
		Name:     "access_revocation_no_stale_content",
		Level:    report.Level2,
		SpecRef:  "plans/PHASE-3-4.md §2.3.1 Access revocation",
		Run:      runAccessRevocation,
	})
}

func runURLTokenGating(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-2): requires a --token flag and a diff probe against the publisher's feed URL with/without the token",
	})
}

func runURLTokenRejection(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-2): fetch feed with a known-bad token and assert 401/403",
	})
}

func runUnlockEndpoint(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-2): select an item with <om:unlock>, call it with the valid token, verify full content is returned",
	})
}

func runAccessRevocation(ctx context.Context, env *Env, emit func(report.TestResult)) {
	emit(report.TestResult{
		Status:  report.StatusSkip,
		Message: "TODO(level-2): requires a revocation hook on the publisher; simulated-revoke then re-fetch and assert 403",
	})
}
