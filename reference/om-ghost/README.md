# `om-ghost` — Reference Implementation for Ghost

This is the reference Ghost plugin/sidecar for the Open Membership RSS specification, as described in [`/om-ghost-ARCHITECTURE.md`](../../om-ghost-ARCHITECTURE.md).

`om-ghost` makes an unmodified Ghost instance emit feeds, discovery documents, and checkout flows that conform to Open Membership RSS. It reuses Ghost's Members system and its connected Stripe account — no parallel state, no Ghost core fork.

## Status

Pre-`v0.1`. Under active construction. The layout follows the architecture document exactly; what is scaffolded vs. working is tracked in the roadmap.

| Component | Status |
|---|---|
| Theme templates (`theme/`) | Scaffolded |
| Shared libraries (`shared/`) | Scaffolded |
| Node sidecar service (`service/`) | Scaffolded |
| Cloudflare Worker (`worker/`) | Stub — planned for v0.2 |
| Conformance tests (`test/`) | Minimal |

## Layout

```
om-ghost/
├── theme/          Ghost theme files (Handlebars templates + partials)
├── shared/         Code shared between sidecar and worker
├── service/        Mode B: Node sidecar for self-hosted Ghost
├── worker/         Mode A: Cloudflare Worker for Ghost(Pro) (stub)
├── test/           Unit + conformance tests
├── om-config.example.yaml    Publisher configuration template
└── routes.example.yaml       Ghost routes.yaml additions
```

## Modes

This plugin is deployable in two modes. See the architecture doc for rationale.

**Mode A — Ghost(Pro) + Cloudflare Worker.** The publisher uploads the theme to Ghost Admin and deploys the worker separately. The worker reads Ghost via Admin API and owns Stripe webhook delivery.

**Mode B — Self-hosted Ghost + Node sidecar.** The publisher runs the Node service alongside their Ghost instance; a reverse proxy routes `/api/om/*` and `/feed/om/*` to the sidecar.

Both modes share the same `shared/` library so business logic stays in one place.

## Quickstart (Mode B)

```bash
# 1. Install
cd reference/om-ghost
npm install

# 2. Configure
cp .env.example .env          # edit with Ghost + Stripe keys
cp om-config.example.yaml om-config.yaml   # edit tier mapping

# 3. Run
npm run dev

# 4. Wire Ghost
#    - Copy theme/ files into your active Ghost theme
#    - Merge routes.example.yaml into your site's routes.yaml
#    - Point Stripe webhook to https://yourhost/api/om/webhook
```

## Conformance target

`om-ghost` v1.0 aims for Open Membership RSS **conformance Level 5** (Commerce) on the publisher side, running against the `om-test-suite` once it exists. See [`/FEATURESET.md`](../../FEATURESET.md) for what each level requires.

## License

MIT. See [`LICENSE`](./LICENSE) or the root [`LICENSE`](../../LICENSE).
