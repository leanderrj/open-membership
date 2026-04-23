import { test } from "node:test";
import assert from "node:assert/strict";
import { issueJwt, verifyJwt } from "../shared/jwt.js";

const KEY = "b".repeat(64);
const ISSUER = "https://publisher.example";
const AUDIENCE = "https://publisher.example";

test("issueJwt + verifyJwt round-trip carries claims", async () => {
  const token = await issueJwt(KEY, {
    issuer: ISSUER,
    audience: AUDIENCE,
    subject: "member-123",
    ttlSeconds: 60,
    tierId: "paid",
    entitlements: ["full-text", "ad-free"],
    subscriptionId: "sub_abc",
  });

  const claims = await verifyJwt(KEY, token, ISSUER, AUDIENCE);
  assert.equal(claims.sub, "member-123");
  assert.equal(claims.tier_id, "paid");
  assert.deepEqual(claims.entitlements, ["full-text", "ad-free"]);
  assert.equal(claims.subscription_id, "sub_abc");
});

test("verifyJwt rejects a token signed with a different key", async () => {
  const token = await issueJwt(KEY, {
    issuer: ISSUER,
    audience: AUDIENCE,
    subject: "x",
    ttlSeconds: 60,
    tierId: "free",
    entitlements: [],
  });

  await assert.rejects(() => verifyJwt("different-key", token, ISSUER, AUDIENCE));
});

test("verifyJwt rejects wrong audience", async () => {
  const token = await issueJwt(KEY, {
    issuer: ISSUER,
    audience: AUDIENCE,
    subject: "x",
    ttlSeconds: 60,
    tierId: "free",
    entitlements: [],
  });

  await assert.rejects(() =>
    verifyJwt(KEY, token, ISSUER, "https://attacker.example"),
  );
});
