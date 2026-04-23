# om-ghost tests

Run with:

```bash
npm test
```

## Coverage

| Area | Status |
|---|---|
| `shared/token.ts` — HMAC feed tokens | unit tests |
| `shared/jwt.ts` — HS256 issuance/verify | unit tests |
| `shared/config.ts` — yaml validation | TODO |
| `service/discovery.ts` — document shape | TODO |
| Stripe Checkout → entitlements e2e | TODO (test-mode Stripe) |
| Ghost Admin API → FeedCache | TODO (dockerised Ghost) |
| `om-test-suite` conformance (Levels 1, 2, 5) | waiting on test suite |

The integration and conformance tests land alongside the `om-test-suite`
deliverable described in [`/ROADMAP.md`](../../../ROADMAP.md) and
[`/SPEC.md` Part II §B](../../../SPEC.md).
