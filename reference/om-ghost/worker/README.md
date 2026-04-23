# Cloudflare Worker (Mode A) — stub

The Ghost(Pro) deployment path uses a Cloudflare Worker in place of the
Node sidecar under [`../service/`](../service/). The worker:

- receives `/api/om/*` requests (via a `routes.json` in the Worker config or a route on the publisher's Cloudflare zone)
- receives Stripe webhooks at `/api/om/webhook`
- reads Ghost via Admin API (same `shared/ghost-client.ts` as Mode B)
- reads Stripe via the REST API
- maintains the feed-token → member cache in Workers KV (so it survives worker restarts)

## Why this is a stub

The shared library under [`../shared/`](../shared/) uses only `fetch`, `crypto.subtle`-equivalent primitives, and `jose`, which all work in Workers. The outstanding work is:

1. Replace `feed-cache.ts`'s `Map` with a `KVNamespace`-backed cache
2. Swap `express` routers for a thin `Request → Response` handler (Hono or plain `fetch` export)
3. Write a `wrangler.toml` that declares the KV binding and the secrets

This is planned for om-ghost v0.2 once the Node sidecar is stable.

## Expected layout

```
worker/
├── wrangler.toml
├── src/
│   ├── index.ts           # fetch handler, dispatches by path
│   ├── kv-cache.ts        # KV-backed FeedCache
│   └── routes/            # same shape as service/routes/
└── README.md              # this file
```

## Secrets

Same as Mode B, configured via `wrangler secret put`:

- `GHOST_URL`
- `GHOST_ADMIN_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OM_FEED_TOKEN_KEY`
- `OM_JWT_SIGNING_KEY`

`om-config.yaml` is bundled into the worker at build time (it's small
and rarely changes) rather than loaded from KV.
