import { parse as parseYaml } from "yaml";
import type {
  MemberState,
  EntitlementView,
  OmConfig,
  TierConfig,
} from "../types.js";

// Wrangler inlines *.yaml files as string imports per wrangler.toml [[rules]].
import rawConfig from "../../../om.config.yaml";

let cached: OmConfig | null = null;

export function getConfig(): OmConfig {
  if (cached) return cached;
  cached = parseYaml(rawConfig) as OmConfig;
  return cached;
}

export function tierForPriceId(
  config: OmConfig,
  priceId: string | null,
): { tierId: string; tier: TierConfig } {
  if (!priceId) {
    return { tierId: "free", tier: config.tiers.free ?? emptyFree(config) };
  }
  for (const [id, tier] of Object.entries(config.tiers)) {
    if (tier.stripe_price_ids?.includes(priceId)) {
      return { tierId: id, tier };
    }
  }
  return { tierId: "free", tier: config.tiers.free ?? emptyFree(config) };
}

export function entitlementFor(
  config: OmConfig,
  member: MemberState,
): EntitlementView {
  const active =
    member.status === "active" || member.status === "trialing";
  const { tierId, tier } = active
    ? tierForPriceId(config, member.stripe_price_id)
    : { tierId: "free", tier: config.tiers.free ?? emptyFree(config) };
  return {
    tier_id: tierId,
    features: tier.features,
    is_active: active,
    status: member.status,
  };
}

export function offerById(config: OmConfig, offerId: string) {
  return config.offers[offerId] ?? null;
}

function emptyFree(_config: OmConfig): TierConfig {
  return { label: "Free", features: [] };
}
