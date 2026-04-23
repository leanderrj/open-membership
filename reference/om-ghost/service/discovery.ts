import type { DiscoveryDocument, OmConfig } from "../shared/types.js";

/**
 * Build the .well-known/open-membership document from om-config.yaml.
 *
 * Per SPEC §9 the document composes fields from the publisher's config
 * (tiers, features, offers, psps, revocation) with the sidecar's
 * advertised endpoints. It is regenerated on each request so that a
 * config reload is visible immediately.
 */
export function buildDiscovery(
  config: OmConfig,
  publicUrl: string,
): DiscoveryDocument {
  const base = publicUrl.replace(/\/$/, "");

  return {
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
        endpoint: `${base}/api/om/checkout`,
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
      checkout: `${base}/api/om/checkout`,
      entitlements: `${base}/api/om/entitlements`,
      token: `${base}/api/om/token`,
      portal: `${base}/api/om/portal`,
      webhook: `${base}/api/om/webhook`,
    },
  };
}
