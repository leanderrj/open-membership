# Cloudflare Worker (Mode A)

The Cloudflare Worker variant of `om-ghost`. Share source with the Node
sidecar under [`../service/`](../service/) — the Hono app is built in
[`../shared/app.ts`](../shared/app.ts), and Mode A supplies KV-backed
adapters for the same cache / idempotency / rate-limit interfaces the
Node service uses.

## When to use Mode A

- Publisher is on Ghost(Pro) and can't run a sidecar.
- Publisher already uses Cloudflare for their zone.
- Publisher wants global edge latency on the feed and checkout endpoints.

## When NOT to use Mode A

- You need strict rate-limit guarantees (KV is eventually consistent;
  use a Durable Object or the Node sidecar instead).
- You have tens of thousands of subscribers and want to warm the cache
  eagerly at startup (not possible in Workers; Mode A is on-demand).

## Deploy

```bash
# 1. One-time: create KV namespaces and capture the ids
wrangler kv namespace create OM_FEED_CACHE
wrangler kv namespace create OM_IDEMPOTENCY
wrangler kv namespace create OM_RATE_LIMIT

# 2. Paste the ids into worker/wrangler.toml (replace REPLACE_ME_* values)

# 3. Set secrets
wrangler secret put GHOST_ADMIN_KEY
wrangler secret put GHOST_CONTENT_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put OM_FEED_TOKEN_KEY
wrangler secret put OM_JWT_SIGNING_KEY

# 4. Copy om-config.yaml to the om-ghost root (it's bundled at build)
cp om-config.example.yaml ../om-config.yaml
# edit as needed

# 5. Deploy
wrangler deploy
```

## Zone routing

On your Cloudflare zone, add route patterns so the Worker receives only
the om-namespaced paths. Everything else must pass through to Ghost(Pro):

```
https://publisher.example/api/om/*           → om-ghost worker
https://publisher.example/.well-known/open-membership  → om-ghost worker
https://publisher.example/feed/om/*          → om-ghost worker
```

## Stripe webhook

Point your Stripe webhook destination at
`https://publisher.example/api/om/webhook` and enable at least these
events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Known limitations

- **Rate limiting is best-effort** because KV is eventually consistent.
  Under parallel load from one IP, a small overshoot is possible.
- **Cache is on-demand**: the first feed request from a newly-paid
  member waits on a Ghost Admin API call (~200ms). Subsequent requests
  are cache-hits (~5ms).
- **No startup phase**: config validation happens per request. The
  cached parse is cheap (once per Worker instance lifetime), but
  malformed config won't crash a Worker at deploy time — it will
  return 500 on the first request.
