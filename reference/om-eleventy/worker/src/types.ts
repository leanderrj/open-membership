export interface Env {
  OM_KV: KVNamespace;

  PUBLIC_URL: string;
  LOG_LEVEL?: string;
  OM_CORS_ORIGINS?: string;

  OM_FEED_TOKEN_KEY: string;
  OM_JWT_SIGNING_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;

  ASSETS?: Fetcher;
}

export interface TierConfig {
  label: string;
  features: string[];
  stripe_price_ids?: string[];
}

export interface FeatureConfig {
  label: string;
}

export interface OfferConfig {
  tier: string;
  price: {
    amount: string;
    currency: string;
    period: string;
  };
  checkout: {
    psp: string;
    price_id: string;
  };
  trial_days?: number;
}

export interface PspConfig {
  account: string;
  mode: string;
}

export interface OmConfig {
  spec_version: string;
  provider: {
    url: string;
    name: string;
    did?: string;
  };
  authentication: {
    methods: string[];
  };
  features: Record<string, FeatureConfig>;
  tiers: Record<string, TierConfig>;
  psps: Record<string, PspConfig>;
  offers: Record<string, OfferConfig>;
  revocation?: {
    policy: string;
    grace_hours?: number;
  };
  proration?: {
    default: string;
  };
  privacy?: {
    level: string;
    supported_presentations?: string[];
  };
}

export interface MemberState {
  uuid: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status:
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "incomplete"
    | "none";
  tier_id: string;
  features: string[];
  feed_token: string;
  updated_at: string;
}

export interface EntitlementView {
  tier_id: string;
  features: string[];
  is_active: boolean;
  status: MemberState["status"];
}

export interface DiscoveryDocument {
  spec_version: string;
  provider: { url: string; name: string; did?: string };
  auth_methods: string[];
  tiers: Array<{ id: string; label: string; features: string[] }>;
  features: Array<{ id: string; label: string }>;
  offers: Array<{
    id: string;
    tier: string;
    price: { amount: string; currency: string; period: string };
    checkout: { psp: string; endpoint: string };
    trial_days?: number;
  }>;
  psps: Record<string, { account: string; mode: string }>;
  revocation?: { policy: string; grace_hours?: number };
  proration?: { default: string };
  privacy?: { level: string; supported_presentations?: string[] };
  endpoints: {
    checkout: string;
    entitlements: string;
    token: string;
    webhook: string;
  };
}
