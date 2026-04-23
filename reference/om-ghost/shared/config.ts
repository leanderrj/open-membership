import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { OmConfig } from "./types.js";

export async function loadConfig(path: string): Promise<OmConfig> {
  const raw = await readFile(path, "utf8");
  const parsed = parse(raw) as OmConfig;
  validateConfig(parsed);
  return parsed;
}

function validateConfig(c: OmConfig): void {
  if (!c.spec_version) throw new Error("om-config: spec_version is required");
  if (!c.provider?.url) throw new Error("om-config: provider.url is required");
  if (!c.authentication?.methods?.length) {
    throw new Error("om-config: authentication.methods must have at least one entry");
  }

  for (const [tierId, tier] of Object.entries(c.tiers ?? {})) {
    for (const feat of tier.features) {
      if (!c.features[feat]) {
        throw new Error(
          `om-config: tier "${tierId}" references unknown feature "${feat}"`,
        );
      }
    }
  }

  for (const [offerId, offer] of Object.entries(c.offers ?? {})) {
    if (!c.tiers[offer.tier]) {
      throw new Error(
        `om-config: offer "${offerId}" references unknown tier "${offer.tier}"`,
      );
    }
    if (!c.psps[offer.checkout.psp]) {
      throw new Error(
        `om-config: offer "${offerId}" references unknown psp "${offer.checkout.psp}"`,
      );
    }
  }
}

/** Resolve which tier a Stripe price_id belongs to, or null if none. */
export function tierForPriceId(c: OmConfig, priceId: string): string | null {
  for (const [tierId, tier] of Object.entries(c.tiers)) {
    if (tier.stripe_price_ids?.includes(priceId)) return tierId;
  }
  return null;
}

/** Resolve which features a tier confers. */
export function featuresForTier(c: OmConfig, tierId: string): string[] {
  return c.tiers[tierId]?.features ?? [];
}
