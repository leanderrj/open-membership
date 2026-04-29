/**
 * Shared type definitions for om-ghost.
 *
 * These mirror the shapes described in SPEC.md (Part I §9 for the
 * discovery document; §2-§6 for the om: XML elements).
 */

export type OmAuthMethod =
  | "url-token"
  | "http-basic"
  | "bearer"
  | "dpop"
  | "vc-presentation";

export type OmAccess = "open" | "preview" | "locked" | "members-only";

export type RevocationPolicy = "prospective-only" | "retroactive";

export type ProrationPolicy = "credit-unused" | "charge-difference" | "none";

/** Publisher configuration loaded from om-config.yaml. */
export interface OmConfig {
  spec_version: string;
  provider: {
    url: string;
    name: string;
    did?: string;
  };
  authentication: {
    methods: OmAuthMethod[];
  };
  features: Record<string, { label: string }>;
  tiers: Record<string, TierConfig>;
  psps: Record<string, PspConfig>;
  offers: Record<string, OfferConfig>;
  revocation?: {
    policy: RevocationPolicy;
    grace_hours: number;
  };
  proration?: {
    default: ProrationPolicy;
  };
  privacy?: {
    level: "pseudonymous" | "pseudonymous-required";
    supported_presentations: Array<"full" | "selective-disclosure">;
  };
}

export interface TierConfig {
  label: string;
  features: string[];
  stripe_price_ids?: string[];
}

export interface PspConfig {
  account: string;
  mode: "native-entitlements" | "subscription-derived";
}

export interface OfferConfig {
  tier: string;
  price: {
    amount: string;
    currency: string;
    period: string; // ISO 8601 duration, e.g. P1M, P1Y
  };
  checkout: {
    psp: string;
    price_id: string;
  };
  trial_days?: number;
}

/** The claims om-ghost puts into the JWTs it hands to readers. */
export interface OmJwtClaims {
  iss: string;
  sub: string; // member id (Ghost members.uuid)
  aud: string; // publisher URL
  iat: number;
  exp: number;
  entitlements: string[]; // feature IDs
  tier_id: string;
  subscription_id?: string;
  /** For pseudonymous mode; undefined in v0.1. */
  pseudonym?: string;
}

/** The normalised member state the sidecar works with. */
export interface MemberState {
  id: string;
  uuid: string;
  email: string | null;
  tier_id: string;
  subscription_id: string | null;
  subscription_status: "active" | "trialing" | "past_due" | "canceled" | "none";
  features: string[];
}

/** Shape of .well-known/open-membership, per SPEC §9. */
export interface DiscoveryDocument {
  spec_version: string;
  provider: {
    url: string;
    name: string;
    did?: string;
  };
  auth_methods: OmAuthMethod[];
  tiers: Array<{
    id: string;
    label: string;
    features: string[];
  }>;
  features: Array<{
    id: string;
    label: string;
  }>;
  offers: Array<{
    id: string;
    tier: string;
    price: OfferConfig["price"];
    checkout: {
      psp: string;
      endpoint: string;
    };
    trial_days?: number;
  }>;
  psps: Record<string, { account: string; mode: string }>;
  revocation?: OmConfig["revocation"];
  proration?: OmConfig["proration"];
  privacy?: OmConfig["privacy"];
  endpoints: {
    checkout: string;
    entitlements: string;
    token: string;
    portal: string;
    webhook: string;
  };
}
