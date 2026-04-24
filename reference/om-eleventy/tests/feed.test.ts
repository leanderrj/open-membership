import { describe, it, expect } from "vitest";
import {
  renderPerSubscriberFeed,
  type FeedItem,
} from "../worker/src/lib/feed.js";
import type {
  EntitlementView,
  MemberState,
  OmConfig,
} from "../worker/src/types.js";

const config: OmConfig = {
  spec_version: "0.4",
  provider: { url: "https://publisher.example", name: "Publisher Example" },
  authentication: { methods: ["url-token"] },
  features: {
    "full-text": { label: "Full article text" },
  },
  tiers: {
    free: { label: "Free", features: [] },
    paid: {
      label: "Supporter",
      features: ["full-text"],
      stripe_price_ids: ["price_monthly_123"],
    },
  },
  psps: { stripe: { account: "acct_x", mode: "subscription-derived" } },
  offers: {
    "supporter-monthly": {
      tier: "paid",
      price: { amount: "8.00", currency: "USD", period: "P1M" },
      checkout: { psp: "stripe", price_id: "price_monthly_123" },
    },
  },
  revocation: { policy: "prospective-only", grace_hours: 48 },
};

const items: FeedItem[] = [
  {
    title: "Open one",
    url: "https://publisher.example/posts/open/",
    guid: "g-open",
    pubDate: new Date("2026-03-01T00:00:00Z"),
    access: "open",
    body: "<p>open body</p>",
  },
  {
    title: "Gated tier",
    url: "https://publisher.example/posts/gated/",
    guid: "g-gated",
    pubDate: new Date("2026-04-10T00:00:00Z"),
    access: "locked",
    requiredTiers: ["paid"],
    preview: "Paid-only preview.",
    body: "<p>PAID-ONLY BODY</p>",
  },
];

const paidMember: MemberState = {
  uuid: "u-1",
  email: null,
  stripe_customer_id: "cus_x",
  stripe_subscription_id: "sub_x",
  stripe_price_id: "price_monthly_123",
  status: "active",
  tier_id: "paid",
  features: ["full-text"],
  feed_token: "TTTTTT",
  updated_at: "2026-04-24T00:00:00Z",
};

const paidEntitlement: EntitlementView = {
  tier_id: "paid",
  features: ["full-text"],
  is_active: true,
  status: "active",
};

describe("per-subscriber feed composition", () => {
  it("includes the gated body for an entitled member", () => {
    const xml = renderPerSubscriberFeed({
      config,
      publicUrl: "https://publisher.example",
      feedTokenInUrl: "TTTTTT",
      member: paidMember,
      entitlement: paidEntitlement,
      items,
    });
    expect(xml).toContain("PAID-ONLY BODY");
    expect(xml).toContain("<om:access>open</om:access>");
  });

  it("hides the gated body for an anonymous request", () => {
    const xml = renderPerSubscriberFeed({
      config,
      publicUrl: "https://publisher.example",
      feedTokenInUrl: "TTTTTT",
      member: null,
      entitlement: null,
      items,
    });
    expect(xml).not.toContain("PAID-ONLY BODY");
    expect(xml).toContain("<om:access>locked</om:access>");
    expect(xml).toContain("Paid-only preview.");
  });

  it("advertises provider, discovery, and tier declarations", () => {
    const xml = renderPerSubscriberFeed({
      config,
      publicUrl: "https://publisher.example",
      feedTokenInUrl: "TTTTTT",
      member: paidMember,
      entitlement: paidEntitlement,
      items,
    });
    expect(xml).toContain(
      "<om:provider>https://publisher.example</om:provider>",
    );
    expect(xml).toContain(
      "<om:discovery>https://publisher.example/.well-known/open-membership</om:discovery>",
    );
    expect(xml).toContain("<om:authMethod>url-token</om:authMethod>");
    expect(xml).toContain('price="USD 8.00"');
    expect(xml).toContain(
      '<om:revocation policy="prospective-only" grace_hours="48"/>',
    );
  });

  it("downgrades an inactive paid member to free", () => {
    const canceled: MemberState = {
      ...paidMember,
      status: "canceled",
      tier_id: "free",
      features: [],
    };
    const ent: EntitlementView = {
      tier_id: "free",
      features: [],
      is_active: false,
      status: "canceled",
    };
    const xml = renderPerSubscriberFeed({
      config,
      publicUrl: "https://publisher.example",
      feedTokenInUrl: "TTTTTT",
      member: canceled,
      entitlement: ent,
      items,
    });
    expect(xml).not.toContain("PAID-ONLY BODY");
    expect(xml).toContain("<om:access>locked</om:access>");
  });
});
