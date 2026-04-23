import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../shared/app.js";
import type { Deps } from "../shared/deps.js";
import type { FeedCache } from "../shared/feed-cache.js";
import type { IdempotencyStore } from "../shared/idempotency.js";
import type { RateLimiter, RateDecision } from "../shared/rate-limit.js";
import type { MemberState } from "../shared/types.js";
import { createConsoleLogger } from "../shared/logger.js";
import { fixtureConfig, fixturePaidMember, fixturePosts } from "./fixtures.js";

/**
 * Hono's app.request() runs the full middleware + handler stack in
 * memory, returning a Response. No server, no sockets.
 */

function stubDeps(overrides: Partial<Deps> = {}): Deps {
  const members = new Map<string, MemberState>();
  members.set("tok-paid", fixturePaidMember());

  const cache: FeedCache = {
    async get(t) {
      return members.get(t) ?? null;
    },
    async refreshMemberById() {
      return null;
    },
    async evictMemberId() {},
    async size() {
      return members.size;
    },
  };

  const idempotency: IdempotencyStore = {
    async claim() {
      return true;
    },
    async prune() {
      return 0;
    },
    async close() {},
  };

  const allow: RateDecision = {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: 100,
  };
  const rateLimiter: RateLimiter = {
    async check() {
      return allow;
    },
  };

  const logger = createConsoleLogger({ test: true }, "fatal");

  return {
    config: fixtureConfig(),
    env: {
      publicUrl: "https://publisher.example",
      feedTokenKey: "test-feed-key",
      jwtSigningKey: "test-jwt-signing-key-of-at-least-32-chars",
      stripeWebhookSecret: "whsec_test",
      corsAllowOrigins: [],
    },
    ghost: { ping: async () => true } as unknown as Deps["ghost"],
    content: {
      ping: async () => true,
      listPosts: async () => fixturePosts(),
    } as unknown as Deps["content"],
    stripe: {} as unknown as Deps["stripe"],
    cache,
    idempotency,
    rateLimiter,
    logger,
    clock: () => new Date("2026-04-23T12:00:00Z"),
    ...overrides,
  };
}

test("GET /.well-known/open-membership returns the discovery JSON", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/.well-known/open-membership");
  assert.equal(res.status, 200);
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(body.spec_version, "0.4");
  assert.ok(Array.isArray(body.tiers));
});

test("GET /health returns ok", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/health");
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test("GET /ready checks upstream probes", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/ready");
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    ok: boolean;
    checks: { ghost_admin: boolean; ghost_content: boolean };
  };
  assert.equal(body.ok, true);
  assert.equal(body.checks.ghost_admin, true);
});

test("GET /feed/om/:token with a known token renders a feed", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/feed/om/tok-paid");
  assert.equal(res.status, 200);
  assert.equal(
    res.headers.get("content-type"),
    "application/rss+xml; charset=utf-8",
  );
  const xml = await res.text();
  assert.match(xml, /<om:provider>https:\/\/publisher\.example<\/om:provider>/);
});

test("GET /feed/om/:token with an unknown token returns 403 + stub feed", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/feed/om/unknown-token");
  assert.equal(res.status, 403);
  const xml = await res.text();
  assert.match(xml, /Your subscription is not active/);
});

test("POST /api/om/token issues a JWT for a known feed_token", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/api/om/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ feed_token: "tok-paid" }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    access_token: string;
    token_type: string;
    tier_id: string;
    entitlements: string[];
  };
  assert.equal(body.token_type, "Bearer");
  assert.equal(body.tier_id, "paid");
  assert.deepEqual(body.entitlements, ["full-text", "ad-free"]);
  assert.match(body.access_token, /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test("POST /api/om/token with an unknown token returns 403", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/api/om/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ feed_token: "unknown" }),
  });
  assert.equal(res.status, 403);
});

test("POST /api/om/checkout rejects unknown offer_id", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/api/om/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ offer_id: "does-not-exist" }),
  });
  assert.equal(res.status, 404);
});

test("POST /api/om/checkout rejects non-Stripe psp", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/api/om/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ offer_id: "supporter-monthly", psp: "mollie" }),
  });
  assert.equal(res.status, 400);
});

test("POST /api/om/checkout validates request shape", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/api/om/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}), // missing offer_id
  });
  assert.equal(res.status, 400);
});

test("rate limit 429 sets retry-after", async () => {
  const rateLimiter: RateLimiter = {
    async check() {
      return { allowed: false, retryAfterSeconds: 42, remaining: 0 };
    },
  };
  const app = buildApp(stubDeps({ rateLimiter }));
  const res = await app.request("/api/om/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ feed_token: "tok-paid" }),
  });
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), "42");
});

test("webhook rejects missing signature", async () => {
  const app = buildApp(stubDeps());
  const res = await app.request("/api/om/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "evt_test" }),
  });
  assert.equal(res.status, 400);
});

test("webhook deduplicates repeated events", async () => {
  let calls = 0;
  const idempotency: IdempotencyStore = {
    async claim() {
      calls++;
      return calls === 1;
    },
    async prune() {
      return 0;
    },
    async close() {},
  };
  // We pre-parse the event by monkey-patching the Stripe client's
  // webhook parser; we don't really care about the signature for dedup.
  const fakeStripe = {
    webhooks: {
      constructEventAsync: async () => ({
        id: "evt_same",
        type: "customer.subscription.updated",
        data: { object: { customer: "cus_x" } },
      }),
    },
    customers: { retrieve: async () => ({ email: null, metadata: {} }) },
  };

  const deps = stubDeps({
    idempotency,
    stripe: fakeStripe as unknown as Deps["stripe"],
  });
  const app = buildApp(deps);

  const body = JSON.stringify({ id: "evt_same" });
  const headers = {
    "content-type": "application/json",
    "stripe-signature": "ignored-by-stub",
  };

  const first = await app.request("/api/om/webhook", {
    method: "POST",
    headers,
    body,
  });
  const second = await app.request("/api/om/webhook", {
    method: "POST",
    headers,
    body,
  });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  const firstBody = (await first.json()) as { dedup?: boolean };
  const secondBody = (await second.json()) as { dedup?: boolean };
  assert.equal(firstBody.dedup, undefined);
  assert.equal(secondBody.dedup, true);
});
