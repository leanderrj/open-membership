# `om-ghost`, Reference Implementation for Ghost

This is the reference Ghost plugin/sidecar for the Open Membership RSS
specification, as described in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

`om-ghost` makes an unmodified Ghost instance emit feeds, discovery
documents, and checkout flows that conform to Open Membership RSS. It
reuses Ghost's Members system and its connected Stripe account, no
parallel subscriber store, no Ghost core fork.

## Layout

```
om-ghost/
├── shared/         Runtime-agnostic code: Hono app + handlers,
│                   clients, crypto (Web Crypto), XML renderer
├── service/        Mode B: Node sidecar (pino, SQLite, Express-
│                   grade memory rate limiter)
├── worker/         Mode A: Cloudflare Worker (KV-backed cache,
│                   idempotency, and rate limit)
├── theme/          Ghost Handlebars templates (fallback for
│                   Mode A when not using the Worker for feeds)
├── test/           Unit + integration tests
├── Dockerfile      Multi-stage build for Mode B
├── om-config.example.yaml  Publisher configuration template
└── routes.example.yaml     Ghost routes.yaml additions
```

One codebase, two runtimes: the handlers live in
[`shared/app.ts`](shared/app.ts) and are wired into Node via
[`@hono/node-server`](https://hono.dev/docs/getting-started/nodejs)
under [`service/`](service/), or into a Cloudflare Worker under
[`worker/`](worker/) using the same Hono app.

## Features

- **Discovery**, `GET /.well-known/open-membership` emits the JSON
  document defined in [SPEC §9](../../SPEC.md), composed from
  `om-config.yaml`, Stripe account info, and the sidecar's own
  endpoint URLs.
- **Feed rendering**, `GET /feed/om/:token/` returns a real
  RSS 2.0 + `om:` feed, rendered via `xmlbuilder2`, with per-item
  access decisions derived from Ghost's `visibility` field.
- **Checkout**, `POST /api/om/checkout` creates a Stripe Checkout
  Session for a named offer and returns the redirect URL.
- **Entitlements polling**, `GET /api/om/entitlements?session_id=…`
  for post-checkout state confirmation.
- **Token exchange**, `POST /api/om/token` swaps a feed token for a
  short-lived JWT carrying `tier_id` and `entitlements`.
- **Customer portal**, `GET /api/om/portal?feed_token=…` redirects to
  Stripe's Customer Portal.
- **Webhook**, `POST /api/om/webhook`, idempotent over the Stripe
  `event.id`, updates the feed cache from Stripe subscription events.
- **Observability**, structured logs with request IDs, redacted
  secrets, and duration metrics on every request.
- **Rate limiting**, per-endpoint, per-IP token buckets. Configured
  defaults in [`shared/rate-limit.ts`](shared/rate-limit.ts).
- **Health probes**, `/health` (liveness) and `/ready` (Ghost + Stripe
  reachability).

## Conformance target

`om-ghost` targets Open Membership RSS **conformance Level 5**
(Commerce) on the publisher side. See
[`/docs/FEATURESET.md`](../../docs/FEATURESET.md) for what each level requires.
The formal conformance tests run against `om-test-suite` once that
suite exists; current tests cover unit-level invariants.

## Mode B quickstart (self-hosted Ghost + Node sidecar)

```bash
cd reference/om-ghost

# 1. Install
npm install

# 2. Configure
cp .env.example .env                       # edit Ghost + Stripe keys
cp om-config.example.yaml om-config.yaml   # edit tier mapping

# 3. Run (dev)
npm run dev

# 4. Run (production)
npm run build
node dist/service/index.js

# 5. Wire Ghost
#    - Copy theme/ into your active Ghost theme (optional; the sidecar
#      serves /feed/om/* and /.well-known/open-membership itself when
#      proxied).
#    - Merge routes.example.yaml into your routes.yaml.
#    - Point Stripe webhook to https://publisher.example/api/om/webhook
#      with these events enabled:
#        - checkout.session.completed
#        - customer.subscription.created
#        - customer.subscription.updated
#        - customer.subscription.deleted
```

### Reverse-proxy configuration

The sidecar binds locally; the publisher's reverse proxy (nginx,
Caddy, Cloudflare, etc.) routes only the om-namespaced paths to it:

```
location /api/om/                    { proxy_pass http://127.0.0.1:4000; }
location /.well-known/open-membership { proxy_pass http://127.0.0.1:4000; }
location /feed/om/                   { proxy_pass http://127.0.0.1:4000; }
# everything else continues to Ghost
```

### Docker

```bash
docker build -t om-ghost .
docker run --rm -p 4000:4000 \
  --env-file .env \
  -v $(pwd)/om-config.yaml:/app/om-config.yaml:ro \
  -v om-ghost-state:/app/state \
  om-ghost
```

## Mode A quickstart (Ghost(Pro) + Cloudflare Worker)

See [`worker/README.md`](worker/README.md) for the full walk-through.
In short:

```bash
cd reference/om-ghost/worker
wrangler kv namespace create OM_FEED_CACHE
wrangler kv namespace create OM_IDEMPOTENCY
wrangler kv namespace create OM_RATE_LIMIT
# paste the ids into wrangler.toml, then:
wrangler secret put GHOST_ADMIN_KEY
# … repeat for every secret …
wrangler deploy
```

## Configuration

Two files:

- **`.env`** (Mode B) or **`wrangler secret`** (Mode A), runtime
  secrets and bindings. See `.env.example`.
- **`om-config.yaml`**, the publisher-facing declaration of tiers,
  features, offers, and PSPs. See `om-config.example.yaml`. This is
  safe to commit only if the Stripe price IDs aren't considered
  sensitive in your environment.

Environment variables (Mode B) are validated at startup via zod; bad
values fail the process with a structured error message rather than
surfacing at first request.

## Operational notes

### Cache warming

Mode B warms the feed cache from Ghost's active-subscriber list at
startup. For a site with N paid members this takes roughly N/100
Admin API round-trips (~100 members per page). On a 2 000-member site
this is ~20 requests, completing in a couple of seconds.

Cache warming runs concurrently with request handling, cold requests
during warmup are served from a smaller cache, not blocked.

### Graceful shutdown

SIGTERM and SIGINT trigger a drain: the server stops accepting new
connections, waits up to 30 s for in-flight requests, closes the
SQLite idempotency store, and exits 0. A deadline expiration forces
exit 1.

### Idempotency and pruning

The SQLite idempotency table (`state/idempotency.sqlite`) retains 7
days of webhook event ids. Stripe retries events for up to 3 days, so
7 days comfortably covers the retry window with headroom. Prune runs
hourly.

### State backup

`state/idempotency.sqlite` is the only persistent state. Losing it
means Stripe retries may be double-processed on first arrival after
restart, harmless in practice because the business-logic handlers
are idempotent at the cache-refresh level. Back it up if you want
cleaner logs, but it isn't safety-critical.

## Security

- All request bodies and query strings are validated via zod before
  reaching handlers.
- Webhook signatures are verified with
  `stripe.webhooks.constructEventAsync` using the configured
  `STRIPE_WEBHOOK_SECRET`.
- JWT signing keys and feed-token HMAC keys must be at least 32 chars.
  The `.env.example` includes the Node command to generate them.
- Logs redact `authorization`, `cookie`, and any field matching one of
  the configured key env-var names.
- CORS is locked to `OM_CORS_ORIGINS` if set; if unset it reflects the
  request Origin (useful for dev; tighten before going live).

## License

MIT. See [`/LICENSE`](../../LICENSE).
