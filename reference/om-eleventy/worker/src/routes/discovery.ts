import type { DiscoveryDocument, Env, OmConfig } from "../types.js";

export function handleDiscovery(env: Env, config: OmConfig): Response {
  const doc = buildDiscovery(config, env.PUBLIC_URL);
  return json(doc);
}

export function buildDiscovery(
  config: OmConfig,
  publicUrl: string,
): DiscoveryDocument {
  const base = publicUrl.replace(/\/$/, "");

  const doc: DiscoveryDocument = {
    spec_version: config.spec_version,
    provider: config.provider,
    auth_methods: config.authentication.methods,

    tiers: Object.entries(config.tiers).map(([id, t]) => ({
      id,
      label: t.label,
      features: t.features,
    })),

    features: Object.entries(config.features).map(([id, f]) => ({
      id,
      label: f.label,
    })),

    offers: Object.entries(config.offers).map(([id, o]) => ({
      id,
      tier: o.tier,
      price: o.price,
      checkout: {
        psp: o.checkout.psp,
        endpoint: `${base}/api/checkout`,
      },
      ...(o.trial_days ? { trial_days: o.trial_days } : {}),
    })),

    psps: Object.fromEntries(
      Object.entries(config.psps).map(([id, p]) => [
        id,
        { account: p.account, mode: p.mode },
      ]),
    ),

    ...(config.revocation ? { revocation: config.revocation } : {}),
    ...(config.proration ? { proration: config.proration } : {}),
    ...(config.privacy ? { privacy: config.privacy } : {}),

    endpoints: {
      checkout: `${base}/api/checkout`,
      entitlements: `${base}/api/entitlements`,
      token: `${base}/api/token`,
      webhook: `${base}/api/webhook`,
    },
  };

  return doc;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}
