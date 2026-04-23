import type { OmConfig, MemberState } from "../shared/types.js";
import type { ContentPost } from "../shared/content-client.js";

/** Fixture om-config used across tests. */
export function fixtureConfig(): OmConfig {
  return {
    spec_version: "0.4",
    provider: { url: "https://publisher.example", name: "Publisher Example" },
    authentication: { methods: ["url-token", "bearer"] },
    features: {
      "full-text": { label: "Full article text" },
      "ad-free": { label: "Ad-free reading" },
    },
    tiers: {
      free: { label: "Free", features: [] },
      paid: {
        label: "Supporter",
        features: ["full-text", "ad-free"],
        stripe_price_ids: ["price_monthly_123"],
      },
    },
    psps: { stripe: { account: "acct_test", mode: "native-entitlements" } },
    offers: {
      "supporter-monthly": {
        tier: "paid",
        price: { amount: "12.00", currency: "USD", period: "P1M" },
        checkout: { psp: "stripe", price_id: "price_monthly_123" },
      },
    },
    revocation: { policy: "prospective-only", grace_hours: 48 },
  };
}

export function fixturePaidMember(): MemberState {
  return {
    id: "member_paid_1",
    uuid: "uuid-paid-1",
    email: "paid@example.com",
    tier_id: "paid",
    subscription_id: "sub_123",
    subscription_status: "active",
    features: ["full-text", "ad-free"],
  };
}

export function fixtureFreeMember(): MemberState {
  return {
    id: "member_free_1",
    uuid: "uuid-free-1",
    email: "free@example.com",
    tier_id: "free",
    subscription_id: null,
    subscription_status: "none",
    features: [],
  };
}

export function fixturePosts(): ContentPost[] {
  return [
    {
      id: "post_public",
      uuid: "u1",
      title: "A public post <with> markup & stuff",
      slug: "public",
      url: "https://publisher.example/public/",
      published_at: "2026-04-20T10:00:00Z",
      updated_at: "2026-04-20T10:00:00Z",
      excerpt: "A short excerpt.",
      custom_excerpt: null,
      feature_image: null,
      visibility: "public",
      html: "<p>Full public HTML with <em>emphasis</em>.</p>",
      plaintext: "Full public text with emphasis.",
      primary_author: { name: "Author", slug: "author" },
    },
    {
      id: "post_paid",
      uuid: "u2",
      title: "A paid post",
      slug: "paid",
      url: "https://publisher.example/paid/",
      published_at: "2026-04-19T10:00:00Z",
      updated_at: "2026-04-19T10:00:00Z",
      excerpt: "Paid excerpt preview.",
      custom_excerpt: null,
      feature_image: null,
      visibility: "paid",
      html: "<p>Secret paid content.</p>",
      plaintext: "Secret paid content.",
      primary_author: { name: "Author", slug: "author" },
    },
    {
      id: "post_members",
      uuid: "u3",
      title: "A members-only post",
      slug: "members",
      url: "https://publisher.example/members/",
      published_at: "2026-04-18T10:00:00Z",
      updated_at: "2026-04-18T10:00:00Z",
      excerpt: "Members preview.",
      custom_excerpt: null,
      feature_image: null,
      visibility: "members",
      html: "<p>Members HTML.</p>",
      plaintext: "Members plaintext.",
    },
  ];
}
