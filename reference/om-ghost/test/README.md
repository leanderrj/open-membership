# om-ghost tests

Run with:

```bash
npm install
npm test
```

Tests use `node:test` with `tsx` as the loader — no Jest/Vitest
dependency. Everything runs in under a second.

## Coverage

| File | What it exercises |
|---|---|
| `token.test.ts` | HMAC feed token determinism, tamper resistance, constant-time verify (all via Web Crypto) |
| `jwt.test.ts` | HS256 issuance, round-trip, audience/issuer binding |
| `config.test.ts` | `tierForPriceId`, `featuresForTier` lookups |
| `discovery.test.ts` | `.well-known/open-membership` document shape (SPEC §9) |
| `feed-render.test.ts` | RSS+om XML shape, escaping, access decisions, CDATA handling |
| `app.test.ts` | Full Hono app surface via `app.request()`: discovery, health, ready, feed, token, checkout, rate limit, webhook dedup |

## What is NOT tested here

- End-to-end against a real Ghost instance
- End-to-end against Stripe test-mode (offers, checkout, webhooks)
- om-test-suite conformance (Levels 1, 2, 5) — blocked on the test
  suite itself existing (see ROADMAP.md)
- Cloudflare Worker runtime — covered manually via `wrangler dev` and
  `miniflare` in CI once we wire it up
- Load tests

The fixtures in [`fixtures.ts`](fixtures.ts) simulate Ghost members
and posts, but the `GhostClient` / `ContentApiClient` / `Stripe`
clients themselves go through stubs during handler tests.
