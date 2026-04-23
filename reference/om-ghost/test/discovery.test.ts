import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDiscovery } from "../shared/discovery.js";
import { fixtureConfig } from "./fixtures.js";

test("discovery document surfaces all required fields from SPEC §9", () => {
  const doc = buildDiscovery(fixtureConfig(), "https://publisher.example");

  assert.equal(doc.spec_version, "0.4");
  assert.equal(doc.provider.url, "https://publisher.example");
  assert.deepEqual(doc.auth_methods, ["url-token", "bearer"]);

  // Every configured tier must be present with its feature list.
  const paid = doc.tiers.find((t) => t.id === "paid");
  assert.ok(paid);
  assert.deepEqual(paid!.features, ["full-text", "ad-free"]);

  // Offers advertise the sidecar's own checkout endpoint.
  assert.equal(
    doc.offers[0]!.checkout.endpoint,
    "https://publisher.example/api/om/checkout",
  );
  assert.equal(doc.offers[0]!.price.amount, "12.00");

  // Every endpoint resolves to the sidecar's public URL.
  assert.equal(doc.endpoints.checkout, "https://publisher.example/api/om/checkout");
  assert.equal(doc.endpoints.token, "https://publisher.example/api/om/token");
  assert.equal(doc.endpoints.webhook, "https://publisher.example/api/om/webhook");

  // Revocation is optional but present in fixture.
  assert.equal(doc.revocation?.policy, "prospective-only");
  assert.equal(doc.revocation?.grace_hours, 48);
});

test("discovery strips trailing slash consistently", () => {
  const doc = buildDiscovery(fixtureConfig(), "https://publisher.example/");
  assert.equal(doc.endpoints.checkout, "https://publisher.example/api/om/checkout");
});
